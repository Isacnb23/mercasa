import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { site } from "@/lib/data";
import { RECRUIT_LIMITS, validateRecruitment } from "@/lib/recruitment-validation";

// Las reglas de campos viven en lib/recruitment-validation.ts (compartidas con el formulario).

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

function hasPdfSignature(bytes: Uint8Array) {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

function sanitizeFilename(name: string, ext = ".pdf") {
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
    const consent = formData.get("consent") === "true";
    const cv = formData.get("cv");

    const cvFileInput = cv instanceof File ? cv : null;
    const errors = validateRecruitment({
      name: nombre,
      email: correo,
      phone: telefono,
      position: puesto,
      canton,
      message: mensaje,
      consent,
      cv: cvFileInput ? { name: cvFileInput.name, size: cvFileInput.size } : null,
    });
    if (Object.keys(errors).length > 0 || !cvFileInput) return badRequest();

    // Solo PDF: extensión (ya validada arriba) + firma de bytes. GI.Recruit.API rechaza Word.
    const buffer = Buffer.from(await cvFileInput.arrayBuffer());
    if (buffer.length > RECRUIT_LIMITS.cvMaxBytes || !hasPdfSignature(buffer)) return badRequest();
    const safeName = sanitizeFilename(cvFileInput.name);
    const attachments = [{ filename: safeName, content: buffer.toString("base64") }];
    const cvFile = new File([buffer], safeName, { type: "application/pdf" });

    // Constancia del consentimiento: el DTO de GI.Recruit.API no tiene campo para esto.
    const consentTimestamp = new Date().toISOString();

    const html = `
      <h2>Nueva postulación — Talento Mercasa</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(correo)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
      ${canton ? `<p><strong>Cantón:</strong> ${escapeHtml(canton)}</p>` : ""}
      <p><strong>Área de interés:</strong> ${escapeHtml(puesto)}</p>
      <p><strong>Consentimiento aceptado:</strong> sí (${consentTimestamp} UTC)</p>
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
    // GIPLUS (GI.Recruit.API, POST api/postulaciones). El cantón se queda fuera: el
    // backend espera CantonId numérico (GET api/cantones) y no hay mapeo todavía;
    // llega solo por correo.
    let recruitModuleOk = false;
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
