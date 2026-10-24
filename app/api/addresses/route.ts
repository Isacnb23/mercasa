import { NextResponse } from "next/server";
import { sessionGate, withSessionRetry } from "@/lib/session";
import type { SavedAddress } from "@/lib/auth-types";

// Direcciones de entrega guardadas del cliente logueado (solo lectura). Lee el
// JWT de la cookie httpOnly (el navegador nunca lo ve) y lo reenvía a
// mercasa-api GET /api/addresses, que llama a homex-api Customer/GetAddresses.
// El cliente sale del JWT en homex-api; acá no se acepta ningún parámetro.
export async function GET() {
  const gate = await sessionGate();
  if ("response" in gate) return gate.response;

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error("[addresses] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
  }

  try {
    const upstream = await withSessionRetry(gate.token, (token) =>
      fetch(`${apiBase}/api/addresses`, {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }),
    );

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
    }

    // Se reenvía tal cual lo que devuelve mercasa-api (ya sin datos internos).
    const addresses: SavedAddress[] = await upstream.json();
    return NextResponse.json(addresses);
  } catch (error) {
    console.error("[addresses] No se pudo contactar a mercasa-api:", error);
    return NextResponse.json({ error: "No se pudieron cargar las direcciones en este momento." }, { status: 502 });
  }
}
