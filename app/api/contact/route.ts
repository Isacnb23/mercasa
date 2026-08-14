import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { site } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const canal = String(formData.get("canal") ?? "cliente");
    const empresa = String(formData.get("empresa") ?? "");
    const nombre = String(formData.get("nombre") ?? "");
    const correo = String(formData.get("correo") ?? "");
    const telefono = String(formData.get("telefono") ?? "");
    const pais = String(formData.get("pais") ?? "");
    const mensaje = String(formData.get("mensaje") ?? "");

    if (!nombre || !correo || !mensaje) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    const canalLabel =
      canal === "proveedor" ? "Nuevo Proveedor Internacional" : "Nuevo Cliente Local";

    const html = `
      <h2>Nuevo contacto desde mercasa.cr — ${canalLabel}</h2>
      <p><strong>Empresa / negocio:</strong> ${escapeHtml(empresa)}</p>
      <p><strong>Nombre de contacto:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(correo)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
      ${pais ? `<p><strong>País de origen:</strong> ${escapeHtml(pais)}</p>` : ""}
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(mensaje).replace(/\n/g, "<br/>")}</p>
    `;

    const result = await sendMail({
      to: site.emails.comunicaciones,
      replyTo: correo,
      subject: `[Mercasa] ${canalLabel} — ${empresa || nombre}`,
      html,
    });

    return NextResponse.json({ ok: true, delivered: result.delivered });
  } catch (error) {
    console.error("[/api/contact]", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la solicitud." },
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
