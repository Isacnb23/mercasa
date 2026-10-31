// Reglas puras (sin React) de agregar al carrito desde el catálogo: qué hace el "+" de la tarjeta, qué botones del
// modal están habilitados según la presentación y el canal, y el tope de cantidad por existencia. Probadas con
// `npm test`. La existencia y los precios los decide el SERVIDOR; aquí solo se decide qué pedirle al cliente.
import type { CatalogUnit } from "./catalog-prices";
import type { CartChannel } from "./cart-types";
import type { ProductSummary } from "./product-types";

// Mismas reglas que catalog-channel (hasDelivery / hasPickup / canAddToCart), repetidas aquí a propósito para que este
// módulo no tenga imports locales en tiempo de ejecución (se prueba con `node --test` importando el .ts directo).
// Sin `availability` (lectura de respaldo) el producto es solo A domicilio.
type WithAvailability = Pick<ProductSummary, "availability">;
const sold = (p: WithAvailability, channel: CartChannel): boolean =>
  channel === "delivery" ? (p.availability?.delivery.available ?? true) : (p.availability?.pickup.available ?? false);
const canAddToCart = (p: WithAvailability, channel: CartChannel): boolean => sold(p, channel);

export type PlusAction = "add-delivery" | "add-pickup" | "open-detail";

// Regla del "+" de la tarjeta:
//   - un solo canal Y una sola presentación -> agrega directo a ese canal (domicilio, o retiro si solo se retira);
//   - varias presentaciones O los dos canales -> abre el modal para elegir presentación y canal (no agrega nada sin
//     preguntar).
// `unitCount` = cuántas presentaciones vendibles tiene el producto, o null si no se sabe (sin sesión, o todavía no
// llegaron): sin saberlo no se puede afirmar que haya varias, así que con un solo canal agrega la presentación por
// defecto (como siempre); con los dos canales siempre pregunta.
export function plusAction(product: Pick<ProductSummary, "availability">, unitCount: number | null): PlusAction {
  const delivery = canAddToCart(product, "delivery");
  const pickup = canAddToCart(product, "pickup");
  if (!delivery && !pickup) return "open-detail";
  if (delivery && pickup) return "open-detail";
  if (unitCount !== null && unitCount > 1) return "open-detail";
  return delivery ? "add-delivery" : "add-pickup";
}

// ¿Hace falta saber las presentaciones antes de decidir el "+"? Solo con un canal y sesión (con los dos canales ya
// se sabe que abre el modal).
export const needsUnitsForPlus = (product: Pick<ProductSummary, "availability">): boolean =>
  canAddToCart(product, "delivery") !== canAddToCart(product, "pickup");

export type ChannelButtonState =
  | { enabled: true }
  // channel = el producto no se consigue por ese canal; unit = esa presentación no está disponible en ese canal.
  | { enabled: false; reason: "channel" | "unit" };

// Estado del botón "Agregar a domicilio" / "Agregar a retiro en tienda" para la presentación elegida. Sin
// presentaciones conocidas (`unit` null) solo cuenta el canal: se agrega la presentación por defecto y el servidor
// vuelve a validar. Con ellas, el retiro exige que la presentación esté marcada como retirable por el servidor.
export function channelButtonState(
  product: Pick<ProductSummary, "availability">,
  channel: CartChannel,
  unit: Pick<CatalogUnit, "pickupAvailable"> | null
): ChannelButtonState {
  if (!canAddToCart(product, channel)) return { enabled: false, reason: "channel" };
  if (channel === "pickup" && unit && !unit.pickupAvailable) return { enabled: false, reason: "unit" };
  return { enabled: true };
}

// Tope de cantidad: no pasa del máximo que el servidor calculó para esa presentación (maxAvailable). Sin máximo
// conocido (null) no se limita en el navegador: el servidor valida. Nunca baja de 1 salvo que no haya existencia (0).
export function clampToMax(quantity: number, maxAvailable: number | null): number {
  if (maxAvailable === null) return quantity;
  return Math.max(0, Math.min(quantity, maxAvailable));
}

// ¿Se puede subir la cantidad de una línea? No, si ya está en el máximo disponible que informó el servidor.
export const canIncrease = (quantity: number, maxAvailable: number | null): boolean =>
  maxAvailable === null || quantity < maxAvailable;

// ¿Hay que avisar "Solo hay N disponibles"? Cuando la cantidad llegó al máximo o lo pasó.
export const shouldWarnMax = (quantity: number, maxAvailable: number | null): boolean =>
  maxAvailable !== null && quantity >= maxAvailable;
