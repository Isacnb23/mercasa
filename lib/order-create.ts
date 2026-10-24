// Crear el pedido (POST /api/checkout/order): lógica pura (sin React, Next ni red) del cuerpo, el requestId, la
// sanitización de la ruta de servidor y la lectura de las respuestas. Se prueba con el test runner de Node.
//
// REGLAS: el navegador manda SOLO ids y cantidades (más dirección, fecha, método de pago, notas y requestId). Nunca precios,
// totales, impuestos ni la cuenta: los precios los calcula el servidor (Order/Validate y el propio Order/Create) y la cuenta
// sale del JWT en el servidor. El cuerpo es ESTRICTO: cualquier campo que no esté en la lista se rechaza.
import type { CartChannel } from "./cart-types";
import type { OrderLineInput, PaymentMethod } from "./order-types";

export const MAX_NOTES_LENGTH = 250;
export const MAX_CREATE_LINES = 100;
export const MAX_ITEM_ID = 50;
export const MAX_UNIT_ID = 20;
export const MAX_QUANTITY = 9999;
export const MAX_SITE_ID = 16;
// Solo el pedido: mercasa-api espera hasta 45 s y homex-api hasta ~24 s, así que el proxy espera 60 s. Los demás
// endpoints del proxy conservan sus tiempos (15 s los GET; 25 s los POST de validar y precios).
export const ORDER_PROXY_TIMEOUT_MS = 60_000;
// El navegador espera un poco más que el proxy.
export const ORDER_CLIENT_TIMEOUT_MS = 70_000;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS: readonly string[] = ["sinpe", "transfer"];

type CartLineLike = { id: string; quantity: number; unitId?: string; channel?: CartChannel };

// ---------------------------------------------------------------------------------------------------------------
// requestId
// ---------------------------------------------------------------------------------------------------------------

export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}

export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && GUID.test(value) && value !== "00000000-0000-0000-0000-000000000000";
}

// El requestId de una confirmación: NUEVO por cada pantalla de pago (quien llama pone `previous` en null al abrirla) y el
// MISMO en los reintentos de esa misma confirmación (timeout o red), para que un doble clic o un reintento no duplique el
// pedido. Si el contenido del pedido cambió desde el intento anterior (otro carrito, dirección, fecha o pago), el servidor
// reanudaría el pedido viejo ignorando el cambio: por eso ahí se genera uno nuevo.
export interface RequestIdState {
  id: string;
  contentKey: string;
}

export function resolveRequestId(previous: RequestIdState | null, contentKey: string, generate: () => string = newRequestId): RequestIdState {
  if (previous && previous.contentKey === contentKey) return previous;
  return { id: generate(), contentKey };
}

// ---------------------------------------------------------------------------------------------------------------
// Cuerpo
// ---------------------------------------------------------------------------------------------------------------

export interface CreateOrderBody {
  requestId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  // Forma plana (solo domicilio).
  addressId?: number;
  deliveryDate?: string;
  items?: OrderLineInput[];
  // Forma por grupos: mercasa-api responde pickup_not_supported si viene "pickup".
  delivery?: { addressId: number; deliveryDate: string; lines: OrderLineInput[] };
  pickup?: { siteId: string; lines: OrderLineInput[] };
}

export interface CreateSelection {
  addressId: number | null;
  deliveryDate: string | null;
  paymentMethod: PaymentMethod | null;
  pickupSiteId: string | null;
}

const toLine = (item: CartLineLike): OrderLineInput =>
  item.unitId ? { itemId: item.id, unitId: item.unitId, quantity: item.quantity } : { itemId: item.id, quantity: item.quantity };

// Texto libre del cliente: sin caracteres de control, espacios colapsados, vacío = sin notas. Devuelve null si no cabe.
export function sanitizeNotes(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const clean = raw.replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ").replace(/\s+/g, " ").trim();
  return clean === "" ? undefined : clean;
}

// Arma el cuerpo SOLO con ids, presentación, cantidad y selecciones (nada de precios ni cuenta), SIN requestId: sirve para
// la clave de contenido. Devuelve null si falta lo mínimo (método de pago, o dirección y fecha para el domicilio).
export function buildCreateOrderContent(
  cartItems: ReadonlyArray<CartLineLike>,
  selection: CreateSelection,
  notes?: string | null,
): Omit<CreateOrderBody, "requestId"> | null {
  if (!selection.paymentMethod) return null;

  const deliveryLines = cartItems.filter((i) => (i.channel ?? "delivery") === "delivery").map(toLine);
  const pickupLines = cartItems.filter((i) => i.channel === "pickup").map(toLine);
  const clean = sanitizeNotes(notes ?? undefined);
  const base = { paymentMethod: selection.paymentMethod, ...(clean ? { notes: clean } : {}) };

  const delivery =
    deliveryLines.length > 0 && selection.addressId !== null && selection.deliveryDate
      ? { addressId: selection.addressId, deliveryDate: selection.deliveryDate, lines: deliveryLines }
      : null;
  if (deliveryLines.length > 0 && !delivery) return null;

  if (pickupLines.length > 0) {
    // Hoy el retiro en tienda no se puede pedir en línea: se manda el grupo para que el servidor lo diga (pickup_not_supported).
    if (!selection.pickupSiteId) return null;
    return { ...base, ...(delivery ? { delivery } : {}), pickup: { siteId: selection.pickupSiteId, lines: pickupLines } };
  }

  if (!delivery) return null;
  return { ...base, addressId: delivery.addressId, deliveryDate: delivery.deliveryDate, items: delivery.lines };
}

