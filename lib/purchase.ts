// Fuente única de la compra en el modal de producto: presentación -> canal (domicilio | retiro) -> tienda. Sin React ni imports en tiempo de
// ejecución (se prueba con `npm test`). Todo se deriva de lo que informa el servidor para la presentación elegida (existencia por canal y por
// tienda, SIN cantidades exactas); el carrito recibe de aquí lo que se agrega (presentación, canal y tienda) y la tienda elegida es la misma
// del grupo de retiro del carrito.
import type { CatalogUnit } from "./catalog-prices";
import type { PickupSite, ProductSummary } from "./product-types";

export type PurchaseChannel = "delivery" | "pickup";
export type StockStatus = "available" | "low" | "out";

type ProductLike = Pick<ProductSummary, "availability">;
type UnitLike = Pick<CatalogUnit, "unitId" | "isDefault" | "pickupAvailable" | "pickupBySite" | "available" | "deliveryStatus">;

export const MAX_QUANTITY = 9999;

export interface Selection {
  unitId: string | null;
  channel: PurchaseChannel | null;
  siteId: string | null;
}

// Aviso al deseleccionar algo por un cambio de presentación (o porque llegó la existencia): se muestra en un área viva.
export type Notice = "store_cleared" | "channel_changed" | null;

const sitesOf = (product: ProductLike): PickupSite[] => product.availability?.pickup.sites ?? [];
const sold = (product: ProductLike, channel: PurchaseChannel): boolean =>
  channel === "delivery" ? (product.availability?.delivery.available ?? true) : (product.availability?.pickup.available ?? false);

const sameId = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

// Existencia a domicilio de la presentación: la que informa el servidor; sin ella (servidor anterior), por la cantidad. null = no se sabe
// (sin presentación: sin sesión).
export function deliveryStatusOf(unit: Pick<UnitLike, "deliveryStatus" | "available"> | null): StockStatus | null {
  if (!unit) return null;
  if (unit.deliveryStatus) return unit.deliveryStatus;
  return Number.isFinite(unit.available) && unit.available < 1 ? "out" : "available";
}

// Existencia de una tienda en la presentación; null = el servidor no lo informó (sin sesión o no se pudo leer).
export function storeStatusOf(unit: Pick<UnitLike, "pickupBySite"> | null, siteId: string): StockStatus | null {
  return unit?.pickupBySite?.find((s) => sameId(s.siteId, siteId))?.status ?? null;
}

export type DisabledReason = "delivery_out" | "pickup_unit" | "pickup_out";

export interface ChannelOption {
  channel: PurchaseChannel;
  enabled: boolean;
  // Domicilio: existencia de la presentación (null = no se sabe). Retiro: sin estado propio, cuenta `stores`.
  status: StockStatus | null;
  // Retiro: cuántas tiendas tienen esta presentación (las que el servidor no informó cuentan como con existencia); null en domicilio.
  stores: number | null;
  // Por qué está deshabilitada (null si está habilitada).
  reason: DisabledReason | null;
}

// Opciones de "¿Cómo lo querés?" para la presentación elegida. Un canal que el producto NO tiene no aparece. Un canal sin existencia aparece
// deshabilitado con su motivo.
export function channelOptions(product: ProductLike, unit: UnitLike | null): ChannelOption[] {
  const options: ChannelOption[] = [];

  if (sold(product, "delivery")) {
    const status = deliveryStatusOf(unit);
    options.push({ channel: "delivery", enabled: status !== "out", status, stores: null, reason: status === "out" ? "delivery_out" : null });
  }

  const sites = sitesOf(product);
  if (sold(product, "pickup") && sites.length > 0) {
    if (unit && !unit.pickupAvailable) {
      options.push({ channel: "pickup", enabled: false, status: null, stores: 0, reason: "pickup_unit" });
    } else {
      const withStock = sites.filter((s) => storeStatusOf(unit, s.siteId) !== "out").length;
      const enabled = withStock > 0;
      options.push({ channel: "pickup", enabled, status: null, stores: withStock, reason: enabled ? null : "pickup_out" });
    }
  }

  return options;
}

function unitOf(units: ReadonlyArray<UnitLike> | null, unitId: string | null): UnitLike | null {
  if (!units || units.length === 0) return null;
  return units.find((u) => unitId !== null && u.unitId === unitId) ?? units.find((u) => u.isDefault) ?? units[0];
}

