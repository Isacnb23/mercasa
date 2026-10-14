// Lógica pura de "Mis pedidos" (historial del cliente, solo lectura). Sin React ni Next, para probarla con el test runner
// de Node. La cuenta del cliente NUNCA viaja desde aquí: sale del JWT de la sesión en el servidor.

// Códigos de estado estables (los mapea homex-api desde AX); el texto para el cliente está en los mensajes (Orders.status.*).
export const ORDER_STATUSES = [
  "received",
  "processing",
  "postponed",
  "cancelled",
  "approved",
  "invoiced",
  "on_route",
  "delivered",
  "partial",
  "returned",
  "later",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderChannel = "delivery" | "pickup";

export interface OrderSummary {
  orderId: string;
  axOrderId: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  channel: OrderChannel;
  deliveryDate: string | null;
  addressName: string;
}

export interface OrderList {
  items: OrderSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface OrderLine {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  date: string;
}

export interface OrderDetail {
  order: OrderSummary;
  lines: OrderLine[];
  timeline: OrderTimelineEntry[];
}

export const MAX_PAGE = 50;
export const MAX_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE = 10;

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

// Id web del pedido: solo los caracteres que usa AX (por ejemplo 403-0001234).
export const isValidOrderId = (value: string): boolean => /^[A-Za-z0-9-]{1,30}$/.test(value);

const clampInt = (raw: string | null, fallback: number, min: number, max: number): number => {
  if (raw === null || !/^\d{1,9}$/.test(raw)) return fallback;
  return Math.min(Math.max(Number(raw), min), max);
};

// Parámetros de la lista, acotados (page 1..50, pageSize 1..20). Nunca cuenta ni cédula.
export function parseListParams(search: URLSearchParams): { page: number; pageSize: number } {
  return {
    page: clampInt(search.get("page"), 1, 1, MAX_PAGE),
    pageSize: clampInt(search.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
  };
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function parseSummary(raw: unknown): OrderSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const orderId = str(r.orderId).trim();
  if (!isValidOrderId(orderId)) return null;

  return {
    orderId,
    axOrderId: str(r.axOrderId).trim(),
    createdAt: str(r.createdAt),
    // Un estado que la web no conoce se muestra como "En proceso" (no se esconde ni se inventa).
    status: isOrderStatus(r.status) ? r.status : "processing",
    total: num(r.total),
    channel: r.channel === "pickup" ? "pickup" : "delivery",
    deliveryDate: typeof r.deliveryDate === "string" && r.deliveryDate ? r.deliveryDate : null,
    addressName: str(r.addressName).trim(),
  };
}

// Solo los campos permitidos y con tipos válidos; lo demás se descarta. null = respuesta inesperada.
export function parseOrderList(raw: unknown): OrderList | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;

  return {
    items: r.items.map(parseSummary).filter((item): item is OrderSummary => item !== null),
    page: Math.max(1, Math.trunc(num(r.page)) || 1),
    pageSize: Math.max(1, Math.trunc(num(r.pageSize)) || DEFAULT_PAGE_SIZE),
    hasMore: r.hasMore === true,
  };
}

export function parseOrderDetail(raw: unknown): OrderDetail | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const order = parseSummary(r.order);
  if (!order) return null;

  const lines = (Array.isArray(r.lines) ? r.lines : []).flatMap((line): OrderLine[] => {
    if (typeof line !== "object" || line === null) return [];
    const l = line as Record<string, unknown>;
    return [{ itemId: str(l.itemId), itemName: str(l.itemName), unit: str(l.unit), quantity: num(l.quantity), unitPrice: num(l.unitPrice), lineTotal: num(l.lineTotal) }];
  });

  const timeline = (Array.isArray(r.timeline) ? r.timeline : []).flatMap((entry): OrderTimelineEntry[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const e = entry as Record<string, unknown>;
    return isOrderStatus(e.status) ? [{ status: e.status, date: str(e.date) }] : [];
  });

  return { order, lines, timeline };
}

// Qué le pasó a la petición, para elegir qué mostrar. "disabled" = el servidor apagó el historial (no se muestra la entrada).
export type OrdersErrorKind = "disabled" | "unauthorized" | "notFound" | "rateLimited" | "unavailable";

export function classifyOrdersError(status: number, body: unknown): OrdersErrorKind {
  const code = typeof (body as { code?: unknown } | null)?.code === "string" ? (body as { code: string }).code : "";
  if (code === "history_disabled") return "disabled";
  if (status === 401) return "unauthorized";
  if (status === 404 || code === "not_found") return "notFound";
  if (status === 429) return "rateLimited";
  return "unavailable";
}

// "14 oct 2026, 8:00" / "Oct 14, 2026, 8:00 AM". AX manda la fecha como hora local de Costa Rica SIN zona horaria: se
// conserva tal cual (se arma en UTC y se muestra en UTC) para no correrla por la zona del navegador.
export function formatOrderDateTime(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!match) return "";
  const [, y, mo, d, h, mi] = match;
  const instant = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0)));
  if (Number.isNaN(instant.getTime())) return "";

  const hasTime = h !== undefined && !(h === "00" && mi === "00");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "UTC",
  })
    .format(instant)
    .replace(/\./g, "");
}
