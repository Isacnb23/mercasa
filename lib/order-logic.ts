// Lógica pura del pedido (sin React ni Next): armado del cuerpo, sanitización, lectura de la respuesta
// del servidor y reglas de avance entre pasos. La usan la ruta de servidor, el hook y los componentes, y
// se prueba con el test runner de Node (lib/__tests__).
import type {
  CheckoutStep,
  OrderLineInput,
  OrderPreview,
  OrderPreviewError,
  OrderRequest,
  PaymentMethod,
} from "./order-types";

export const MAX_ORDER_LINES = 100;
export const MAX_ITEM_ID_LENGTH = 50;
export const MAX_ORDER_BODY_BYTES = 64 * 1024;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Arma el cuerpo del pedido SOLO con itemId y cantidad (+ selecciones). Es el único camino por el que el
// navegador le habla a la ruta de validación: aunque un ítem del carrito tuviera otros campos, no salen.
export function buildOrderRequest(
  cartItems: ReadonlyArray<{ id: string; quantity: number }>,
  addressId: number,
  deliveryDate: string | null,
  paymentMethod: PaymentMethod | null
): OrderRequest {
  return {
    addressId,
    deliveryDate,
    paymentMethod,
    items: cartItems.map((item): OrderLineInput => ({ itemId: item.id, quantity: item.quantity })),
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
    const { itemId, quantity } = item as Record<string, unknown>;
    if (typeof itemId !== "string" || itemId.trim() === "" || itemId.length > MAX_ITEM_ID_LENGTH) return null;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity)) return null;
    cleanItems.push({ itemId, quantity });
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
