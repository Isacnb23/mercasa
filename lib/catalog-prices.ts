// Lógica pura de los precios del catálogo (sin React, probada con `npm test`). Los precios los calcula
// el SERVIDOR con la lista de la cuenta del JWT: del navegador solo salen ids de producto.

export const CATALOG_PRICES_BATCH_SIZE = 100;
// Con las presentaciones (modal y carrito) el servidor acepta como máximo 20 ítems por consulta.
export const CATALOG_UNITS_BATCH_SIZE = 20;
export const CATALOG_PRICES_DEBOUNCE_MS = 300;

// Presentación vendible de un producto (unidad, caja, tarima...): precio SIN IVA e IVA propios de ella (nunca
// precio base x factor), factor a la unidad base y cuántas hay disponibles ahora (floor(neto base / factor)).
export interface CatalogUnit {
  unitId: string;
  label: string;
  unitPrice: number;
  tax: number;
  factor: number;
  // Unidad base de inventario a la que se convierte el factor (p. ej. KILO); vacía si el servidor no la envía.
  baseUnitId: string;
  available: number;
  isDefault: boolean;
}

// Precio de catálogo de un producto: SIN IVA, con la unidad de venta del dato (la del listado). Solo
// viene el campo units cuando se pidieron las presentaciones (withUnits).
export interface CatalogPrice {
  itemId: string;
  unitPrice: number;
  tax: number;
  unit: string;
  units?: CatalogUnit[] | null;
  // false = el ítem solo se retira en tienda: unitPrice/tax/unit vienen vacíos y solo cuenta `pickup`.
  hasDelivery: boolean;
  // Precio de Retiro en tienda (fmcm), por separado del de domicilio; null si no aplica.
  pickup: PickupPrice | null;
}

// Precio de Retiro en tienda: SIN IVA, como el de domicilio (se muestra "+ IVA"). Si varía por tienda,
// unitPrice es el de la más barata ("desde"), varies = true y bySite trae cada tienda.
export interface PickupPrice {
  unitPrice: number;
  tax: number;
  unit: string;
  varies: boolean;
  bySite: { siteId: string; unitPrice: number }[];
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

// Lo mismo para el precio de Retiro en tienda (siempre por separado del de domicilio).
export type PickupPriceView =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "consult" }
  | { kind: "price"; unitPrice: number; unit: string; varies: boolean; bySite: { siteId: string; unitPrice: number }[] };

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

// Cuerpo que sale del navegador: SOLO itemIds y withUnits (pedir las presentaciones; máximo 20 ítems). Cualquier
// otro campo se descarta: la lista de precios nunca viaja del navegador.
export function sanitizeCatalogPricesBody(body: unknown): { itemIds: string[]; withUnits: boolean } | null {
  const candidate = body as { itemIds?: unknown; withUnits?: unknown } | null;
  const raw = candidate?.itemIds;
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string")) return null;
  if (candidate?.withUnits !== undefined && typeof candidate.withUnits !== "boolean") return null;
  const withUnits = candidate?.withUnits === true;
  const itemIds = raw as string[];
  if (itemIds.length < 1 || itemIds.length > (withUnits ? CATALOG_UNITS_BATCH_SIZE : CATALOG_PRICES_BATCH_SIZE)) return null;
  if (itemIds.some((id) => !id.trim() || id.length > 50)) return null;
  if (uniqueItemIds(itemIds).length !== itemIds.length) return null;
  return { itemIds: itemIds.map((id) => id.trim()), withUnits };
}

// Presentaciones de un ítem: undefined/null = no se pidieron; false = forma inválida.
function parseUnits(raw: unknown): CatalogUnit[] | null | false {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return false;
  const units: CatalogUnit[] = [];
  for (const entry of raw) {
    const u = entry as Partial<CatalogUnit> | null;
    if (
      !u ||
      typeof u.unitId !== "string" ||
      typeof u.unitPrice !== "number" ||
      !Number.isFinite(u.unitPrice) ||
      typeof u.tax !== "number" ||
      typeof u.factor !== "number" ||
      !Number.isFinite(u.factor) ||
      u.factor <= 0 ||
      typeof u.available !== "number"
    ) {
      return false;
    }
    units.push({
      unitId: u.unitId,
      label: typeof u.label === "string" && u.label ? u.label : u.unitId,
      unitPrice: u.unitPrice,
      tax: u.tax,
      factor: u.factor,
      baseUnitId: typeof u.baseUnitId === "string" ? u.baseUnitId : "",
      available: u.available,
      isDefault: u.isDefault === true,
    });
  }
  return units;
}

// Bloque pickup: si falta o viene mal formado se ignora (no hay precio de retiro; nunca se inventa uno).
function parsePickup(raw: unknown): PickupPrice | null {
  const p = raw as Partial<PickupPrice> | null | undefined;
  if (!p || typeof p !== "object") return null;
  if (typeof p.unitPrice !== "number" || !Number.isFinite(p.unitPrice) || p.unitPrice <= 0) return null;
  if (typeof p.tax !== "number" || !Number.isFinite(p.tax) || typeof p.unit !== "string") return null;
  const bySite = Array.isArray(p.bySite)
    ? p.bySite
        .filter((s): s is { siteId: string; unitPrice: number } => !!s && typeof s.siteId === "string" && typeof s.unitPrice === "number" && Number.isFinite(s.unitPrice))
        .map((s) => ({ siteId: s.siteId, unitPrice: s.unitPrice }))
    : [];
  return { unitPrice: p.unitPrice, tax: p.tax, unit: p.unit, varies: p.varies === true && bySite.length > 1, bySite };
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
    const units = parseUnits((entry as { units?: unknown }).units);
    if (units === false) return null;
    const hasDelivery = (entry as { hasDelivery?: unknown }).hasDelivery !== false;
    const pickup = parsePickup((entry as { pickup?: unknown }).pickup);
    parsed.push({
      itemId: p.itemId,
      unitPrice: p.unitPrice,
      tax: p.tax,
      unit: p.unit,
      hasDelivery,
      pickup,
      ...(units ? { units } : {}),
    });
  }

  return { prices: parsed, missing: missing.filter((id): id is string => typeof id === "string"), priceListMissing };
}

// "CAJA" -> "Caja", "und" -> "Und": la unidad viene tal cual de AX; solo se normaliza la capitalización.
export function formatUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1).toLocaleLowerCase();
}
