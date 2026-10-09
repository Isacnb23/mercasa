"use client";

// Precios del catálogo para los productos visibles, solo con sesión. Pide en lotes de máximo 100, con
// debounce y cancelación de la solicitud anterior. Los precios viven en un mapa EN MEMORIA por cuenta (no
// en localStorage, sessionStorage ni cookies) y se vacían al cerrar sesión o cambiar de cuenta. Sin sesión
// no llama a nada.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  CATALOG_PRICES_BATCH_SIZE,
  CATALOG_PRICES_DEBOUNCE_MS,
  chunk,
  parseCatalogPrices,
  uniqueItemIds,
  type CatalogPrice,
  type PriceView,
} from "@/lib/catalog-prices";

export type CatalogPricesStatus = "no-session" | "ready" | "price-list-missing" | "unavailable";

// Instantánea inmutable de lo resuelto para UNA cuenta.
interface Snapshot {
  accountNum: string | null;
  prices: ReadonlyMap<string, CatalogPrice>;
  // Ids ya resueltos sin precio en la lista de la cuenta.
  missing: ReadonlySet<string>;
  priceListMissing: boolean;
  failed: boolean;
}

const EMPTY: Snapshot = { accountNum: null, prices: new Map(), missing: new Set(), priceListMissing: false, failed: false };

export interface CatalogPricesResult {
  status: CatalogPricesStatus;
  priceFor: (itemId: string) => PriceView;
}

const key = (id: string) => id.trim().toUpperCase();
const SEP = "\u0000";

export function useCatalogPrices(itemIds: ReadonlyArray<string>): CatalogPricesResult {
  const { user, isLoading } = useAuth();
  const accountNum = user?.accountNum ?? null;

  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  // Copia de la instantánea para leerla dentro del efecto sin volver a disparar la solicitud.
  const snapshotRef = useRef<Snapshot>(EMPTY);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  // Ids con una solicitud en vuelo (evita pedir dos veces lo mismo).
  const inFlightRef = useRef<Set<string>>(new Set());

  // Ids visibles como texto estable: su valor (no la identidad del arreglo) decide si hay que pedir.
  const idsKey = useMemo(() => uniqueItemIds(itemIds).join(SEP), [itemIds]);

  // Cierre de sesión o cambio de cuenta: se vacía todo lo que hubiera en memoria.
  useEffect(() => {
    if (snapshotRef.current.accountNum !== accountNum) {
      inFlightRef.current = new Set();
      const next = { ...EMPTY, accountNum };
      snapshotRef.current = next;
      setSnapshot(next);
    }
  }, [accountNum]);

  useEffect(() => {
    if (!accountNum || isLoading || !idsKey) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const current = snapshotRef.current;
      if (current.accountNum !== accountNum || current.priceListMissing) return;

      const pending = idsKey
        .split(SEP)
        .filter((id) => !current.prices.has(key(id)) && !current.missing.has(key(id)) && !inFlightRef.current.has(key(id)));
      if (pending.length === 0) return;

      for (const id of pending) inFlightRef.current.add(key(id));

      try {
        for (const batch of chunk(pending, CATALOG_PRICES_BATCH_SIZE)) {
          const res = await fetch("/api/catalog/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Solo ids: la lista de precios la decide el servidor con la cuenta de la sesión.
            body: JSON.stringify({ itemIds: batch }),
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`status ${res.status}`);
          const parsed = parseCatalogPrices(await res.json());
          if (!parsed) throw new Error("respuesta inesperada");

          setSnapshot((prev) => {
            if (prev.accountNum !== accountNum) return prev; // cambió la cuenta mientras tanto
            if (parsed.priceListMissing) return { ...prev, priceListMissing: true, failed: false };
            const prices = new Map(prev.prices);
            const missing = new Set(prev.missing);
            for (const price of parsed.prices) prices.set(key(price.itemId), price);
            for (const id of batch) if (!prices.has(key(id))) missing.add(key(id));
            return { ...prev, prices, missing, failed: false };
          });
          for (const id of batch) inFlightRef.current.delete(key(id));
        }
      } catch (error) {
        for (const id of pending) inFlightRef.current.delete(key(id));
        if ((error as { name?: string }).name === "AbortError") return;
        setSnapshot((prev) => (prev.accountNum === accountNum ? { ...prev, failed: true } : prev));
      }
    }, CATALOG_PRICES_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // Se cancela la solicitud anterior; lo que quedó en vuelo se vuelve a pedir en la siguiente pasada.
      controller.abort();
      for (const id of idsKey.split(SEP)) inFlightRef.current.delete(key(id));
    };
  }, [accountNum, isLoading, idsKey]);

  // Una instantánea de otra cuenta (o de antes de cerrar sesión) nunca se muestra.
  const own = snapshot.accountNum === accountNum ? snapshot : EMPTY;

  const status: CatalogPricesStatus = isLoading
    ? "ready" // todavía no se sabe si hay sesión: sin aviso
    : !accountNum
      ? "no-session"
      : own.priceListMissing
        ? "price-list-missing"
        : own.failed
          ? "unavailable"
          : "ready";

  const priceFor = (itemId: string): PriceView => {
    if (!accountNum || isLoading || own.priceListMissing || own.failed) return { kind: "hidden" };
    const price = own.prices.get(key(itemId));
    if (price) return { kind: "price", unitPrice: price.unitPrice, unit: price.unit };
    if (own.missing.has(key(itemId))) return { kind: "consult" };
    return { kind: "loading" };
  };

  return { status, priceFor };
}
