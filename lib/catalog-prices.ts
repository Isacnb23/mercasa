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
  // ¿Se puede retirar en tienda esta presentación? (con el precio de cmer, todas las del producto si tiene retiro;
  // la existencia depende de la tienda y la valida el servidor al armar el pedido). false si el servidor no lo dice.
  pickupAvailable: boolean;
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

// Precio de Retiro en tienda: unitPrice SIN IVA y tax (IVA por unidad), como el de domicilio. Si varía por
// tienda, unitPrice/tax son los de la más barata ("desde"), varies = true y bySite trae cada tienda.
export interface PickupPrice {
  unitPrice: number;
  tax: number;
  unit: string;
  varies: boolean;
  bySite: { siteId: string; unitPrice: number; tax: number }[];
}

// Redondeo a colones enteros, mitad hacia arriba (AwayFromZero, la regla del backend: Math.Round(...,
// MidpointRounding.AwayFromZero)). El ruido de coma flotante (p. ej. 0.1 + 0.2) se limpia antes para que un
// ".5" exacto no caiga del lado equivocado.
export function roundColones(value: number): number {
  const clean = Number(value.toFixed(6));
  return clean < 0 ? -Math.floor(-clean + 0.5) : Math.floor(clean + 0.5);
}

// Precio TOTAL con IVA de UNA unidad de esa presentación/tienda: lo que el servidor devolvió (precio sin IVA +
// IVA por unidad) sumado y redondeado a colones. Solo para MOSTRAR el catálogo: el carrito, el resumen y los
// totales del pedido siguen con la fórmula del servidor (subtotal − descuento + impuesto, 2 decimales).
export function totalWithTax(unitPrice: number, tax: number): number {
  return roundColones(unitPrice + tax);
}

export interface CatalogPricesResult {
  prices: CatalogPrice[];
  missing: string[];
  priceListMissing: boolean;
}

// Lo que pinta la UI para un producto. `total` es el precio por unidad CON IVA incluido, en colones enteros
// (ver totalWithTax).
//   hidden  = no mostrar nada (sin sesión, lista de precios sin configurar o servicio caído)
//   loading = esqueleto
//   consult = sin precio en la lista de la cuenta ("Consultar")
export type PriceView =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "consult" }
  | { kind: "price"; total: number; unit: string };

// Lo mismo para el precio de Retiro en tienda (siempre por separado del de domicilio). Si varía por tienda,
// `total` es el de la más barata ("desde") y bySite trae el total de cada tienda.
export type PickupPriceView =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "consult" }
  | { kind: "price"; total: number; unit: string; varies: boolean; bySite: { siteId: string; total: number }[] };

// Vistas de la UI a partir de lo que devolvió el servidor (la web solo suma, nunca decide el precio).
export function deliveryPriceView(price: { unitPrice: number; tax: number; unit: string }): PriceView {
  return { kind: "price", total: totalWithTax(price.unitPrice, price.tax), unit: price.unit };
}

export function pickupPriceView(pickup: PickupPrice): PickupPriceView {
  return {
    kind: "price",
    total: totalWithTax(pickup.unitPrice, pickup.tax),
    unit: pickup.unit,
    varies: pickup.varies,
    bySite: pickup.bySite.map((s) => ({ siteId: s.siteId, total: totalWithTax(s.unitPrice, s.tax) })),
  };
}

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
      pickupAvailable: (entry as { pickupAvailable?: unknown }).pickupAvailable === true,
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
        // Sin IVA propio la tienda se descarta: un total sin impuesto sería un precio inventado.
        .filter(
          (s): s is { siteId: string; unitPrice: number; tax: number } =>
            !!s && typeof s.siteId === "string" && typeof s.unitPrice === "number" && Number.isFinite(s.unitPrice) && typeof s.tax === "number" && Number.isFinite(s.tax),
        )
        .map((s) => ({ siteId: s.siteId, unitPrice: s.unitPrice, tax: s.tax }))
    : [];
  return { unitPrice: p.unitPrice, tax: p.tax, unit: p.unit, varies: p.varies === true && bySite.length > 1, bySite };
}

// ¿El precio de retiro es el MISMO que el de domicilio (mismo total con IVA y misma unidad)? Con el precio de cmer
// (Pickup:PriceSource = cmer) siempre lo es: la tarjeta y el modal muestran entonces un solo precio por presentación,
// con las etiquetas de canal. Si el origen del precio es fmcm y difiere, se siguen mostrando los dos.
export function samePrice(
  delivery: { kind: string; total?: number; unit?: string },
  pickup: { kind: string; total?: number; unit?: string; varies?: boolean }
): boolean {
  return (
    delivery.kind === "price" &&
    pickup.kind === "price" &&
    pickup.varies !== true &&
    delivery.total === pickup.total &&
    (delivery.unit ?? "").trim().toUpperCase() === (pickup.unit ?? "").trim().toUpperCase()
  );
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
