import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { site } from "@/lib/data";

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB
const PHONE_PATTERN = /^\d{4}-\d{4}$/; // debe calzar con components/layout/RecruitmentPopover.tsx
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // debe calzar con components/layout/RecruitmentPopover.tsx

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const nombre = String(formData.get("nombre") ?? "");
    const telefono = String(formData.get("telefono") ?? "");
    const correo = String(formData.get("correo") ?? "");
    const canton = String(formData.get("canton") ?? "");
    const puesto = String(formData.get("puesto") ?? "");
    const mensaje = String(formData.get("mensaje") ?? "");
    const cv = formData.get("cv");

    if (!nombre || !correo || !puesto || !canton) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(correo)) {
      return NextResponse.json(
        { ok: false, error: "El correo electrónico no es válido." },
        { status: 400 }
      );
    }

    if (!PHONE_PATTERN.test(telefono)) {
      return NextResponse.json(
        { ok: false, error: "El teléfono debe tener el formato 8888-8888." },
        { status: 400 }
      );
    }

    const attachments = [];
    if (cv instanceof File && cv.size > 0) {
      if (cv.size > MAX_CV_BYTES) {
        return NextResponse.json(
          { ok: false, error: "El archivo adjunto supera el límite de 5MB." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await cv.arrayBuffer());
      attachments.push({ filename: cv.name, content: buffer.toString("base64") });
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

    const result = await sendMail({
      to: site.emails.rh,
      replyTo: correo,
      subject: `[Mercasa · Empleo] ${puesto} — ${nombre}`,
      html,
      attachments,
    });

    // Además del correo, se registra la postulación en el módulo de Reclutamiento de
    // GIPLUS (GI.Recruit.API). Es independiente del correo -- si falla, no debe tumbar
    // la respuesta al usuario, ya que el correo ya se procesó arriba.
    let recruitModuleOk = true;
    try {
      const recruitFormData = new FormData();
      recruitFormData.set("NombreCompleto", nombre);
      recruitFormData.set("CorreoElectronico", correo);
      recruitFormData.set("Telefono", telefono);
      recruitFormData.set("Canton", canton);
      recruitFormData.set("PuestoInteres", puesto);
      if (mensaje) recruitFormData.set("Mensaje", mensaje);
      if (cv instanceof File && cv.size > 0) recruitFormData.set("Cv", cv);

      const recruitRes = await fetch(`${process.env.RECRUIT_API_URL}/api/postulaciones`, {
        method: "POST",
        body: recruitFormData,
      });
      recruitModuleOk = recruitRes.ok;
      if (!recruitRes.ok) {
        console.error("[/api/careers] módulo de Reclutamiento respondió", recruitRes.status, await recruitRes.text());
      }
    } catch (recruitError) {
      recruitModuleOk = false;
      console.error("[/api/careers] no se pudo registrar en el módulo de Reclutamiento", recruitError);
    }

    return NextResponse.json({ ok: true, delivered: result.delivered, recruitModuleOk });
  } catch (error) {
    console.error("[/api/careers]", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la postulación." },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
