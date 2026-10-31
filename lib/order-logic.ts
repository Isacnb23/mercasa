// Lógica pura del pedido (sin React ni Next): armado del cuerpo, sanitización, lectura de la respuesta
// del servidor y reglas de avance entre pasos. La usan la ruta de servidor, el hook y los componentes, y
// se prueba con el test runner de Node (lib/__tests__).
import type { CartChannel } from "./cart-types";
import type {
  CheckoutStep,
  OrderLineInput,
  OrderPreview,
  OrderPreviewError,
  OrderPreviewGroup,
  OrderPreviewLine,
  OrderPreviewPickupGroup,
  OrderPreviewSite,
  OrderPreviewTotals,
  OrderRequest,
  PaymentMethod,
} from "./order-types";

export const MAX_ORDER_LINES = 100;
export const MAX_ITEM_ID_LENGTH = 50;
export const MAX_UNIT_ID_LENGTH = 20;
export const MAX_SITE_ID_LENGTH = 16;
// Dos grupos de hasta 100 líneas.
export const MAX_ORDER_BODY_BYTES = 64 * 1024;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type CartLineLike = { id: string; quantity: number; unitId?: string; channel?: CartChannel };

const toLine = (item: CartLineLike): OrderLineInput =>
  item.unitId ? { itemId: item.id, unitId: item.unitId, quantity: item.quantity } : { itemId: item.id, quantity: item.quantity };

export interface OrderSelection {
  // Dirección activa; sin ella no se arma el grupo de domicilio.
  addressId: number | null;
  deliveryDate: string | null;
  paymentMethod: PaymentMethod | null;
  // Tienda de retiro; sin ella no se arma el grupo de retiro.
  pickupSiteId: string | null;
  // Fecha de retiro elegida ("yyyy-MM-dd"); ausente o null = sin fecha (el campo no viaja).
  pickupDate?: string | null;
}

// Arma el cuerpo del pedido SOLO con itemId, presentación elegida (si la hay) y cantidad (+ selecciones). Cada
// línea va al grupo de su canal (sin canal = domicilio). Es el único camino por el que el navegador le habla a la
// ruta de validación: aunque un ítem del carrito tuviera otros campos, no salen.
export function buildOrderRequest(cartItems: ReadonlyArray<CartLineLike>, selection: OrderSelection): OrderRequest {
  const deliveryLines = cartItems.filter((i) => (i.channel ?? "delivery") === "delivery").map(toLine);
  const pickupLines = cartItems.filter((i) => i.channel === "pickup").map(toLine);

  return {
    paymentMethod: selection.paymentMethod,
    delivery:
      deliveryLines.length > 0 && selection.addressId !== null
        ? { addressId: selection.addressId, deliveryDate: selection.deliveryDate, lines: deliveryLines }
        : null,
    pickup:
      pickupLines.length > 0 && selection.pickupSiteId
        ? { siteId: selection.pickupSiteId, ...(selection.pickupDate ? { pickupDate: selection.pickupDate } : {}), lines: pickupLines }
        : null,
  };
}

export function orderRequestKey(request: OrderRequest): string {
  return JSON.stringify(request);
}

function cleanLines(items: unknown): OrderLineInput[] | null {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ORDER_LINES) return null;
  const clean: OrderLineInput[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) return null;
    const { itemId, unitId, quantity } = item as Record<string, unknown>;
    if (typeof itemId !== "string" || itemId.trim() === "" || itemId.length > MAX_ITEM_ID_LENGTH) return null;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity)) return null;
    if (unitId !== undefined && unitId !== null && (typeof unitId !== "string" || unitId.length > MAX_UNIT_ID_LENGTH)) return null;
    const unit = typeof unitId === "string" && unitId.trim() !== "" ? unitId.trim() : null;
    clean.push(unit ? { itemId, unitId: unit, quantity } : { itemId, quantity });
  }
  return clean;
}

