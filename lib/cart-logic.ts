// Lógica pura del carrito (sin React): una línea por (ítem, presentación, canal). Se prueba con `npm test`.
import type { ProductSummary } from "./product-types";
import type { CartChannel, CartItem } from "./cart-types";

const MAX_QUANTITY = 9999;

// Versión del almacenamiento. v1 era un arreglo de líneas sin canal; v2 guarda { version, items, pickupSiteId }.
export const CART_STORAGE_KEY = "mercasa-cart-v2";
export const LEGACY_CART_STORAGE_KEY = "mercasa-cart-v1";

export const normalizeChannel = (channel: unknown): CartChannel => (channel === "pickup" ? "pickup" : "delivery");

// Identidad de una línea del carrito: el mismo ítem en dos presentaciones o en dos canales son dos líneas.
export function cartLineKey(id: string, unitId?: string | null, channel: CartChannel = "delivery"): string {
  return `${id.trim().toUpperCase()}|${(unitId ?? "").trim().toUpperCase()}|${channel.toUpperCase()}`;
}

const sameLine = (item: CartItem, id: string, unitId?: string | null, channel: CartChannel = "delivery") =>
  cartLineKey(item.id, item.unitId, item.channel) === cartLineKey(id, unitId, channel);

const cleanUnit = (unitId?: string | null): string | undefined => {
  const trimmed = (unitId ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
};

const pickupSitesOf = (product: ProductSummary): string[] =>
  (product.availability?.pickup.sites ?? []).map((s) => s.siteId.trim()).filter((s) => s !== "");

export function addToCart(
  items: CartItem[],
  product: ProductSummary,
  quantity = 1,
  unitId?: string | null,
  channel: CartChannel = "delivery"
): CartItem[] {
  const unit = cleanUnit(unitId);
  const existing = items.find((item) => sameLine(item, product.id, unit, channel));
  if (existing) {
    return items.map((item) =>
      item === existing ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) } : item
    );
  }
  const sites = channel === "pickup" ? pickupSitesOf(product) : [];
  return [
    ...items,
    {
      ...product,
      quantity: Math.min(MAX_QUANTITY, quantity),
      channel,
      ...(unit ? { unitId: unit } : {}),
      ...(sites.length > 0 ? { pickupSiteIds: sites } : {}),
    },
  ];
}

export function removeLine(items: CartItem[], id: string, unitId?: string | null, channel: CartChannel = "delivery"): CartItem[] {
  return items.filter((item) => !sameLine(item, id, unitId, channel));
}

export function setLineQuantity(
  items: CartItem[],
  id: string,
  quantity: number,
  unitId?: string | null,
  channel: CartChannel = "delivery"
): CartItem[] {
  if (quantity < 1) return removeLine(items, id, unitId, channel);
  return items.map((item) =>
    sameLine(item, id, unitId, channel) ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) } : item
  );
}

// Cambia la presentación de una línea. Si ya hay otra línea del mismo ítem y canal con la presentación destino,
// las cantidades se suman en ella; si no, la línea conserva su posición con la nueva presentación.
export function changeLineUnit(
  items: CartItem[],
  id: string,
  fromUnitId: string | null | undefined,
  toUnitId: string | null | undefined,
  channel: CartChannel = "delivery"
): CartItem[] {
  const to = cleanUnit(toUnitId);
  if (cartLineKey(id, fromUnitId, channel) === cartLineKey(id, to, channel)) return items;
  const source = items.find((item) => sameLine(item, id, fromUnitId, channel));
  if (!source) return items;

  const target = items.find((item) => sameLine(item, id, to, channel));
  if (target) {
    return items
      .filter((item) => item !== source)
      .map((item) => (item === target ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + source.quantity) } : item));
  }

  return items.map((item) => {
    if (item !== source) return item;
    const { unitId: _previous, ...rest } = item; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, ...(to ? { unitId: to } : {}) };
  });
}

export const itemsInChannel = (items: readonly CartItem[], channel: CartChannel): CartItem[] =>
  items.filter((item) => item.channel === channel);

export const countInChannel = (items: readonly CartItem[], channel: CartChannel): number =>
  items.reduce((sum, item) => (item.channel === channel ? sum + item.quantity : sum), 0);

