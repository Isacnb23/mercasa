// Tipos del flujo de pedido. REGLA: el navegador solo manda `itemId`, presentación y cantidad (más la dirección, la
// fecha, la tienda de retiro y el método de pago como selecciones). Todo precio, descuento, impuesto, total y el
// mínimo vienen de la respuesta del servidor (POST /api/checkout/order/validate) y nunca se calculan acá.

export type PaymentMethod = "sinpe" | "transfer";

export interface OrderLineInput {
  itemId: string;
  // Presentación elegida (opcional): sin ella el servidor usa la por defecto. Es una selección, no un precio.
  unitId?: string;
  quantity: number;
}

export interface OrderDeliveryGroupInput {
  addressId: number;
  // "yyyy-MM-dd"; null cuando la zona requiere coordinación o aún no se eligió.
  deliveryDate: string | null;
  lines: OrderLineInput[];
}

export interface OrderPickupGroupInput {
  // Código de UNA tienda oficial de retiro.
  siteId: string;
  lines: OrderLineInput[];
}

// Lo ÚNICO que viaja del navegador al servidor: hasta dos grupos (domicilio y retiro) y el pago, que es único.
export interface OrderRequest {
  paymentMethod: PaymentMethod | null;
  delivery: OrderDeliveryGroupInput | null;
  pickup: OrderPickupGroupInput | null;
}

export interface OrderPreviewLine {
  itemId: string;
  name: string;
  // Presentación aplicada por el servidor (la elegida o la por defecto) y su factor a la unidad base.
  unitId: string;
  factor: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
  available: boolean;
  // Máximo que se puede pedir de esta presentación con la existencia actual; null si la línea no tiene precio.
  maxAvailable: number | null;
}

export interface OrderPreviewTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface OrderPreviewError {
  code: string;
  itemId?: string | null;
  message: string;
}

export interface OrderPreviewDelivery {
  date: string | null;
  valid: boolean;
  requiresCoordination: boolean;
}

// Resultado de UN grupo (domicilio o retiro). canOrder y errors son del grupo; el método de pago es global.
export interface OrderPreviewGroup {
  lines: OrderPreviewLine[];
  totals: OrderPreviewTotals;
  // null = sin mínimo (retiro en tienda por ahora).
  minimumAmount: number | null;
  belowMinimum: boolean;
  shortfall: number;
  canOrder: boolean;
  errors: OrderPreviewError[];
}

// Una tienda de retiro con cuántos productos del grupo no tienen existencia allí (para elegir tienda).
export interface OrderPreviewSite {
  siteId: string;
  unavailableItems: number;
  name: string;
  city: string;
  address: string;
  hours: string;
  mapUrl: string;
}

export interface OrderPreviewPickupGroup extends OrderPreviewGroup {
  siteId: string;
  sites: OrderPreviewSite[];
}

export interface OrderPreview {
  // Los campos de abajo son los del grupo A domicilio (vacíos si el pedido no lo trae), como antes de la fase 2.
  lines: OrderPreviewLine[];
  totals: OrderPreviewTotals;
  freight: number | null;
  freightPending: boolean;
  minimumAmount: number;
  belowMinimum: boolean;
  shortfall: number;
  delivery: OrderPreviewDelivery;
  // GLOBAL: todos los grupos presentes y el método de pago.
  canOrder: boolean;
  errors: OrderPreviewError[];
  // Por grupo (null si el pedido no lo trae) y total general.
  deliveryGroup: OrderPreviewGroup | null;
  pickupGroup: OrderPreviewPickupGroup | null;
  grandTotals: OrderPreviewTotals;
}

// Pasos del flujo con el pedido habilitado.
export type CheckoutStep = "cart" | "delivery" | "payment" | "summary";
export const CHECKOUT_STEPS: CheckoutStep[] = ["cart", "delivery", "payment", "summary"];

// Resultado de POST /api/checkout/order.
export type OrderSubmitResult =
  | { ok: true; orderNumber: string | null }
  // code: ordering_disabled | ordering_not_available | service_unavailable | session | invalid | unknown
  | { ok: false; code: string };
