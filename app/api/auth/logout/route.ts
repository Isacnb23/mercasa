import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSameOriginRequest } from "@/lib/session-core";
import { clearSessionCookies } from "@/lib/session";

// Cierra la sesión: borra las DOS cookies (JWT y refresh). homex-api no ofrece cómo revocar una sesión (no hay logout ni
// borrado de CUSTSESSIONS por API): el refresh token de ese equipo deja de existir aquí, pero en homex-api sigue vigente hasta
// que venza (7 días) o se cambie la contraseña. Pendiente reportado en docs/sesion.md.
// Solo desde este mismo sitio (Sec-Fetch-Site / Origin), para que otra página no pueda cerrar la sesión de la persona.
export async function POST(request: NextRequest) {
  if (
    !isSameOriginRequest({
      secFetchSite: request.headers.get("sec-fetch-site"),
      origin: request.headers.get("origin"),
      host: request.headers.get("host"),
    })
  ) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }

  clearSessionCookies(await cookies());
  return NextResponse.json({ ok: true });
}
