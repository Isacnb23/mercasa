// Tipos del flujo de pedido. REGLA: el navegador solo manda `itemId` y cantidad (más la dirección, la
// fecha y el método de pago como selecciones). Todo precio, descuento, impuesto, total y el mínimo
// vienen de la respuesta del servidor (POST /api/checkout/order/validate) y nunca se calculan acá.

export type PaymentMethod = "sinpe" | "transfer";

export interface OrderLineInput {
  itemId: string;
  // Presentación elegida (opcional): sin ella el servidor usa la por defecto. Es una selección, no un precio.
  unitId?: string;
  quantity: number;
}

// Lo ÚNICO que viaja del navegador al servidor.
export interface OrderRequest {
  addressId: number;
  // "yyyy-MM-dd"; null cuando la zona requiere coordinación o aún no se eligió.
  deliveryDate: string | null;
  paymentMethod: PaymentMethod | null;
  items: OrderLineInput[];
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

export interface OrderPreview {
  lines: OrderPreviewLine[];
  totals: OrderPreviewTotals;
  freight: number | null;
  freightPending: boolean;
  minimumAmount: number;
  belowMinimum: boolean;
  shortfall: number;
  delivery: OrderPreviewDelivery;
  canOrder: boolean;
  errors: OrderPreviewError[];
}

// Pasos del flujo con el pedido habilitado.
export type CheckoutStep = "cart" | "delivery" | "payment" | "summary";
export const CHECKOUT_STEPS: CheckoutStep[] = ["cart", "delivery", "payment", "summary"];

// Resultado de POST /api/checkout/order.
export type OrderSubmitResult =
  | { ok: true; orderNumber: string | null }
  // code: ordering_disabled | ordering_not_available | service_unavailable | session | invalid | unknown
  | { ok: false; code: string };
