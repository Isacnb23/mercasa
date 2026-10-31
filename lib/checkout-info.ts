"use client";

// Monto mínimo de pedido y fechas de entrega del cliente logueado. Los datos
// viven solo en memoria del componente (nada en localStorage ni cookies) y se
// piden únicamente con sesión: sin ella no se hace ninguna llamada.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { useActiveAddress } from "./addresses-context";
import type { DeliveryDatesInfo, MinimumAmountInfo, PickupDatesInfo } from "./auth-types";

export type CheckoutStatus = "idle" | "loading" | "ready" | "error";

interface Resource<T> {
  status: CheckoutStatus;
  data: T | null;
  retry: () => void;
}

interface ResourceState<T> {
  requestKey: string | null;
  status: "ready" | "error";
  data: T | null;
}

function parseMinimumAmount(raw: unknown): MinimumAmountInfo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { minimumAmount, isDefault } = raw as Record<string, unknown>;
  if (typeof minimumAmount !== "number" || !Number.isFinite(minimumAmount)) return null;
  return { minimumAmount, isDefault: isDefault === true };
}

function parseDeliveryDates(raw: unknown): DeliveryDatesInfo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { dates, requiresCoordination } = raw as Record<string, unknown>;
  if (!Array.isArray(dates) || !dates.every((d) => typeof d === "string")) return null;
  return { dates: dates as string[], requiresCoordination: requiresCoordination === true };
}

function parsePickupDates(raw: unknown): PickupDatesInfo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { dates } = raw as Record<string, unknown>;
  if (!Array.isArray(dates) || !dates.every((d) => typeof d === "string")) return null;
  return { dates: dates as string[] };
}

// `resourceKey` identifica qué se está pidiendo (cliente + dirección): al cambiar,
// el estado pasa a "loading" en el mismo render (sin setState en un efecto) y la
// respuesta de un pedido anterior nunca pisa a la del actual. `url` null = no pedir.
function useCheckoutResource<T>(
  resourceKey: string | null,
  url: string | null,
  parse: (raw: unknown) => T | null
): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ requestKey: null, status: "error", data: null });

  const requestKey = resourceKey && url ? `${resourceKey}#${attempt}` : null;

  useEffect(() => {
    if (!requestKey || !url) return;
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const parsed = parse(await res.json());
        if (parsed === null) throw new Error("invalid-response");
        return parsed;
      })
      .then((data) => {
        if (!cancelled) setState({ requestKey, status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, url, parse]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!requestKey) return { status: "idle", data: null, retry };
  if (state.requestKey !== requestKey) return { status: "loading", data: null, retry };
  return { status: state.status, data: state.data, retry };
}

// Monto mínimo de pedido del cliente logueado. "idle" sin sesión.
export function useMinimumAmount(): Resource<MinimumAmountInfo> {
  const { user } = useAuth();
  const accountNum = user?.accountNum ?? null;
  return useCheckoutResource(
    accountNum,
    accountNum ? "/api/checkout/minimum-amount" : null,
    parseMinimumAmount
  );
}

// Fechas de entrega de una dirección. Se recalculan al cambiar `addressId` (la
// dirección activa). "idle" sin sesión o sin dirección.
export function useDeliveryDates(addressId: number | null, revision = 0): Resource<DeliveryDatesInfo> {
  const { user } = useAuth();
  const accountNum = user?.accountNum ?? null;
  const active = accountNum !== null && addressId !== null;
  return useCheckoutResource(
    active ? `${accountNum}:${addressId}:${revision}` : null,
    active ? `/api/checkout/delivery-dates?addressId=${addressId}` : null,
    parseDeliveryDates
  );
}

// Fechas de retiro en tienda Homex (iguales para todas las tiendas). Solo se piden con sesión y con `enabled` (el carrito tiene
// grupo de retiro); "idle" si no.
export function usePickupDates(enabled: boolean): Resource<PickupDatesInfo> {
  const { user } = useAuth();
  const accountNum = user?.accountNum ?? null;
  const active = enabled && accountNum !== null;
  return useCheckoutResource(
    active ? `${accountNum}:pickup` : null,
    active ? "/api/checkout/pickup-dates" : null,
    parsePickupDates
  );
}

// Atajo para el carrito: fechas de la dirección ACTIVA.
export function useActiveDeliveryDates(): Resource<DeliveryDatesInfo> {
  const { addressId, revision } = useActiveAddress();
  return useDeliveryDates(addressId, revision);
}
