import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/jwt";
import { isSameOriginRequest } from "@/lib/session-core";
import { forceRefresh } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

// Renovación explícita de la sesión (las rutas del servidor ya renuevan solas cuando el JWT venció; esta es para forzarla).
// Mueve tokens, así que NO depende solo de SameSite: exige que la petición venga de este mismo sitio (Sec-Fetch-Site o, si
// falta, Origin igual al host) y rechaza el resto con 403. Respuestas, sin detalles internos y sin tokens en el cuerpo:
//   200 { user } | 401 { code: "session_expired" } (cookies limpiadas) | 401 sin code si no había sesión |
//   429 { code: "rate_limited" } con Retry-After | 503 { code: "service_unavailable" }
export async function POST(request: NextRequest) {
  if (
    !isSameOriginRequest({
      secFetchSite: request.headers.get("sec-fetch-site"),
      origin: request.headers.get("origin"),
      host: request.headers.get("host"),
    })
  ) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403, headers: NO_STORE });
  }

  const session = await forceRefresh();

  switch (session.kind) {
    case "ok": {
      const user = getUserFromToken(session.token);
      return user
        ? NextResponse.json({ user }, { headers: NO_STORE })
        : NextResponse.json({ code: "service_unavailable" }, { status: 503, headers: NO_STORE });
    }
    case "none":
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: NO_STORE });
    case "expired":
      return NextResponse.json({ error: "Tu sesión expiró. Iniciá sesión de nuevo.", code: "session_expired" }, { status: 401, headers: NO_STORE });
    case "rate_limited":
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos.", code: "rate_limited" },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(session.retryAfter) } },
      );
    default:
      return NextResponse.json({ error: "El servicio no está disponible en este momento.", code: "service_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
