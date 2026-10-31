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

export type PlusDecision =
  | { action: "add-delivery" }
  // Agrega la presentación por defecto al retiro de la tienda que ya tiene el carrito.
  | { action: "add-pickup"; siteId: string }
  // step "pickup": el modal abre en el paso de retiro (con la tienda del carrito si la hay).
  | { action: "open-detail"; step: "pickup" | null };

type PlusUnit = Pick<CatalogUnit, "isDefault" | "pickupAvailable" | "pickupBySite">;

const sameSite = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

// ¿El producto tiene existencia en la tienda del carrito en su presentación por defecto? Con las presentaciones conocidas, la por defecto debe
// ser retirable y la tienda no puede estar "out" para ella. Sin presentaciones (sin sesión, o un producto solo de retiro, que el servidor no
// presenta) solo se sabe que la tienda está entre las que tienen el producto.
function hasStockAtSite(product: Pick<ProductSummary, "availability">, units: ReadonlyArray<PlusUnit> | null, siteId: string): boolean {
  const sites = product.availability?.pickup.sites ?? [];
  if (!sites.some((s) => sameSite(s.siteId, siteId))) return false;
  if (!units || units.length === 0) return true;
  const unit = units.find((u) => u.isDefault) ?? units[0];
  if (!unit.pickupAvailable) return false;
  return unit.pickupBySite?.find((s) => sameSite(s.siteId, siteId))?.status !== "out";
}

// Regla del "+" de la tarjeta con la tienda del carrito (`cartSiteId`: la tienda de retiro del carrito, o null si no hay):
//   - solo domicilio: igual que siempre (plusAction);
//   - con retiro: si el carrito ya tiene tienda y el producto tiene existencia allí en su presentación por defecto, se agrega directo al retiro
//     de esa tienda; si no hay tienda, o no hay existencia, se abre el modal en el paso de retiro (nunca se agrega al retiro sin tienda).
export function plusDecision(product: Pick<ProductSummary, "availability">, units: ReadonlyArray<PlusUnit> | null, cartSiteId: string | null): PlusDecision {
  const delivery = canAddToCart(product, "delivery");
  const pickup = canAddToCart(product, "pickup");
  if (!delivery && !pickup) return { action: "open-detail", step: null };
  if (!pickup) {
    return plusAction(product, units ? units.length : null) === "add-delivery" ? { action: "add-delivery" } : { action: "open-detail", step: null };
  }
  if (cartSiteId && hasStockAtSite(product, units, cartSiteId)) return { action: "add-pickup", siteId: cartSiteId };
  return { action: "open-detail", step: "pickup" };
}

// ¿Hace falta saber las presentaciones antes de decidir el "+"? Solo con un canal y sesión (con los dos canales ya
// se sabe que abre el modal).
export const needsUnitsForPlus = (product: Pick<ProductSummary, "availability">, cartSiteId: string | null = null): boolean =>
  canAddToCart(product, "delivery") !== canAddToCart(product, "pickup") || (canAddToCart(product, "pickup") && !!cartSiteId);

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
