// Lógica pura del carrito (sin React): una línea por (ítem, presentación). Se prueba con `npm test`.
import type { ProductSummary } from "./product-types";
import type { CartItem } from "./cart-types";

const MAX_QUANTITY = 9999;

// Identidad de una línea del carrito: el mismo ítem en dos presentaciones distintas son dos líneas.
export function cartLineKey(id: string, unitId?: string | null): string {
  return `${id.trim().toUpperCase()}|${(unitId ?? "").trim().toUpperCase()}`;
}

const sameLine = (item: CartItem, id: string, unitId?: string | null) =>
  cartLineKey(item.id, item.unitId) === cartLineKey(id, unitId);

const cleanUnit = (unitId?: string | null): string | undefined => {
  const trimmed = (unitId ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
};

export function addToCart(items: CartItem[], product: ProductSummary, quantity = 1, unitId?: string | null): CartItem[] {
  const unit = cleanUnit(unitId);
  const existing = items.find((item) => sameLine(item, product.id, unit));
  if (existing) {
    return items.map((item) =>
      item === existing ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) } : item
    );
  }
  return [...items, { ...product, quantity: Math.min(MAX_QUANTITY, quantity), ...(unit ? { unitId: unit } : {}) }];
}

export function removeLine(items: CartItem[], id: string, unitId?: string | null): CartItem[] {
  return items.filter((item) => !sameLine(item, id, unitId));
}

export function setLineQuantity(items: CartItem[], id: string, quantity: number, unitId?: string | null): CartItem[] {
  if (quantity < 1) return removeLine(items, id, unitId);
  return items.map((item) => (sameLine(item, id, unitId) ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) } : item));
}

// Cambia la presentación de una línea. Si ya hay otra línea del mismo ítem con la presentación destino, las
// cantidades se suman en ella; si no, la línea conserva su posición con la nueva presentación.
export function changeLineUnit(
  items: CartItem[],
  id: string,
  fromUnitId: string | null | undefined,
  toUnitId: string | null | undefined
): CartItem[] {
  const to = cleanUnit(toUnitId);
  if (cartLineKey(id, fromUnitId) === cartLineKey(id, to)) return items;
  const source = items.find((item) => sameLine(item, id, fromUnitId));
  if (!source) return items;

  const target = items.find((item) => sameLine(item, id, to));
  if (target) {
    return items
      .filter((item) => item !== source)
      .map((item) => (item === target ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + source.quantity) } : item));
  }

  return items.map((item) => {
    if (item !== source) return item;
    const { unitId: _previous, ...rest } = item; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, ...(to ? { unitId: to } : {}) };
  });
}

// Lee lo guardado (localStorage). Los carritos viejos no tienen unitId: siguen valiendo (presentación por
// defecto al validar). Se descarta lo que no tenga la forma esperada y se unen líneas repetidas.
export function parseStoredCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  let items: CartItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.trim() === "" || typeof e.name !== "string") continue;
    if (typeof e.quantity !== "number" || !Number.isSafeInteger(e.quantity) || e.quantity < 1) continue;
    const unit = typeof e.unitId === "string" ? cleanUnit(e.unitId) : undefined;
    const product: ProductSummary = { id: e.id, name: e.name, ...(typeof e.packSize === "string" ? { packSize: e.packSize } : {}) };
    items = addToCart(items, product, e.quantity, unit);
  }
  return items;
}
