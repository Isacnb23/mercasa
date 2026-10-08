import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

const GENERIC_ERROR = "No se pudo cargar la información en este momento.";

// Reenvía un GET autenticado a mercasa-api (que tiene el X-Api-Key y llama a
// homex-api). El JWT sale de la cookie httpOnly: el navegador nunca lo ve. Sin
// sesión responde 401 SIN llamar a mercasa-api. Datos del cliente: nunca se
// cachean del lado del servidor (cache: "no-store").
export async function proxyCustomerGet(path: string, logTag: string): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error(`[${logTag}] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY`);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    if (upstream.status === 404) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    return NextResponse.json(await upstream.json(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[${logTag}] No se pudo contactar a mercasa-api:`, error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
