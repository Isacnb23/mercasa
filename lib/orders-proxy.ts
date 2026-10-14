import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

const NO_STORE = { "Cache-Control": "private, no-store" };

const unavailable = () =>
  NextResponse.json(
    { code: "service_unavailable", message: "El servicio no está disponible en este momento." },
    { status: 503, headers: NO_STORE },
  );

// Reenvía un GET de "Mis pedidos" a mercasa-api (que tiene el X-Api-Key y llama a homex-api). El JWT sale de la cookie httpOnly:
// el navegador nunca lo ve y NUNCA se manda una cuenta (homex-api la saca del JWT). Sin sesión: 401 SIN llamar a mercasa-api.
// Datos del cliente: sin caché, y nada se registra en el log (ni ids de pedido ni cuerpos). Mapeo:
//   401 -> 401; 404 -> 404 not_found; 400 -> 400; 503 con history_disabled -> se conserva (la web oculta la entrada);
//   429 -> 429 con Retry-After; cualquier otra falla, timeout o error de conexión -> 503 service_unavailable.
// `parse` deja pasar SOLO los campos permitidos (lista cerrada); si la respuesta no tiene la forma esperada, 503.
export async function proxyOrdersGet<T>(path: string, parse: (raw: unknown) => T | null, logTag: string): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: NO_STORE });
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;
  if (!apiBase || !apiKey) {
    console.error(`[${logTag}] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY`);
    return unavailable();
  }

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method: "GET",
      headers: { "X-Api-Key": apiKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      // Mayor que el timeout de mercasa-api para el historial (25 s).
      signal: AbortSignal.timeout(30_000),
    });

    if (upstream.status === 401) return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: NO_STORE });
    if (upstream.status === 404) return NextResponse.json({ code: "not_found", message: "No encontramos ese pedido." }, { status: 404, headers: NO_STORE });
    if (upstream.status === 400) return NextResponse.json({ code: "validation_failed", message: "Solicitud inválida." }, { status: 400, headers: NO_STORE });

    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After")?.trim();
      return NextResponse.json(
        { code: "rate_limited", message: "Demasiadas solicitudes. Intentá de nuevo en unos segundos." },
        { status: 429, headers: { ...NO_STORE, "Retry-After": retryAfter && /^\d+$/.test(retryAfter) ? retryAfter : "5" } },
      );
    }

    if (upstream.status === 503) {
      const body = (await upstream.json().catch(() => null)) as { code?: unknown } | null;
      if (body?.code === "history_disabled") {
        return NextResponse.json({ code: "history_disabled", message: "Mis pedidos todavía no está habilitado." }, { status: 503, headers: NO_STORE });
      }
      return unavailable();
    }

    if (!upstream.ok) {
      console.error(`[${logTag}] mercasa-api respondió ${upstream.status}`);
      return unavailable();
    }

    const data = parse(await upstream.json().catch(() => null));
    if (data === null) {
      console.error(`[${logTag}] respuesta inesperada de mercasa-api`);
      return unavailable();
    }

    return NextResponse.json(data, { headers: NO_STORE });
  } catch (error) {
    // Sin respuesta (inalcanzable o timeout): servicio no disponible.
    console.error(`[${logTag}] No se pudo contactar a mercasa-api:`, error instanceof Error ? error.name : "error");
    return unavailable();
  }
}
