// Reenvío del pedido a mercasa-api (POST /api/customer/order) y filtrado de la respuesta para el navegador. Sin "server-only"
// ni cookies: el token, la base y la clave los pasa quien llama (lib/checkout-proxy.ts), así se prueba con un fetch simulado.
//
// Mapeo (nunca se reenvían detalles internos, mensajes ni cuerpos de otros códigos):
//   201 / 202 -> el mismo status con { status, orderNumber, message } (solo esos campos y con formato validado)
//   400       -> 400 { error, code, errors? } con el code conocido; errors solo con code e itemId de cada uno
//   401 -> 401; 404 -> 404; 429 -> 429 con Retry-After
//   5xx       -> 503 { code } (solo ordering_disabled, ordering_not_available, order_busy, order_unavailable; si no, service_unavailable)
//   timeout   -> 504 { code: "order_timeout" } (el pedido puede haber salido: la pantalla NO invita a reintentar a ciegas)
//   red / sin configuración -> 503 service_unavailable
import { KNOWN_ORDER_CODES, ORDER_PROXY_TIMEOUT_MS, type CreateOrderBody } from "./order-create";

export interface UpstreamReply {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface UpstreamDeps {
  token: string;
  apiBase: string | undefined;
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  // Solo para el servidor: recibe el tipo de falla, nunca cuerpos, cuentas ni direcciones.
  log?: (message: string) => void;
}

const SAFE_CODE = /^[a-z][a-z0-9_]{0,63}$/;
const ORDER_NUMBER = /^[A-Za-z0-9._-]{1,32}$/;
const SERVER_503_CODES = ["ordering_disabled", "ordering_not_available", "order_busy", "order_unavailable"];
const NO_STORE = { "Cache-Control": "no-store" };

const unavailable = (code = "service_unavailable"): UpstreamReply => ({
  status: 503,
  body: { error: "El servicio no está disponible en este momento.", code },
  headers: NO_STORE,
});

const record = (data: unknown): Record<string, unknown> => (typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {});

export async function forwardOrderCreate(body: CreateOrderBody, deps: UpstreamDeps): Promise<UpstreamReply> {
  if (!deps.apiBase || !deps.apiKey) {
    deps.log?.("Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return unavailable();
  }

  const doFetch = deps.fetchFn ?? fetch;
  let upstream: Response;
  try {
    upstream = await doFetch(`${deps.apiBase}/api/customer/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": deps.apiKey, Authorization: `Bearer ${deps.token}` },
      body: JSON.stringify(body),
      cache: "no-store",
      // Mayor que la espera de mercasa-api (45 s) y de homex-api (~24 s). Solo el pedido: los demás tiempos no cambian.
      signal: AbortSignal.timeout(deps.timeoutMs ?? ORDER_PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      deps.log?.("El pedido superó el tiempo de espera");
      return { status: 504, body: { error: "Estamos verificando tu pedido.", code: "order_timeout" }, headers: NO_STORE };
    }

    deps.log?.(`No se pudo contactar a mercasa-api (${name || "error"})`);
    return unavailable();
  }

  const status = upstream.status;
  if (status === 401) return { status: 401, body: { error: "Sesión requerida." } };
  if (status === 404) return { status: 404, body: { error: "No encontrado." } };

  if (status === 429) {
    const retryAfter = upstream.headers.get("Retry-After")?.trim();
    return {
      status: 429,
      body: { error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos.", code: "rate_limited" },
      headers: { ...NO_STORE, "Retry-After": retryAfter && /^\d+$/.test(retryAfter) ? retryAfter : "5" },
    };
  }

  const data = record(await upstream.json().catch(() => null));

  if (status === 201 || status === 202) {
    const orderNumber = typeof data.orderNumber === "string" && ORDER_NUMBER.test(data.orderNumber) ? data.orderNumber : null;
    const kind = typeof data.status === "string" && ["created", "received", "processing"].includes(data.status) ? data.status : status === 201 ? "created" : "received";
    return { status, body: { status: kind, orderNumber, message: typeof data.message === "string" ? data.message.slice(0, 200) : null }, headers: NO_STORE };
  }

  if (status === 400) {
    const code = typeof data.code === "string" && SAFE_CODE.test(data.code) && (KNOWN_ORDER_CODES as readonly string[]).includes(data.code) ? data.code : "invalid_request";
    const errors = Array.isArray(data.errors)
      ? data.errors
          .slice(0, 20)
          .map((e) => record(e))
          .filter((e) => typeof e.code === "string" && SAFE_CODE.test(e.code))
          .map((e) => ({ code: e.code as string, itemId: typeof e.itemId === "string" && e.itemId.length <= 50 ? e.itemId : null }))
      : undefined;
    return { status: 400, body: { error: "Solicitud inválida.", code, ...(errors && errors.length > 0 ? { errors } : {}) }, headers: NO_STORE };
  }

  if (status >= 500) {
    return unavailable(status === 503 && typeof data.code === "string" && SERVER_503_CODES.includes(data.code) ? data.code : undefined);
  }

  return unavailable();
}
