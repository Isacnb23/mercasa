import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { site } from "@/lib/data";

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB
const PHONE_PATTERN = /^\d{4}-\d{4}$/; // debe calzar con components/layout/RecruitmentPopover.tsx
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // debe calzar con components/layout/RecruitmentPopover.tsx

// Topes de longitud (GI.Recruit.API acepta más: nombre 200, puesto 150, mensaje 2000).
const MAX_LEN = { nombre: 100, correo: 254, telefono: 20, canton: 100, puesto: 100, mensaje: 2000 };

// URL pública de GI.Recruit.API. RECRUIT_API_URL (si existe) tiene prioridad.
const DEFAULT_RECRUIT_API_URL = "https://apirecruit.grupointeca.com:8160";
const RECRUIT_TIMEOUT_MS = 15_000;

// Límite de peticiones por IP, en memoria. OJO: en entornos serverless (Vercel/AWS
// Lambda) cada instancia tiene su propio Map y se reinicia en cada cold start, así
// que esto solo frena abuso básico; para algo firme hace falta un store compartido
// (Redis/Upstash) o un WAF delante.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function hasValidSignature(ext: string, bytes: Uint8Array) {
  if (ext === ".pdf") return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  if (ext === ".doc") return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (ext === ".docx") return bytes[0] === 0x50 && bytes[1] === 0x4b; // PK (zip)
  return false;
}

function sanitizeFilename(name: string, ext: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  const stem = base
    .slice(0, base.length - ext.length)
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 80);
  return `${stem || "cv"}${ext}`;
}

const badRequest = () => NextResponse.json({ ok: false }, { status: 400 });

export async function POST(request: NextRequest) {
  try {
    if (rateLimited(clientIp(request))) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const formData = await request.formData();

    // Honeypot: campo oculto que una persona no llena. Si viene con algo, se simula
    // éxito para no darle pistas al bot, sin enviar nada.
    if (String(formData.get("website") ?? "") !== "") {
      return NextResponse.json({ ok: true });
    }

    const nombre = String(formData.get("nombre") ?? "").trim();
    const telefono = String(formData.get("telefono") ?? "").trim();
    const correo = String(formData.get("correo") ?? "").trim();
    const canton = String(formData.get("canton") ?? "").trim();
    const puesto = String(formData.get("puesto") ?? "").trim();
    const mensaje = String(formData.get("mensaje") ?? "").trim();
    const cv = formData.get("cv");

    if (!nombre || !correo || !puesto || !canton) return badRequest();
    if (
      nombre.length > MAX_LEN.nombre ||
      correo.length > MAX_LEN.correo ||
      telefono.length > MAX_LEN.telefono ||
      canton.length > MAX_LEN.canton ||
      puesto.length > MAX_LEN.puesto ||
      mensaje.length > MAX_LEN.mensaje
    ) {
      return badRequest();
    }
    if (!EMAIL_PATTERN.test(correo) || !PHONE_PATTERN.test(telefono)) return badRequest();

    const attachments = [];
    let cvFile: File | null = null; // CV ya validado, con nombre saneado
    let cvIsPdf = false;
    if (cv instanceof File && cv.size > 0) {
      if (cv.size > MAX_CV_BYTES) return badRequest();
      const ext = ALLOWED_EXTENSIONS.find((e) => cv.name.toLowerCase().endsWith(e));
      if (!ext) return badRequest();
      const buffer = Buffer.from(await cv.arrayBuffer());
      if (!hasValidSignature(ext, buffer)) return badRequest();
      const safeName = sanitizeFilename(cv.name, ext);
      attachments.push({ filename: safeName, content: buffer.toString("base64") });
      cvFile = new File([buffer], safeName, { type: MIME_BY_EXT[ext] });
      cvIsPdf = ext === ".pdf";
    }

    const html = `
      <h2>Nueva postulación — Talento Mercasa</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(correo)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
      <p><strong>Cantón:</strong> ${escapeHtml(canton)}</p>
      <p><strong>Área de interés:</strong> ${escapeHtml(puesto)}</p>
      ${mensaje ? `<p><strong>Comentario:</strong><br/>${escapeHtml(mensaje).replace(/\n/g, "<br/>")}</p>` : ""}
    `;

    let mailDelivered = false;
    try {
      const result = await sendMail({
        to: site.emails.rh,
        replyTo: correo,
        subject: `[Mercasa · Empleo] ${puesto.replace(/[\r\n]/g, " ")} — ${nombre.replace(/[\r\n]/g, " ")}`,
        html,
        attachments,
      });
      mailDelivered = result.delivered === true;
    } catch {
      console.error("[/api/careers] fallo el envío de correo");
    }

    // Además del correo, se registra la postulación en el módulo de Reclutamiento de
    // GIPLUS (GI.Recruit.API, POST api/postulaciones). GI.Recruit.API exige un CV en
    // PDF (rechaza .doc/.docx con 400), así que solo se llama con PDF; con Word la
    // postulación llega únicamente por correo. El cantón se queda fuera: el backend
    // espera CantonId numérico (GET api/cantones) y no hay mapeo; llega por correo.
    let recruitModuleOk = false;
    if (cvFile && cvIsPdf) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), RECRUIT_TIMEOUT_MS);
      try {
        const recruitFormData = new FormData();
        recruitFormData.set("NombreCompleto", nombre);
        recruitFormData.set("CorreoElectronico", correo);
        recruitFormData.set("Telefono", telefono);
        recruitFormData.set("PuestoInteres", puesto);
        if (mensaje) recruitFormData.set("Mensaje", mensaje);
        recruitFormData.set("Cv", cvFile);

        const recruitApiUrl = (process.env.RECRUIT_API_URL || DEFAULT_RECRUIT_API_URL).replace(/\/+$/, "");
        const recruitRes = await fetch(`${recruitApiUrl}/api/postulaciones`, {
          method: "POST",
          body: recruitFormData,
          signal: controller.signal,
        });
        recruitModuleOk = recruitRes.ok;
        if (!recruitRes.ok) {
          // Solo el código de estado: el cuerpo puede traer datos de la postulación.
          console.error("[/api/careers] módulo de Reclutamiento respondió", recruitRes.status);
        }
      } catch (recruitError) {
        const timedOut = recruitError instanceof Error && recruitError.name === "AbortError";
        console.error("[/api/careers] no se pudo registrar en el módulo de Reclutamiento", timedOut ? "timeout" : "error de red");
      } finally {
        clearTimeout(timer);
      }
    }

    // Si ningún canal funcionó, el usuario debe enterarse (el cliente muestra su
    // mensaje i18n genérico cuando no viene `error`).
    if (!mailDelivered && !recruitModuleOk) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true, delivered: mailDelivered, recruitModuleOk });
  } catch {
    console.error("[/api/careers] error inesperado");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
