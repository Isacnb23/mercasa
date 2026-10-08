"use client";

// Vista previa del pedido calculada por el SERVIDOR (POST /api/checkout/order/validate). Del navegador
// salen solo itemId y cantidad (+ dirección, fecha y método de pago); precios, descuentos, impuestos,
// totales y el mínimo vuelven de la respuesta y nunca se calculan acá. Nada se guarda en localStorage ni
// cookies: todo vive en memoria del componente.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { buildOrderRequest, orderRequestKey, parseOrderPreview } from "./order-logic";
import { isServiceUnavailableStatus } from "./login-errors";
import type { OrderPreview, PaymentMethod } from "./order-types";

export type OrderPreviewStatus = "idle" | "loading" | "ready" | "error";
// session = sin sesión/venció; unavailable = servicio caído (503/504, timeout o red); invalid = el servidor
// rechazó el cuerpo o la dirección; unknown = respuesta inesperada.
export type OrderPreviewError = "session" | "unavailable" | "invalid" | "unknown";

export const ORDER_PREVIEW_DEBOUNCE_MS = 400;

interface Params {
  cartItems: ReadonlyArray<{ id: string; quantity: number }>;
  addressId: number | null;
  deliveryDate: string | null;
  paymentMethod: PaymentMethod | null;
}

interface State {
  accountNum: string | null;
  requestKey: string | null;
  status: "ready" | "error";
  preview: OrderPreview | null;
  error: OrderPreviewError | null;
}

export interface OrderPreviewResult {
  status: OrderPreviewStatus;
  // Última respuesta del servidor de ESTA cuenta (puede estar desactualizada mientras se recalcula:
  // ver `stale`). Null si todavía no hay ninguna o hubo un error.
  preview: OrderPreview | null;
  // true mientras la respuesta mostrada no corresponde al pedido actual (se está recalculando).
  stale: boolean;
  error: OrderPreviewError | null;
  retry: () => void;
}

function errorFor(status: number): OrderPreviewError {
  if (status === 401) return "session";
  if (isServiceUnavailableStatus(status)) return "unavailable";
  if (status === 400 || status === 404) return "invalid";
  return "unknown";
}

export function useOrderPreview({ cartItems, addressId, deliveryDate, paymentMethod }: Params): OrderPreviewResult {
  const { user } = useAuth();
  const accountNum = user?.accountNum ?? null;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ accountNum: null, requestKey: null, status: "error", preview: null, error: null });

  // Cuerpo del pedido como texto: su valor (no la identidad del arreglo) decide si hay que volver a pedir.
  const body = useMemo(() => {
    if (!accountNum || addressId === null || cartItems.length === 0) return null;
    return orderRequestKey(buildOrderRequest(cartItems, addressId, deliveryDate, paymentMethod));
  }, [accountNum, addressId, cartItems, deliveryDate, paymentMethod]);

  const requestKey = body && accountNum ? `${accountNum}|${body}#${attempt}` : null;

  useEffect(() => {
    if (!body || !requestKey) return;
    const controller = new AbortController();

    // Debounce: espera a que el cliente deje de tocar cantidades antes de pedir; la solicitud anterior
    // se cancela (abort) y su respuesta nunca pisa a la actual.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkout/order/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          setState({ accountNum, requestKey, status: "error", preview: null, error: errorFor(res.status) });
          return;
        }

        const preview = parseOrderPreview(await res.json());
        setState(
          preview
            ? { accountNum, requestKey, status: "ready", preview, error: null }
            : { accountNum, requestKey, status: "error", preview: null, error: "unknown" }
        );
      } catch {
        if (controller.signal.aborted) return;
        setState({ accountNum, requestKey, status: "error", preview: null, error: "unavailable" });
      }
    }, ORDER_PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, requestKey, accountNum]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!requestKey) return { status: "idle", preview: null, stale: false, error: null, retry };

  // Una respuesta de otra cuenta jamás se muestra.
  const own = state.accountNum === accountNum ? state : null;
  const current = own?.requestKey === requestKey;

  if (!current) {
    return { status: "loading", preview: own?.status === "ready" ? own.preview : null, stale: true, error: null, retry };
  }

  return { status: state.status, preview: state.preview, stale: false, error: state.error, retry };
}