// Valida y limpia lo que llega del navegador a la ruta de servidor. Descarta cualquier campo que no sea
// de la lista (precios, totales, descuentos, mínimo...) y devuelve null si el cuerpo es inválido. Hace falta al
// menos un grupo y cada grupo presente necesita entre 1 y 100 líneas válidas.
export function sanitizeOrderRequest(raw: unknown): OrderRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  const paymentMethod = body.paymentMethod ?? null;
  if (paymentMethod !== null && (typeof paymentMethod !== "string" || paymentMethod.length > 20)) return null;

  let delivery: OrderRequest["delivery"] = null;
  if (body.delivery !== undefined && body.delivery !== null) {
    if (typeof body.delivery !== "object") return null;
    const g = body.delivery as Record<string, unknown>;
    const addressId = g.addressId;
    if (typeof addressId !== "number" || !Number.isSafeInteger(addressId) || addressId <= 0) return null;
    const deliveryDate = g.deliveryDate ?? null;
    if (deliveryDate !== null && (typeof deliveryDate !== "string" || !ISO_DATE.test(deliveryDate))) return null;
    const lines = cleanLines(g.lines);
    if (!lines) return null;
    delivery = { addressId, deliveryDate: deliveryDate as string | null, lines };
  }

  let pickup: OrderRequest["pickup"] = null;
  if (body.pickup !== undefined && body.pickup !== null) {
    if (typeof body.pickup !== "object") return null;
    const g = body.pickup as Record<string, unknown>;
    const siteId = g.siteId;
    if (typeof siteId !== "string" || siteId.trim() === "" || siteId.length > MAX_SITE_ID_LENGTH) return null;
    const pickupDate = g.pickupDate ?? null;
    if (pickupDate !== null && (typeof pickupDate !== "string" || !ISO_DATE.test(pickupDate))) return null;
    const lines = cleanLines(g.lines);
    if (!lines) return null;
    pickup = { siteId: siteId.trim(), ...(pickupDate !== null ? { pickupDate } : {}), lines };
  }

  if (!delivery && !pickup) return null;
  return { paymentMethod: paymentMethod as PaymentMethod | null, delivery, pickup };
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function parseTotals(totals: unknown): OrderPreviewTotals | null {
  if (typeof totals !== "object" || totals === null) return null;
  const t = totals as Raw;
  if (![t.subtotal, t.discount, t.tax, t.total].every(isNumber)) return null;
  return { subtotal: t.subtotal, discount: t.discount, tax: t.tax, total: t.total };
}

function parseLines(rawLines: unknown): OrderPreviewLine[] | null {
  if (!Array.isArray(rawLines)) return null;
  const lines: OrderPreviewLine[] = [];
  for (const line of rawLines as Raw[]) {
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
      maxAvailable: isNumber(line.maxAvailable) ? line.maxAvailable : null,
    });
  }
  return lines;
}

function parseErrors(rawErrors: unknown): OrderPreviewError[] | null {
  if (!Array.isArray(rawErrors)) return null;
  const errors: OrderPreviewError[] = [];
  for (const error of rawErrors as Raw[]) {
    if (typeof error !== "object" || error === null || typeof error.code !== "string") return null;
    errors.push({
      code: error.code,
      itemId: typeof error.itemId === "string" ? error.itemId : null,
      message: typeof error.message === "string" ? error.message : "",
    });
  }
  return errors;
}

function parseGroup(raw: unknown): OrderPreviewGroup | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Raw;
  const lines = parseLines(g.lines);
  const errors = parseErrors(g.errors);
  const totals = parseTotals(g.totals);
  if (!lines || !errors || !totals) return null;
  if (typeof g.canOrder !== "boolean" || typeof g.belowMinimum !== "boolean" || !isNumber(g.shortfall)) return null;
  if (g.minimumAmount !== null && g.minimumAmount !== undefined && !isNumber(g.minimumAmount)) return null;
  return {
    lines,
    totals,
    minimumAmount: isNumber(g.minimumAmount) ? g.minimumAmount : null,
    belowMinimum: g.belowMinimum,
    shortfall: g.shortfall,
    canOrder: g.canOrder,
    errors,
  };
}

function parsePickupGroup(raw: unknown): OrderPreviewPickupGroup | null {
  const base = parseGroup(raw);
  if (!base) return null;
  const g = raw as Raw;
  const sites: OrderPreviewSite[] = [];
  for (const s of Array.isArray(g.sites) ? (g.sites as Raw[]) : []) {
    if (typeof s !== "object" || s === null || typeof s.siteId !== "string") return null;
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    sites.push({
      siteId: s.siteId,
      unavailableItems: isNumber(s.unavailableItems) ? s.unavailableItems : 0,
      name: text(s.name),
      city: text(s.city),
      address: text(s.address),
      hours: text(s.hours),
      mapUrl: text(s.mapUrl),
      lat: isNumber(s.lat) ? s.lat : null,
      lng: isNumber(s.lng) ? s.lng : null,
      // Sin estado del servidor, por el conteo de productos que faltan (como antes).
      status:
        s.status === "available" || s.status === "low" || s.status === "out"
          ? s.status
          : isNumber(s.unavailableItems) && s.unavailableItems > 0
            ? "out"
            : "available",
    });
  }
  return { ...base, siteId: typeof g.siteId === "string" ? g.siteId : "", sites };
}

