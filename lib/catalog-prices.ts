// Lógica pura de los precios del catálogo (sin React, probada con `npm test`). Los precios los calcula
// el SERVIDOR con la lista de la cuenta del JWT: del navegador solo salen ids de producto.

export const CATALOG_PRICES_BATCH_SIZE = 100;
export const CATALOG_PRICES_DEBOUNCE_MS = 300;

// Precio de catálogo de un producto: SIN IVA, con la unidad de venta del dato.
export interface CatalogPrice {
  itemId: string;
  unitPrice: number;
  tax: number;
  unit: string;
}

export interface CatalogPricesResult {
  prices: CatalogPrice[];
  missing: string[];
  priceListMissing: boolean;
}

// Lo que pinta la UI para un producto.
//   hidden  = no mostrar nada (sin sesión, lista de precios sin configurar o servicio caído)
//   loading = esqueleto
//   consult = sin precio en la lista de la cuenta ("Consultar")
export type PriceView =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "consult" }
  | { kind: "price"; unitPrice: number; unit: string };

// Ids únicos (sin distinguir mayúsculas), no vacíos y recortados, en el orden de entrada.
export function uniqueItemIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id) continue;
    const key = id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Cuerpo que sale del navegador: SOLO `itemIds` (cualquier otro campo se descarta).
export function sanitizeCatalogPricesBody(body: unknown): { itemIds: string[] } | null {
  const raw = (body as { itemIds?: unknown } | null)?.itemIds;
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string")) return null;
  const itemIds = raw as string[];
  if (itemIds.length < 1 || itemIds.length > CATALOG_PRICES_BATCH_SIZE) return null;
  if (itemIds.some((id) => !id.trim() || id.length > 50)) return null;
  if (uniqueItemIds(itemIds).length !== itemIds.length) return null;
  return { itemIds: itemIds.map((id) => id.trim()) };
}

// Valida la respuesta de /api/catalog/prices; null si no tiene la forma esperada.
export function parseCatalogPrices(data: unknown): CatalogPricesResult | null {
  if (!data || typeof data !== "object") return null;
  const { prices, missing, priceListMissing } = data as Record<string, unknown>;
  if (!Array.isArray(prices) || !Array.isArray(missing) || typeof priceListMissing !== "boolean") return null;

  const parsed: CatalogPrice[] = [];
  for (const entry of prices) {
    const p = entry as Partial<CatalogPrice> | null;
    if (
      !p ||
      typeof p.itemId !== "string" ||
      typeof p.unitPrice !== "number" ||
      !Number.isFinite(p.unitPrice) ||
      typeof p.tax !== "number" ||
      typeof p.unit !== "string"
    ) {
      return null;
    }
    parsed.push({ itemId: p.itemId, unitPrice: p.unitPrice, tax: p.tax, unit: p.unit });
  }

  return { prices: parsed, missing: missing.filter((id): id is string => typeof id === "string"), priceListMissing };
}

// "CAJA" -> "Caja", "und" -> "Und": la unidad viene tal cual de AX; solo se normaliza la capitalización.
export function formatUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1).toLocaleLowerCase();
}
