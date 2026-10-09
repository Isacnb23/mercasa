// Lógica pura de las presentaciones (unidad, caja, tarima...) para el modal y el carrito: orden, presentación
// inicial, equivalencias y nombres. Sin React; se prueba con `npm test`. Todo número base (precio, factor)
// viene del servidor; lo que se deriva acá es solo informativo ("≈") y NUNCA se envía al servidor.
import type { CatalogUnit } from "./catalog-prices";

const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toUpperCase() === (b ?? "").trim().toUpperCase();

// De menor a mayor factor (Lata, Caja, Tarima); a igual factor, por nombre.
export function sortUnits(units: ReadonlyArray<CatalogUnit>): CatalogUnit[] {
  return [...units].sort((a, b) => a.factor - b.factor || a.unitId.localeCompare(b.unitId));
}

// Presentación con la que abre el modal: la MISMA que muestra la tarjeta (la unidad del listado). Si la tarjeta
// no trae unidad (sin precio), la que marca el servidor como por defecto. Si la unidad de la tarjeta no está
// entre las presentaciones (no debería pasar), devuelve null: el modal se queda con el precio de la tarjeta
// en vez de abrir con otra presentación.
export function pickInitialUnit(units: ReadonlyArray<CatalogUnit> | null, listingUnit?: string | null): CatalogUnit | null {
  if (!units || units.length === 0) return null;
  if ((listingUnit ?? "").trim() !== "") return units.find((u) => same(u.unitId, listingUnit)) ?? null;
  return units.find((u) => u.isDefault) ?? null;
}

// Nombres de las unidades de AX (singular, plural) por idioma. Lo que no esté aquí se muestra tal cual viene,
// con la primera letra en mayúscula.
const NAMES: Record<string, { es: [string, string]; en: [string, string] }> = {
  UND: { es: ["unidad", "unidades"], en: ["unit", "units"] },
  UNIDAD: { es: ["unidad", "unidades"], en: ["unit", "units"] },
  CAJA: { es: ["caja", "cajas"], en: ["case", "cases"] },
  TARIMA: { es: ["tarima", "tarimas"], en: ["pallet", "pallets"] },
  PAQUET: { es: ["paquete", "paquetes"], en: ["pack", "packs"] },
  DISPL: { es: ["display", "displays"], en: ["display", "displays"] },
  BULTO: { es: ["bulto", "bultos"], en: ["bundle", "bundles"] },
  ROLLO: { es: ["rollo", "rollos"], en: ["roll", "rolls"] },
  LATA: { es: ["lata", "latas"], en: ["can", "cans"] },
  BOTELLA: { es: ["botella", "botellas"], en: ["bottle", "bottles"] },
  BOLSA: { es: ["bolsa", "bolsas"], en: ["bag", "bags"] },
  SACO: { es: ["saco", "sacos"], en: ["sack", "sacks"] },
  KILO: { es: ["kilo", "kilos"], en: ["kilo", "kilos"] },
  PACK: { es: ["pack", "packs"], en: ["pack", "packs"] },
  TUBO: { es: ["tubo", "tubos"], en: ["tube", "tubes"] },
  "TETRA BRIK": { es: ["tetra brik", "tetra briks"], en: ["carton", "cartons"] },
};

const isSpanish = (locale: string) => locale.toLowerCase().startsWith("es");

// "caja" / "cajas" según la cantidad (1 = singular).
export function unitName(unitId: string, count: number, locale: string): string {
  const key = unitId.trim().toUpperCase();
  const entry = NAMES[key];
  // Plural solo para enteros distintos de 1 ("24 latas"); un decimal va en singular ("45,36 kilo").
  if (entry) return entry[isSpanish(locale) ? "es" : "en"][count === 1 || !Number.isInteger(count) ? 0 : 1];
  const raw = unitId.trim().toLocaleLowerCase(isSpanish(locale) ? "es" : "en");
  return count === 1 || !Number.isInteger(count) || raw === "" ? raw : /[aeiouáéíóú]$/.test(raw) ? `${raw}s` : raw;
}

// "Caja", "Unidad": nombre en singular con la primera letra en mayúscula.
export function unitLabel(unitId: string, locale: string): string {
  const name = unitName(unitId, 1, locale);
  return name.charAt(0).toLocaleUpperCase(isSpanish(locale) ? "es" : "en") + name.slice(1);
}