// Deja la selección VÁLIDA para la presentación: el canal debe estar habilitado (si no, pasa al otro habilitado, con aviso) y la tienda debe
// existir y tener la presentación (si no, se deselecciona, con aviso). Sin tienda ni canal elegido el canal es el primero habilitado.
export function normalize(
  product: ProductLike,
  units: ReadonlyArray<UnitLike> | null,
  selection: Selection
): { selection: Selection; notice: Notice } {
  const unit = unitOf(units, selection.unitId);
  const options = channelOptions(product, unit);
  let notice: Notice = null;

  let channel = selection.channel;
  if (!channel || !options.some((o) => o.channel === channel && o.enabled)) {
    const next = options.find((o) => o.enabled)?.channel ?? null;
    if (channel && next !== channel && next) notice = "channel_changed";
    channel = next;
  }

  let siteId = channel === "pickup" ? selection.siteId : null;
  if (siteId) {
    const site = sitesOf(product).find((s) => sameId(s.siteId, siteId as string));
    if (!site || storeStatusOf(unit, site.siteId) === "out") {
      siteId = null;
      notice = "store_cleared";
    } else {
      siteId = site.siteId;
    }
  }

  return { selection: { unitId: unit?.unitId ?? selection.unitId, channel, siteId }, notice };
}

// Cambia la presentación y lo recalcula todo.
export function selectUnit(product: ProductLike, units: ReadonlyArray<UnitLike> | null, selection: Selection, unitId: string) {
  return normalize(product, units, { ...selection, unitId });
}

// Elige el canal (solo si está habilitado). Al pasar a retiro propone la tienda del carrito si es una de las que tienen la presentación: es
// la misma tienda del grupo de retiro del carrito.
export function selectChannel(
  product: ProductLike,
  units: ReadonlyArray<UnitLike> | null,
  selection: Selection,
  channel: PurchaseChannel,
  cartSiteId: string | null = null
): Selection {
  const unit = unitOf(units, selection.unitId);
  if (!channelOptions(product, unit).some((o) => o.channel === channel && o.enabled)) return normalize(product, units, selection).selection;
  const next = { ...selection, channel, siteId: channel === "pickup" ? selection.siteId ?? cartSiteId : null };
  return normalize(product, units, next).selection;
}

export function selectSite(product: ProductLike, units: ReadonlyArray<UnitLike> | null, selection: Selection, siteId: string): Selection {
  return normalize(product, units, { ...selection, channel: "pickup", siteId }).selection;
}

// Tope de la cantidad. A domicilio, la existencia convertida de la presentación (el navegador solo la usa para limitar, nunca la muestra).
// En retiro el servidor solo informa el estado: sin existencia en la tienda elegida no se puede pedir nada; en cualquier otro caso no hay un
// tope que se pueda saber y valida el servidor. Sin canal elegido: 0.
export function maxQuantity(product: ProductLike, units: ReadonlyArray<UnitLike> | null, selection: Selection): number {
  const { selection: s } = normalize(product, units, selection);
  const unit = unitOf(units, s.unitId);
  if (!s.channel) return 0;
  if (s.channel === "delivery") {
    if (!unit || !Number.isFinite(unit.available)) return MAX_QUANTITY;
    return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(unit.available)));
  }
  return s.siteId && storeStatusOf(unit, s.siteId) === "out" ? 0 : MAX_QUANTITY;
}

export type AddTarget =
  | { ok: true; channel: PurchaseChannel; unitId: string | undefined; siteId: string | null }
  // channel = no hay canal con existencia; store = falta elegir la tienda de retiro.
  | { ok: false; reason: "channel" | "store" };

// Lo que se agrega al carrito. La presentación por defecto no se guarda (así una misma presentación nunca queda en dos líneas).
export function addTarget(product: ProductLike, units: ReadonlyArray<UnitLike> | null, selection: Selection): AddTarget {
  const { selection: s } = normalize(product, units, selection);
  if (!s.channel) return { ok: false, reason: "channel" };
  if (s.channel === "pickup" && !s.siteId) return { ok: false, reason: "store" };
  const unit = unitOf(units, s.unitId);
  return { ok: true, channel: s.channel, unitId: unit && !unit.isDefault ? unit.unitId : undefined, siteId: s.siteId };
}