export function createOrderContentKey(content: Omit<CreateOrderBody, "requestId">): string {
  return JSON.stringify(content);
}

export function buildCreateOrderBody(content: Omit<CreateOrderBody, "requestId">, requestId: string): CreateOrderBody {
  return { requestId, ...content };
}

function cleanLines(items: unknown): OrderLineInput[] | null {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_CREATE_LINES) return null;
  const clean: OrderLineInput[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (Object.keys(record).some((k) => k !== "itemId" && k !== "unitId" && k !== "quantity")) return null;
    const { itemId, unitId, quantity } = record;
    if (typeof itemId !== "string" || itemId.trim() === "" || itemId.length > MAX_ITEM_ID || /[\u0000-\u001F\u007F]/.test(itemId)) return null;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
    if (unitId !== undefined && unitId !== null && (typeof unitId !== "string" || unitId.length > MAX_UNIT_ID)) return null;
    const unit = typeof unitId === "string" && unitId.trim() !== "" ? unitId.trim() : null;
    clean.push(unit ? { itemId: itemId.trim(), unitId: unit, quantity } : { itemId: itemId.trim(), quantity });
  }
  return clean;
}

function cleanGroupDelivery(raw: unknown): CreateOrderBody["delivery"] | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const g = raw as Record<string, unknown>;
  if (Object.keys(g).some((k) => k !== "addressId" && k !== "deliveryDate" && k !== "lines")) return null;
  if (typeof g.addressId !== "number" || !Number.isSafeInteger(g.addressId) || g.addressId <= 0) return null;
  if (typeof g.deliveryDate !== "string" || !ISO_DATE.test(g.deliveryDate)) return null;
  const lines = cleanLines(g.lines);
  return lines ? { addressId: g.addressId, deliveryDate: g.deliveryDate, lines } : null;
}

