import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

const GENERIC_ERROR = "No se pudo cargar la información en este momento.";

// Límite de peticiones de mercasa-api: se reenvía como 429 CON Retry-After (antes se volvía un 502 genérico y
// la web lo leía como falla definitiva). Sin Retry-After del origen, 5 s.
function rateLimited(upstream: Response): NextResponse {
  const retryAfter = upstream.headers.get("Retry-After")?.trim();
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos.", code: "rate_limited" },
    { status: 429, headers: { "Retry-After": retryAfter && /^d+$/.test(retryAfter) ? retryAfter : "5", "Cache-Control": "no-store" } },
  );
}

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

    if (upstream.status === 429) {
      return rateLimited(upstream);
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

// Reenvía un POST autenticado (pedido) a mercasa-api. Mismo criterio que proxyCustomerGet: JWT de la
// cookie httpOnly, sin sesión 401 SIN llamar a mercasa-api, sin caché. Mapeo para el pedido:
//   401 -> 401; 404 -> 404; 400 -> 400 con el mensaje de validación; 503 -> 503 CONSERVANDO el `code`
//   (ordering_disabled, ordering_not_available, service_unavailable); otros 5xx, timeouts y errores de
//   conexión -> 503 service_unavailable. Nunca se reenvían detalles internos.
export async function proxyCustomerPost(path: string, body: unknown, logTag: string): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const unavailable = (code = "service_unavailable") =>
    NextResponse.json({ error: "El servicio no está disponible en este momento.", code }, { status: 503 });

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error(`[${logTag}] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY`);
    return unavailable();
  }

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      // Mayor que el timeout del pedido en mercasa-api (20 s).
      signal: AbortSignal.timeout(25_000),
    });

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    if (upstream.status === 404) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }

    if (upstream.status === 429) {
      return rateLimited(upstream);
    }

    if (upstream.status === 400) {
      const data = (await upstream.json().catch(() => null)) as { error?: unknown } | null;
      const message = typeof data?.error === "string" ? data.error : "Solicitud inválida.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (upstream.status >= 500) {
      const data = (await upstream.json().catch(() => null)) as { code?: unknown } | null;
      return unavailable(upstream.status === 503 && typeof data?.code === "string" ? data.code : undefined);
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    return NextResponse.json(await upstream.json(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Sin respuesta (inalcanzable o timeout): servicio no disponible.
    console.error(`[${logTag}] No se pudo contactar a mercasa-api:`, error);
    return unavailable();
  }
}
