// Lógica pura del pedido (sin React ni Next): armado del cuerpo, sanitización, lectura de la respuesta
// del servidor y reglas de avance entre pasos. La usan la ruta de servidor, el hook y los componentes, y
// se prueba con el test runner de Node (lib/__tests__).
import type {
  CheckoutStep,
  OrderLineInput,
  OrderPreview,
  OrderPreviewError,
  OrderPreviewLine,
  OrderRequest,
  PaymentMethod,
} from "./order-types";

export const MAX_ORDER_LINES = 100;
export const MAX_ITEM_ID_LENGTH = 50;
export const MAX_UNIT_ID_LENGTH = 20;
export const MAX_ORDER_BODY_BYTES = 64 * 1024;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Arma el cuerpo del pedido SOLO con itemId, presentación elegida (si la hay) y cantidad (+ selecciones). Es el único camino por el que el
// navegador le habla a la ruta de validación: aunque un ítem del carrito tuviera otros campos, no salen.
export function buildOrderRequest(
  cartItems: ReadonlyArray<{ id: string; quantity: number; unitId?: string }>,
  addressId: number,
  deliveryDate: string | null,
  paymentMethod: PaymentMethod | null
): OrderRequest {
  return {
    addressId,
    deliveryDate,
    paymentMethod,
    items: cartItems.map(
      (item): OrderLineInput =>
        item.unitId ? { itemId: item.id, unitId: item.unitId, quantity: item.quantity } : { itemId: item.id, quantity: item.quantity }
    ),
  };
}

export function orderRequestKey(request: OrderRequest): string {
  return JSON.stringify(request);
}

// Valida y limpia lo que llega del navegador a la ruta de servidor. Descarta cualquier campo que no sea
// de la lista (precios, totales, descuentos, mínimo...) y devuelve null si el cuerpo es inválido.
export function sanitizeOrderRequest(raw: unknown): OrderRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  const addressId = body.addressId;
  if (typeof addressId !== "number" || !Number.isSafeInteger(addressId) || addressId <= 0) return null;

  const deliveryDate = body.deliveryDate ?? null;
  if (deliveryDate !== null && (typeof deliveryDate !== "string" || !ISO_DATE.test(deliveryDate))) return null;

  const paymentMethod = body.paymentMethod ?? null;
  if (paymentMethod !== null && (typeof paymentMethod !== "string" || paymentMethod.length > 20)) return null;

  const items = body.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ORDER_LINES) return null;

  const cleanItems: OrderLineInput[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) return null;
    const { itemId, unitId, quantity } = item as Record<string, unknown>;
    if (typeof itemId !== "string" || itemId.trim() === "" || itemId.length > MAX_ITEM_ID_LENGTH) return null;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity)) return null;
    if (unitId !== undefined && unitId !== null && (typeof unitId !== "string" || unitId.length > MAX_UNIT_ID_LENGTH)) return null;
    const unit = typeof unitId === "string" && unitId.trim() !== "" ? unitId.trim() : null;
    cleanItems.push(unit ? { itemId, unitId: unit, quantity } : { itemId, quantity });
  }

  return {
    addressId,
    deliveryDate: deliveryDate as string | null,
    paymentMethod: paymentMethod as PaymentMethod | null,
    items: cleanItems,
  };
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