// Tienda de retiro a usar: la elegida por el cliente o, sin elección, una donde haya existencia de TODOS los
// productos de retiro del carrito (según lo que se sabía al agregarlos) y, si no hay, la primera conocida. Sin
// líneas de retiro: null. El servidor valida la existencia real de la tienda.
export function resolvePickupSite(items: readonly CartItem[], chosen: string | null): string | null {
  const pickup = itemsInChannel(items, "pickup");
  if (pickup.length === 0) return null;
  if (chosen) return chosen;

  const lists = pickup.map((item) => item.pickupSiteIds ?? []);
  const known = lists.filter((list) => list.length > 0);
  if (known.length === 0) return null;
  const common = known[0].filter((site) => known.every((list) => list.includes(site)));
  return common[0] ?? known[0][0];
}

// Lee un arreglo de líneas guardado (v1 o la lista de v2). Las líneas viejas no tienen canal: pasan a domicilio sin
// perderse. Se descarta lo que no tenga la forma esperada y se unen las líneas repetidas.
export function parseStoredCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  let items: CartItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.trim() === "" || typeof e.name !== "string") continue;
    if (typeof e.quantity !== "number" || !Number.isSafeInteger(e.quantity) || e.quantity < 1) continue;
    const unit = typeof e.unitId === "string" ? cleanUnit(e.unitId) : undefined;
    const channel = normalizeChannel(e.channel);
    const sites = Array.isArray(e.pickupSiteIds)
      ? e.pickupSiteIds.filter((s): s is string => typeof s === "string" && s.trim() !== "")
      : [];
    const product: ProductSummary = {
      id: e.id,
      name: e.name,
      ...(typeof e.packSize === "string" ? { packSize: e.packSize } : {}),
      // Solo para proponer tienda: la forma mínima que lee pickupSitesOf.
      ...(channel === "pickup" && sites.length > 0
        ? {
            availability: {
              delivery: { available: false },
              pickup: { available: true, sites: sites.map((siteId) => ({ siteId, name: siteId })) },
            },
          }
        : {}),
    };
    items = addToCart(items, product, e.quantity, unit, channel);
  }
  // El producto mínimo no debe quedar en la línea (solo `pickupSiteIds`).
  return items.map(({ availability: _availability, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
}

export interface StoredCartState {
  items: CartItem[];
  pickupSiteId: string | null;
}

// Estado guardado: v2 ({ version: 2, items, pickupSiteId }) o, si no hay, el arreglo v1 migrado.
export function readStoredCart(v2: unknown, v1: unknown): StoredCartState {
  if (typeof v2 === "object" && v2 !== null && !Array.isArray(v2)) {
    const record = v2 as Record<string, unknown>;
    return {
      items: parseStoredCart(record.items),
      pickupSiteId: typeof record.pickupSiteId === "string" && record.pickupSiteId.trim() !== "" ? record.pickupSiteId.trim() : null,
    };
  }
  return { items: parseStoredCart(v1), pickupSiteId: null };
}

// owner = hash de la cuenta dueña del carrito (ver account-state.ts); null/ausente = carrito de visitante. Se guarda
// solo cuando hay dueño, así los carritos anteriores (sin la clave) siguen siendo válidos y se tratan como de visitante.
export function serializeCart(items: CartItem[], pickupSiteId: string | null, owner: string | null = null) {
  return { version: 2, items, pickupSiteId, ...(owner ? { owner } : {}) };
}

// Dueño guardado junto al carrito v2; null si no hay o no tiene la forma de un hash (migración tolerante).
export function readStoredOwner(v2: unknown): string | null {
  if (typeof v2 !== "object" || v2 === null || Array.isArray(v2)) return null;
  const owner = (v2 as Record<string, unknown>).owner;
  return typeof owner === "string" && /^[0-9a-f]{64}$/.test(owner) ? owner : null;
}

// Lee el carrito guardado de un Storage (v2; si no hay, migra v1 sin borrarlo). Devuelve null si el almacenamiento no
// está disponible o trae JSON inválido: quien llama sigue con el carrito vacío en memoria.
export function loadPersistedOwner(storage: Pick<Storage, "getItem">): string | null {
  try {
    const v2 = storage.getItem(CART_STORAGE_KEY);
    return v2 ? readStoredOwner(JSON.parse(v2)) : null;
  } catch {
    return null;
  }
}

export function loadPersistedCart(storage: Pick<Storage, "getItem">): StoredCartState | null {
  try {
    const v2 = storage.getItem(CART_STORAGE_KEY);
    const v1 = v2 ? null : storage.getItem(LEGACY_CART_STORAGE_KEY);
    return readStoredCart(v2 ? JSON.parse(v2) : null, v1 ? JSON.parse(v1) : null);
  } catch {
    return null;
  }
}
