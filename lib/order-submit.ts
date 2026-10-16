// Confirma el pedido (POST /api/checkout/order). Manda SOLO ids y cantidades (más dirección, fecha, método de pago, notas y el
// requestId de la pantalla de pago): nunca precios, totales, impuestos ni la cuenta. Respuestas (ver lib/order-create.ts):
// 201 created, 202 received/processing, 400 con code, 401, 404, 429, 503 y 504 (el pedido puede haber salido).
// Reintentar con el MISMO requestId no duplica el pedido. Sin datos del cliente en logs.
import { ORDER_CLIENT_TIMEOUT_MS, classifyCreateResponse, type CreateOrderBody, type OrderSubmitResult } from "./order-create";

export type { OrderSubmitResult } from "./order-create";

export async function submitOrder(body: CreateOrderBody, fetchFn: typeof fetch = fetch): Promise<OrderSubmitResult> {
  try {
    const res = await fetchFn("/api/checkout/order", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Un poco más que el proxy (60 s): si vence, el pedido pudo haber salido; la pantalla no invita a reintentar a ciegas.
      signal: AbortSignal.timeout(ORDER_CLIENT_TIMEOUT_MS),
    });
    const data: unknown = await res.json().catch(() => null);
    return classifyCreateResponse(res.status, data);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, code: "order_timeout" };
    // Sin respuesta (red caída): reintentar es seguro porque el requestId es el mismo.
    return { ok: false, code: "service_unavailable" };
  }
}