// "Latas", "Caja": como unitName pero con la primera letra en mayúscula (para las equivalencias).
export function unitTitle(unitId: string, count: number, locale: string): string {
  const name = unitName(unitId, count, locale);
  return name.charAt(0).toLocaleUpperCase(isSpanish(locale) ? "es" : "en") + name.slice(1);
}

// Número para mostrar: hasta 2 decimales ("24", "45,36").
export function formatAmount(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: "always" }).format(amount);
}

export interface Equivalence {
  // 1 {big} = {amount} {small}
  bigUnitId: string;
  smallUnitId: string;
  amount: number;
  // true = relación con la unidad base ("1 Saco = 45,36 Kilo"), no entre dos presentaciones.
  toBase: boolean;
}

// Relación entera "razonable" (2 a 100.000): "24 latas por caja", "60 cajas por tarima".
const isCleanRatio = (ratio: number) => {
  const rounded = Math.round(ratio);
  return rounded >= 2 && rounded <= 100_000 && Math.abs(ratio - rounded) < 1e-6;
};

// Equivalencias de la presentación elegida: con la inmediatamente menor ("1 Caja = 24 Latas") y, si existe, la
// inmediatamente mayor ("1 Tarima = 60 Cajas"). La relación entre dos presentaciones es factorMayor / factorMenor
// solo cuando es un entero razonable; si no (o si no hay menor), se muestra la relación con la unidad base
// ("1 Saco = 45,36 Kilo"). Con una sola presentación de factor 1 no hay equivalencias.
export function equivalences(units: ReadonlyArray<CatalogUnit>, selectedUnitId: string): Equivalence[] {
  const sorted = sortUnits(units);
  const selected = sorted.find((u) => same(u.unitId, selectedUnitId));
  if (!selected) return [];
  const result: Equivalence[] = [];

  const lower = [...sorted].reverse().find((u) => u.factor < selected.factor - 1e-9);
  if (lower && isCleanRatio(selected.factor / lower.factor)) {
    result.push({
      bigUnitId: selected.unitId,
      smallUnitId: lower.unitId,
      amount: Math.round(selected.factor / lower.factor),
      toBase: false,
    });
  } else if (Math.abs(selected.factor - 1) > 1e-9 && selected.baseUnitId && !same(selected.baseUnitId, selected.unitId)) {
    result.push({ bigUnitId: selected.unitId, smallUnitId: selected.baseUnitId, amount: selected.factor, toBase: true });
  }

  const upper = sorted.find((u) => u.factor > selected.factor + 1e-9);
  if (upper && isCleanRatio(upper.factor / selected.factor)) {
    result.push({
      bigUnitId: upper.unitId,
      smallUnitId: selected.unitId,
      amount: Math.round(upper.factor / selected.factor),
      toBase: false,
    });
  }

  return result;
}

// Equivalencia corta de una presentación con la unidad base ("24 latas", "45,36 kilos"); null si ES la base.
export function shortEquivalence(unit: CatalogUnit): { amount: number; unitId: string } | null {
  if (Math.abs(unit.factor - 1) <= 1e-9 || !unit.baseUnitId || same(unit.baseUnitId, unit.unitId)) return null;
  return { amount: unit.factor, unitId: unit.baseUnitId };
}

// Precio aproximado por unidad base ("≈ ₡26,23 por Lata") = precio de la presentación ÷ su factor, a 2 decimales.
// Solo informativo: no sale del servidor ya calculado y nunca se envía. Null si es la base o falta la unidad base.
export function approxBasePrice(unit: CatalogUnit): { price: number; unitId: string } | null {
  const short = shortEquivalence(unit);
  if (!short || unit.factor <= 1 || unit.unitPrice <= 0) return null;
  return { price: Math.round((unit.unitPrice / unit.factor) * 100) / 100, unitId: short.unitId };
}

// TODAS las equivalencias reales del producto, una por presentación mayor que la menor ("1 Caja = 24 Latas",
// "1 Tarima = 60 Cajas"), siempre las mismas sea cual sea la presentación elegida: así el bloque no cambia de
// alto al alternar. Con una sola presentación no hay equivalencias (la UI muestra "Se vende por Unidad").
export function allEquivalences(units: ReadonlyArray<CatalogUnit>): Equivalence[] {
  const sorted = sortUnits(units);
  if (sorted.length < 2) return [];
  const result: Equivalence[] = [];
  for (const unit of sorted.slice(1)) {
    const lower = equivalences(sorted, unit.unitId).find((e) => same(e.bigUnitId, unit.unitId));
    if (lower) result.push(lower);
  }
  return result;
}