// Lee la respuesta del servidor; null si no tiene la forma esperada (nunca se inventan valores).
export function parseOrderPreview(raw: unknown): OrderPreview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Raw;

  const lines = parseLines(r.lines);
  const errors = parseErrors(r.errors);
  const totals = parseTotals(r.totals);
  if (!lines || !errors || !totals) return null;
  if (!isNumber(r.minimumAmount) || !isNumber(r.shortfall)) return null;
  if (typeof r.canOrder !== "boolean" || typeof r.belowMinimum !== "boolean") return null;
  const delivery = r.delivery;
  if (typeof delivery !== "object" || delivery === null) return null;

  const hasGroups = r.deliveryGroup != null || r.pickupGroup != null;
  let deliveryGroup: OrderPreviewGroup | null = null;
  let pickupGroup: OrderPreviewPickupGroup | null = null;
  if (hasGroups) {
    if (r.deliveryGroup != null && !(deliveryGroup = parseGroup(r.deliveryGroup))) return null;
    if (r.pickupGroup != null && !(pickupGroup = parsePickupGroup(r.pickupGroup))) return null;
  } else {
    // Respuesta de la forma anterior (un solo grupo, domicilio): sus campos de arriba SON el grupo.
    deliveryGroup = {
      lines,
      totals,
      minimumAmount: r.minimumAmount,
      belowMinimum: r.belowMinimum,
      shortfall: r.shortfall,
      canOrder: r.canOrder,
      errors,
    };
  }

  const grandTotals = parseTotals(r.grandTotals) ?? totals;

  return {
    lines,
    totals,
    freight: isNumber(r.freight) ? r.freight : null,
    freightPending: r.freightPending !== false,
    minimumAmount: r.minimumAmount,
    belowMinimum: r.belowMinimum,
    shortfall: r.shortfall,
    delivery: {
      date: typeof delivery.date === "string" ? delivery.date : null,
      valid: delivery.valid === true,
      requiresCoordination: delivery.requiresCoordination === true,
      coordinationReason: typeof delivery.coordinationReason === "string" ? delivery.coordinationReason : null,
      dateType: typeof delivery.dateType === "string" ? delivery.dateType : null,
    },
    canOrder: r.canOrder,
    errors,
    deliveryGroup,
    pickupGroup,
    grandTotals,
  };
}

// Grupo del canal (null si el pedido no lo trae).
export function groupFor(preview: OrderPreview, channel: CartChannel): OrderPreviewGroup | null {
  return channel === "pickup" ? preview.pickupGroup : preview.deliveryGroup;
}

// Une cada línea del carrito con su línea validada por el servidor. Las líneas con presentación explícita
// buscan la suya por unidad; la que no tiene unidad (la por defecto) toma la línea del mismo ítem que
// ninguna otra reclamó. La clave es la de cartLineKey sin canal (ítem|unidad, en mayúsculas); se llama una vez por
// grupo con las líneas del canal.
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

// Códigos de error por línea (con itemId) del grupo de ese canal, agrupados por ítem.
export function lineErrorsByItem(preview: OrderPreview, channel: CartChannel = "delivery"): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const error of groupFor(preview, channel)?.errors ?? []) {
    if (!error.itemId) continue;
    const key = error.itemId.toLowerCase();
    map.set(key, [...(map.get(key) ?? []), error.code]);
  }
  return map;
}

// ¿Algún grupo tiene errores por línea?
export function hasLineErrors(preview: OrderPreview): boolean {
  return [preview.deliveryGroup, preview.pickupGroup].some((g) => g?.errors.some((e) => !!e.itemId));
}

// Error sin línea (price_list_missing, método de pago...) en el resumen de arriba o en cualquier grupo.
export function hasError(preview: OrderPreview, code: string): boolean {
  return (
    preview.errors.some((e) => e.code === code) ||
    [preview.deliveryGroup, preview.pickupGroup].some((g) => g?.errors.some((e) => e.code === code))
  );
}

