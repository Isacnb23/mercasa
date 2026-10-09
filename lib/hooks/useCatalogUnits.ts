"use client";

// Presentaciones (unidad, caja, tarima...) de los productos del modal de detalle y de las líneas del carrito,
// solo con sesión. Pide con withUnits en lotes de máximo 20 (el servidor no acepta más), con debounce y
// cancelación de la solicitud anterior. Todo vive EN MEMORIA por cuenta (nunca en localStorage, sessionStorage
// ni cookies) y se vacía al cerrar sesión o cambiar de cuenta. Sin sesión no llama a nada.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  CATALOG_PRICES_DEBOUNCE_MS,
  CATALOG_UNITS_BATCH_SIZE,
  chunk,
  parseCatalogPrices,
  uniqueItemIds,
  type CatalogUnit,
} from "@/lib/catalog-prices";

export type CatalogUnitsStatus = "no-session" | "loading" | "ready" | "unavailable";

interface Snapshot {
  accountNum: string | null;
  // ItemId -> presentaciones vendibles (vacío = el ítem no tiene precio en la lista de la cuenta).
  units: ReadonlyMap<string, CatalogUnit[]>;
  priceListMissing: boolean;
  failed: boolean;
}

const EMPTY: Snapshot = { accountNum: null, units: new Map(), priceListMissing: false, failed: false };
const key = (id: string) => id.trim().toUpperCase();
const SEP = "\u0000";

export interface CatalogUnitsResult {
  status: CatalogUnitsStatus;
  // Presentaciones del ítem; null mientras no se hayan cargado (o sin sesión).
  unitsFor: (itemId: string) => CatalogUnit[] | null;
}

export function useCatalogUnits(itemIds: ReadonlyArray<string>): CatalogUnitsResult {
  const { user, isLoading } = useAuth();
  const accountNum = user?.accountNum ?? null;

  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const snapshotRef = useRef<Snapshot>(EMPTY);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const idsKey = useMemo(() => uniqueItemIds(itemIds).join(SEP), [itemIds]);

  // Cierre de sesión o cambio de cuenta: se vacía todo lo que hubiera en memoria.
  useEffect(() => {
    if (snapshotRef.current.accountNum !== accountNum) {
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

      const pending = idsKey.split(SEP).filter((id) => !current.units.has(key(id)));
      if (pending.length === 0) return;

      try {
        for (const batch of chunk(pending, CATALOG_UNITS_BATCH_SIZE)) {
          const res = await fetch("/api/catalog/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Solo ids y withUnits: la lista de precios la decide el servidor con la cuenta de la sesión.
            body: JSON.stringify({ itemIds: batch, withUnits: true }),
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`status ${res.status}`);
          const parsed = parseCatalogPrices(await res.json());
          if (!parsed) throw new Error("respuesta inesperada");

          setSnapshot((prev) => {
            if (prev.accountNum !== accountNum) return prev;
            if (parsed.priceListMissing) return { ...prev, priceListMissing: true, failed: false };
            const units = new Map(prev.units);
            for (const price of parsed.prices) units.set(key(price.itemId), price.units ?? []);
            for (const id of batch) if (!units.has(key(id))) units.set(key(id), []);
            return { ...prev, units, failed: false };
          });
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setSnapshot((prev) => (prev.accountNum === accountNum ? { ...prev, failed: true } : prev));
      }
    }, CATALOG_PRICES_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accountNum, isLoading, idsKey]);

  const own = snapshot.accountNum === accountNum ? snapshot : EMPTY;
  const allLoaded = idsKey.split(SEP).filter(Boolean).every((id) => own.units.has(key(id)));

  const status: CatalogUnitsStatus = isLoading || !accountNum
    ? "no-session"
    : own.priceListMissing || own.failed
      ? "unavailable"
      : allLoaded
        ? "ready"
        : "loading";

  const unitsFor = (itemId: string): CatalogUnit[] | null => {
    if (!accountNum || isLoading || own.priceListMissing || own.failed) return null;
    return own.units.get(key(itemId)) ?? null;
  };

  return { status, unitsFor };
}
