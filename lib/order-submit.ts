// Confirma el pedido (POST /api/checkout/order). No se manda NINGÚN dato del navegador: el pedido se arma
// en el servidor. Hoy homex-api responde 503 ordering_disabled (o 501 -> ordering_not_available); con el
// armado real y el AIF devolverá el número de pedido.
import { isServiceUnavailableStatus } from "./login-errors";
import type { OrderSubmitResult } from "./order-types";

export async function submitOrder(): Promise<OrderSubmitResult> {
  try {
    const res = await fetch("/api/checkout/order", { method: "POST", cache: "no-store" });
    const data: unknown = await res.json().catch(() => null);
    const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

    if (res.ok) {
      return { ok: true, orderNumber: typeof record.orderNumber === "string" ? record.orderNumber : null };
    }

    if (res.status === 401) return { ok: false, code: "session" };
    if (isServiceUnavailableStatus(res.status)) {
      return { ok: false, code: typeof record.code === "string" ? record.code : "service_unavailable" };
    }
    if (res.status === 400 || res.status === 404) return { ok: false, code: "invalid" };
    return { ok: false, code: "unknown" };
  } catch {
    return { ok: false, code: "service_unavailable" };
  }
}