// Código con que mercasa-api rechaza un domicilio que AX no puede atender. Cada razón viene como un error aparte, SIN itemId, con la
// razón de AX en `message`.
export const DELIVERY_NOT_POSSIBLE = "delivery_not_possible";
// Código con que mercasa-api rechaza una fecha de retiro que no se ofrece.
export const PICKUP_DATE_INVALID = "pickup_date_invalid";

// Precio de UNA unidad CON IVA de una línea validada: (precio unitario sin IVA x cantidad + IVA de la línea) / cantidad. Solo para
// MOSTRAR junto al total de la línea (que ya lleva IVA), igual que el catálogo muestra "IVA incluido"; todos los números salen de
// la respuesta del servidor y los totales del pedido siguen siendo los suyos. null si la línea no tiene cantidad.
export function unitPriceWithTax(line: { unitPrice: number; tax: number; quantity: number }): number | null {
  if (!(line.quantity > 0)) return null;
  return (line.unitPrice * line.quantity + line.tax) / line.quantity;
}

// Razones (textos de AX, sin repetir ni vacías) por las que el grupo a domicilio no se puede entregar. Vacía = sin ese error.
export function deliveryNotPossibleReasons(preview: OrderPreview): string[] {
  const reasons: string[] = [];
  for (const error of preview.deliveryGroup?.errors ?? []) {
    if (error.code !== DELIVERY_NOT_POSSIBLE || error.itemId) continue;
    const reason = error.message.trim();
    if (reason !== "" && !reasons.includes(reason)) reasons.push(reason);
  }
  return reasons;
}

// ¿El grupo a domicilio trae delivery_not_possible? (aunque la razón venga vacía, el grupo no se puede entregar).
export function isDeliveryNotPossible(preview: OrderPreview): boolean {
  return (preview.deliveryGroup?.errors ?? []).some((e) => e.code === DELIVERY_NOT_POSSIBLE && !e.itemId);
}

// ¿El servidor rechazó la fecha de retiro elegida?
export function isPickupDateInvalid(preview: OrderPreview): boolean {
  return (preview.pickupGroup?.errors ?? []).some((e) => e.code === PICKUP_DATE_INVALID);
}

export interface OrderGroupsPresent {
  delivery: boolean;
  pickup: boolean;
}

// ¿Se puede pasar al paso siguiente? Reglas del flujo:
//   cart     -> sin errores por línea, con lista de precios y por encima del mínimo de CADA grupo presente.
//   delivery -> con grupo de domicilio: fecha elegida y válida (o zona por coordinar); con grupo de retiro: tienda
//               elegida, con respuesta del servidor, y fecha de retiro elegida y no rechazada por el servidor.
//               Sin ese grupo no se pide nada de él.
//   payment  -> método de pago elegido.
//   summary  -> canOrder global.
// `present` dice qué grupos tiene el carrito (por defecto solo domicilio, como antes de la fase 2).
export function canAdvance(
  step: CheckoutStep,
  preview: OrderPreview | null,
  selection: { deliveryDate: string | null; paymentMethod: PaymentMethod | null; pickupDate?: string | null },
  present: OrderGroupsPresent = { delivery: true, pickup: false }
): boolean {
  if (!preview) return false;
  switch (step) {
    case "cart": {
      const groups = [present.delivery ? preview.deliveryGroup : undefined, present.pickup ? preview.pickupGroup : undefined];
      if (present.delivery && !preview.deliveryGroup) return false;
      if (present.pickup && !preview.pickupGroup) return false;
      const hasLines = groups.some((g) => g && g.lines.length > 0);
      const belowMinimum = groups.some((g) => g?.belowMinimum);
      // Un domicilio que AX no puede atender bloquea el avance (el aviso con las razones sale en el resumen de ese grupo).
      const notDeliverable = present.delivery && isDeliveryNotPossible(preview);
      return hasLines && !hasLineErrors(preview) && !hasError(preview, "price_list_missing") && !belowMinimum && !notDeliverable;
    }
    case "delivery": {
      const deliveryOk = !present.delivery
        ? true
        : isDeliveryNotPossible(preview)
          ? false
          : preview.delivery.requiresCoordination
            ? selection.deliveryDate === null && preview.delivery.valid
            : selection.deliveryDate !== null && preview.delivery.valid;
      // Con retiro la fecha es OBLIGATORIA: sin elegirla (o si el servidor la rechaza) no se avanza.
      const pickupOk = !present.pickup
        ? true
        : !!preview.pickupGroup && preview.pickupGroup.siteId !== "" && !!selection.pickupDate && !isPickupDateInvalid(preview);
      return deliveryOk && pickupOk;
    }
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
