import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

// Direcciones de entrega guardadas del cliente logueado (solo lectura). Lee el
// JWT de la cookie httpOnly (el navegador nunca lo ve) y lo reenvía a
// mercasa-api GET /api/addresses, que llama a homex-api Customer/GetAddresses.
// El cliente sale del JWT en homex-api; acá no se acepta ningún parámetro.
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error("[addresses] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${apiBase}/api/addresses`, {
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

    if (!upstream.ok) {
      return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    console.error("[addresses] No se pudo contactar a mercasa-api:", error);
    return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
  }
}
