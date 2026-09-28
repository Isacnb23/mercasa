import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

// El Header/PerfilDrawer son componentes de cliente (el sitio es de una sola
// página con drawers, no rutas server-gateadas como mi-cuenta en homex-web)
// — necesitan esta ruta para saber si hay sesión activa sin que el JWT en sí
// llegue nunca al JS del navegador (la cookie es httpOnly).
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = getUserFromToken(token);
  if (!user) {
    // Token corrupto o expirado en un formato que no se pudo leer: se
    // limpia la cookie para no seguir intentando en cada carga.
    store.delete(SESSION_COOKIE);
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