// Lee la respuesta del servidor; null si no tiene la forma esperada (nunca se inventan valores).
export function parseOrderPreview(raw: unknown): OrderPreview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!Array.isArray(r.lines) || !Array.isArray(r.errors)) return null;
  const totals = r.totals;
  if (typeof totals !== "object" || totals === null) return null;
  if (![totals.subtotal, totals.discount, totals.tax, totals.total].every(isNumber)) return null;
  if (!isNumber(r.minimumAmount) || !isNumber(r.shortfall)) return null;
  if (typeof r.canOrder !== "boolean" || typeof r.belowMinimum !== "boolean") return null;
  const delivery = r.delivery;
  if (typeof delivery !== "object" || delivery === null) return null;

  const lines = [];
  for (const line of r.lines) {
    if (typeof line !== "object" || line === null) return null;
    if (typeof line.itemId !== "string" || !isNumber(line.quantity)) return null;
    if (![line.unitPrice, line.discount, line.tax, line.lineTotal].every(isNumber)) return null;
    lines.push({
      itemId: line.itemId,
      name: typeof line.name === "string" ? line.name : "",
      unitId: typeof line.unitId === "string" ? line.unitId : "",
      factor: isNumber(line.factor) ? line.factor : 1,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      tax: line.tax,
      lineTotal: line.lineTotal,
      available: line.available === true,
    });
  }

  const errors: OrderPreviewError[] = [];
  for (const error of r.errors) {
    if (typeof error !== "object" || error === null || typeof error.code !== "string") return null;
    errors.push({
      code: error.code,
      itemId: typeof error.itemId === "string" ? error.itemId : null,
      message: typeof error.message === "string" ? error.message : "",
    });
  }

  return {
    lines,
    totals: { subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total },
    freight: isNumber(r.freight) ? r.freight : null,
    freightPending: r.freightPending !== false,
    minimumAmount: r.minimumAmount,
    belowMinimum: r.belowMinimum,
    shortfall: r.shortfall,
    delivery: {
      date: typeof delivery.date === "string" ? delivery.date : null,
      valid: delivery.valid === true,
      requiresCoordination: delivery.requiresCoordination === true,
    },
    canOrder: r.canOrder,
    errors,
  };
}

// Une cada línea del carrito con su línea validada por el servidor. Las líneas con presentación explícita
// buscan la suya por unidad; la que no tiene unidad (la por defecto) toma la línea del mismo ítem que
// ninguna otra reclamó. La clave es la de cartLineKey (ítem|unidad, en mayúsculas).
export function matchPreviewLines(
  cartItems: ReadonlyArray<{ id: string; unitId?: string }>,
  lines: ReadonlyArray<OrderPreviewLine>
): Map<string, OrderPreviewLine> {
  const norm = (s: string | undefined) => (s ?? "").trim().toUpperCase();
  const key = (id: string, unitId?: string) => `${norm(id)}|${norm(unitId)}`;
  const result = new Map<string, OrderPreviewLine>();
  const claimed = new Set<OrderPreviewLine>();

  for (const item of cartItems) {
    if (!item.unitId) continue;
    const line = lines.find((l) => norm(l.itemId) === norm(item.id) && norm(l.unitId) === norm(item.unitId));
    if (line) {
      result.set(key(item.id, item.unitId), line);
      claimed.add(line);
    }
  }
  for (const item of cartItems) {
    if (item.unitId) continue;
    const line = lines.find((l) => norm(l.itemId) === norm(item.id) && !claimed.has(l));
    if (line) {
      result.set(key(item.id), line);
      claimed.add(line);
    }
  }
  return result;
}

// Códigos de error por línea (con itemId) agrupados por ítem.
export function lineErrorsByItem(preview: OrderPreview): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const error of preview.errors) {
    if (!error.itemId) continue;
    const key = error.itemId.toLowerCase();
    map.set(key, [...(map.get(key) ?? []), error.code]);
  }
  return map;
}

export function hasLineErrors(preview: OrderPreview): boolean {
  return preview.errors.some((e) => !!e.itemId);
}

export function hasError(preview: OrderPreview, code: string): boolean {
  return preview.errors.some((e) => e.code === code);
}

// ¿Se puede pasar al paso siguiente? Reglas del flujo:
//   cart     -> sin errores por línea, con lista de precios y por encima del mínimo.
//   delivery -> fecha elegida y válida (o zona por coordinar).
//   payment  -> método de pago elegido.
export function canAdvance(
  step: CheckoutStep,
  preview: OrderPreview | null,
  selection: { deliveryDate: string | null; paymentMethod: PaymentMethod | null }
): boolean {
  if (!preview) return false;
  switch (step) {
    case "cart":
      return preview.lines.length > 0 && !hasLineErrors(preview) && !hasError(preview, "price_list_missing") && !preview.belowMinimum;
    case "delivery":
      return preview.delivery.requiresCoordination
        ? selection.deliveryDate === null && preview.delivery.valid
        : selection.deliveryDate !== null && preview.delivery.valid;
    case "payment":
      return selection.paymentMethod !== null;
    case "summary":
      return preview.canOrder;
  }
}

export function nextStep(step: CheckoutStep): CheckoutStep {
  return step === "cart" ? "delivery" : step === "delivery" ? "payment" : "summary";
}

export function previousStep(step: CheckoutStep): CheckoutStep {
  return step === "summary" ? "payment" : step === "payment" ? "delivery" : "cart";
}
