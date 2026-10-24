import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/jwt";
import { clearSessionCookies, resolveSession } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

// El Header/PerfilDrawer son componentes de cliente (el sitio es de una sola
// página con drawers, no rutas server-gateadas como mi-cuenta en homex-web)
// — necesitan esta ruta para saber si hay sesión activa sin que el JWT en sí
// llegue nunca al JS del navegador (la cookie es httpOnly).
//
// Si el JWT venció pero hay refresh, la renueva en silencio (resolveSession). Respuestas:
//   200 { user }                       sesión vigente
//   200 { user: null }                 sin sesión
//   200 { user: null, expired: true }  había sesión y ya no se puede recuperar (las cookies se limpiaron)
//   503                                la renovación no está disponible ahora: el navegador conserva el estado que tenía
export async function GET() {
  const session = await resolveSession();

  if (session.kind === "none") return NextResponse.json({ user: null }, { headers: NO_STORE });
  if (session.kind === "expired") return NextResponse.json({ user: null, expired: true }, { headers: NO_STORE });

  if (session.kind !== "ok") {
    return NextResponse.json({ code: "service_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const user = getUserFromToken(session.token);
  if (!user) {
    // Token corrupto en un formato que no se pudo leer: se limpian las cookies para no seguir intentando en cada carga.
    clearSessionCookies(await cookies());
    return NextResponse.json({ user: null }, { headers: NO_STORE });
  }

  return NextResponse.json({ user }, { headers: NO_STORE });
}
