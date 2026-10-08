import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTokenExpirationSeconds, getUserFromToken } from "@/lib/jwt";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_FALLBACK,
  sessionCookieOptions,
} from "@/lib/auth-cookies";
import type { LoginCredentials } from "@/lib/auth-types";
import { SERVICE_UNAVAILABLE_CODE, isServiceUnavailableStatus } from "@/lib/login-errors";

// Respuesta cuando el servicio de ingreso no está disponible (backend caído, timeout): 503 con
// `code`, distinta del 401 de credenciales incorrectas para que la pantalla muestre otro mensaje.
function serviceUnavailable() {
  return NextResponse.json(
    { error: "El servicio de ingreso no está disponible en este momento.", code: SERVICE_UNAVAILABLE_CODE },
    { status: 503 }
  );
}

// Reenvía a mercasa-api (servicio hermano, ver app/api/product-images/
// [itemId]/route.ts para el mismo patrón MERCASA_API_BASE/MERCASA_API_KEY)
// que a su vez proxea a homex-api. mercasa-web NUNCA le pega directo a
// homex-api ni a mercasa-api desde el navegador — esta ruta corre del lado
// del servidor, es la única que conoce MERCASA_API_KEY y la única que setea
// la cookie httpOnly con el JWT. El cliente nunca ve el token.
export async function POST(request: NextRequest) {
  let credentials: LoginCredentials;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!credentials?.userId || !credentials?.password) {
    return NextResponse.json(
      { error: "Usuario y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error(
      "[auth] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY en .env.local"
    );
    return NextResponse.json(
      { error: "No se pudo iniciar sesión en este momento." },
      { status: 502 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        userId: credentials.userId,
        password: credentials.password,
      }),
      cache: "no-store",
      // mercasa-api colgada o inalcanzable no debe dejar el login esperando para siempre
      // (mismo criterio que product-images/route.ts). Debe ser MAYOR que el timeout del
      // login en mercasa-api (20 s, MERCASAVIP_AUTH_TIMEOUT_SECONDS), que a su vez supera el
      // peor caso de homex-api (conexión 5 s + comando 10 s): así el 503 de abajo llega
      // antes de que esta ruta se rinda.
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    // Sin respuesta (inalcanzable o timeout): el servicio no está disponible, no es un
    // problema de credenciales.
    console.error("[auth] No se pudo contactar a mercasa-api:", error);
    return serviceUnavailable();
  }

  if (!upstream.ok) {
    // mercasa-api ya devuelve mensajes genéricos (401 credenciales
    // incorrectas, 502/503 backend caído) — se reenvía tal cual, sin
    // exponer más detalle del que ya decidió filtrar el backend. El 401 NO se
    // toca; el 503/504 se marca con `code` para que la pantalla lo distinga.
    const body = await upstream.json().catch(() => ({ error: "No se pudo iniciar sesión." }));
    if (isServiceUnavailableStatus(upstream.status)) {
      return NextResponse.json({ ...body, code: SERVICE_UNAVAILABLE_CODE }, { status: 503 });
    }
    return NextResponse.json(body, { status: upstream.status });
  }

  const payload = (await upstream.json()) as { token?: string };
  const token = payload.token;

  if (!token) {
    console.error("[auth] mercasa-api respondió 200 sin token");
    return NextResponse.json(
      { error: "No se pudo iniciar sesión en este momento." },
      { status: 502 }
    );
  }

  const user = getUserFromToken(token);
  if (!user) {
    console.error("[auth] No se pudo leer el usuario del token recibido");
    return NextResponse.json(
      { error: "No se pudo iniciar sesión en este momento." },
      { status: 502 }
    );
  }

  const maxAge = getTokenExpirationSeconds(token) ?? SESSION_MAX_AGE_FALLBACK;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge });

  return NextResponse.json({ user });
}
