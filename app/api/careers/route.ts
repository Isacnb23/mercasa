import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { site } from "@/lib/data";

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const nombre = String(formData.get("nombre") ?? "");
    const telefono = String(formData.get("telefono") ?? "");
    const correo = String(formData.get("correo") ?? "");
    const puesto = String(formData.get("puesto") ?? "");
    const mensaje = String(formData.get("mensaje") ?? "");
    const cv = formData.get("cv");

    if (!nombre || !correo || !puesto) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios." },
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

    return NextResponse.json({ ok: true, delivered: result.delivered });
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