// Valida y limpia lo que llega del navegador a la ruta de servidor. ESTRICTO: devuelve null (→ 400) ante cualquier campo
// desconocido (precios, totales, impuestos, cuenta...), requestId que no sea GUID, fecha mal formada, método de pago fuera
// de la lista o notas demasiado largas. Los textos se limpian; nada se "corrige" en silencio salvo espacios y controles.
export function sanitizeCreateOrderBody(raw: unknown): CreateOrderBody | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const allowed = ["requestId", "paymentMethod", "notes", "addressId", "deliveryDate", "items", "delivery", "pickup"];
  if (Object.keys(body).some((k) => !allowed.includes(k))) return null;

  if (!isRequestId(body.requestId)) return null;
  if (typeof body.paymentMethod !== "string" || !PAYMENT_METHODS.includes(body.paymentMethod)) return null;

  let notes: string | undefined;
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") return null;
    notes = sanitizeNotes(body.notes);
    if (notes && notes.length > MAX_NOTES_LENGTH) return null;
  }

  const result: CreateOrderBody = {
    requestId: body.requestId.toLowerCase(),
    paymentMethod: body.paymentMethod as PaymentMethod,
    ...(notes ? { notes } : {}),
  };

  const hasFlat = body.addressId !== undefined || body.deliveryDate !== undefined || body.items !== undefined;
  const hasDelivery = body.delivery !== undefined && body.delivery !== null;
  const hasPickup = body.pickup !== undefined && body.pickup !== null;
  if (hasFlat && (hasDelivery || hasPickup)) return null;

  if (hasFlat) {
    if (typeof body.addressId !== "number" || !Number.isSafeInteger(body.addressId) || body.addressId <= 0) return null;
    if (typeof body.deliveryDate !== "string" || !ISO_DATE.test(body.deliveryDate)) return null;
    const items = cleanLines(body.items);
    if (!items) return null;
    return { ...result, addressId: body.addressId, deliveryDate: body.deliveryDate, items };
  }

  if (!hasDelivery && !hasPickup) return null;
  if (hasDelivery) {
    const delivery = cleanGroupDelivery(body.delivery);
    if (!delivery) return null;
    result.delivery = delivery;
  }
  if (hasPickup) {
    const g = body.pickup;
    if (typeof g !== "object" || g === null || Array.isArray(g)) return null;
    const record = g as Record<string, unknown>;
    if (Object.keys(record).some((k) => k !== "siteId" && k !== "lines")) return null;
    if (typeof record.siteId !== "string" || record.siteId.trim() === "" || record.siteId.length > MAX_SITE_ID) return null;
    const lines = cleanLines(record.lines);
    if (!lines) return null;
    result.pickup = { siteId: record.siteId.trim(), lines };
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------------------------------------------

export type CreateKind = "created" | "received" | "processing";

// Códigos que la pantalla sabe explicar. Nunca se muestran crudos: cada uno tiene su texto en los mensajes.
export const KNOWN_ORDER_CODES = [
  "ordering_disabled",
  "ordering_not_available",
  "order_busy",
  "order_unavailable",
  "service_unavailable",
  "order_timeout",
  "min_total_not_met",
  "payment_method_not_allowed",
  "pickup_not_supported",
  "delivery_coordination_not_supported",
  "delivery_route_missing",
  "order_invalid",
  "invalid_request",
  "invalid_request_id",
  "rate_limited",
  "address_not_found",
  "session",
  "unknown",
] as const;
export type OrderErrorCode = (typeof KNOWN_ORDER_CODES)[number];

export type OrderSubmitResult =
  | { ok: true; kind: CreateKind; orderNumber: string | null }
  // errors: códigos de order_invalid (insufficient_stock, item_unavailable...) para explicarlos con texto propio.
  | { ok: false; code: OrderErrorCode; errors?: string[] };

const SAFE_CODE = /^[a-z][a-z0-9_]{0,63}$/;
const ORDER_NUMBER = /^[A-Za-z0-9._-]{1,32}$/;

const isKnownCode = (value: unknown): value is OrderErrorCode => typeof value === "string" && (KNOWN_ORDER_CODES as readonly string[]).includes(value);
const asRecord = (data: unknown): Record<string, unknown> => (typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {});

// Lee la respuesta de NUESTRA ruta de servidor (ya filtrada por forwardOrderCreate) a un resultado para la pantalla.
export function classifyCreateResponse(httpStatus: number, data: unknown): OrderSubmitResult {
  const record = asRecord(data);
  const code = isKnownCode(record.code) ? record.code : null;

  if (httpStatus === 201 || httpStatus === 202) {
    const kind: CreateKind = httpStatus === 201 ? "created" : record.status === "processing" ? "processing" : "received";
    const orderNumber = typeof record.orderNumber === "string" && ORDER_NUMBER.test(record.orderNumber) ? record.orderNumber : null;
    return { ok: true, kind, orderNumber };
  }

  if (httpStatus === 401) return { ok: false, code: "session" };
  if (httpStatus === 404) return { ok: false, code: "address_not_found" };
  if (httpStatus === 429) return { ok: false, code: "rate_limited" };
  if (httpStatus === 504) return { ok: false, code: "order_timeout" };

  if (httpStatus === 400) {
    const errors = Array.isArray(record.errors)
      ? record.errors
          .map((e) => asRecord(e).code)
          .filter((c): c is string => typeof c === "string" && SAFE_CODE.test(c))
          .slice(0, 20)
      : undefined;
    return { ok: false, code: code && code !== "service_unavailable" ? code : "invalid_request", ...(errors && errors.length > 0 ? { errors } : {}) };
  }

  if (httpStatus === 503) return { ok: false, code: code ?? "service_unavailable" };
  return { ok: false, code: "unknown" };
}

// Llave del mensaje (Cart.order.*) para cada código. Los códigos desconocidos caen en el mensaje genérico.
export function errorMessageKey(code: OrderErrorCode): string {
  switch (code) {
    case "min_total_not_met": return "createMinTotal";
    case "payment_method_not_allowed": return "createPaymentNotAllowed";
    case "pickup_not_supported": return "createPickupNotSupported";
    case "delivery_coordination_not_supported": return "createCoordination";
    case "delivery_route_missing": return "createRouteMissing";
    case "order_invalid": return "createOrderInvalid";
    case "invalid_request":
    case "invalid_request_id": return "createInvalidRequest";
    case "rate_limited": return "createRateLimited";
    case "order_busy": return "createBusy";
    case "order_timeout": return "createTimeout";
    case "address_not_found": return "createAddressNotFound";
    case "session": return "sessionExpired";
    default: return "createUnavailable";
  }
}

// Llave del mensaje para un código de error de línea (order_invalid.errors). Sin texto propio: null (no se muestra crudo).
export function lineErrorMessageKey(code: string): string | null {
  switch (code) {
    case "item_not_found": return "lineNotFound";
    case "item_unavailable":
    case "insufficient_stock": return "lineUnavailable";
    case "invalid_quantity": return "lineInvalidQuantity";
    case "unit_not_available": return "lineUnitNotAvailable";
    case "price_not_available": return "linePriceNotAvailable";
    case "pickup_not_available": return "linePickupNotAvailable";
    case "price_list_missing": return "priceListMissing";
    case "delivery_date_invalid":
    case "delivery_date_required": return "createDateInvalid";
    default: return null;
  }
}

// El pedido ya salió (o puede haber salido) y no hay que invitar a reintentar a ciegas.
export const isAmbiguousFailure = (code: OrderErrorCode): boolean => code === "order_timeout";
