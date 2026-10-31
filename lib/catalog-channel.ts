// Canales del catálogo único (sin React, probado con `npm test`): "A domicilio" (cmer) y "Retiro en tienda"
// (fmcm). La disponibilidad por canal la decide el SERVIDOR (homex-api); acá solo se lee y se filtra.
import type { HierarchyNode, PickupSite, ProductAvailability, ProductSummary } from "./product-types";

export type CatalogChannel = "all" | "delivery" | "pickup";

export const CATALOG_CHANNELS: readonly CatalogChannel[] = ["all", "delivery", "pickup"];

// Cuántas tiendas se muestran antes del "+N" desplegable.
export const PICKUP_SITES_PREVIEW = 3;

// Sin `availability` (lectura de respaldo) el producto es solo A domicilio, como era hasta ahora.
export const hasDelivery = (p: Pick<ProductSummary, "availability">): boolean => p.availability?.delivery.available ?? true;
export const hasPickup = (p: Pick<ProductSummary, "availability">): boolean => p.availability?.pickup.available ?? false;
export const isPickupOnly = (p: Pick<ProductSummary, "availability">): boolean => !hasDelivery(p) && hasPickup(p);

// Fase 2: se puede agregar al carrito lo que se consigue en el canal pedido (sin canal: en cualquiera de los dos).
// Un producto solo de retiro entra al grupo de retiro; uno solo de domicilio, al de domicilio.
export function canAddToCart(p: Pick<ProductSummary, "availability">, channel?: "delivery" | "pickup"): boolean {
  if (channel === "delivery") return hasDelivery(p);
  if (channel === "pickup") return hasPickup(p);
  return hasDelivery(p) || hasPickup(p);
}

// Canal al que agrega el "+" de la tarjeta: domicilio si el producto lo tiene (también cuando está en ambos); si
// solo es de retiro, retiro. En el detalle del producto, "¿Cómo lo querés?" ofrece un botón por canal.
export const defaultAddChannel = (p: Pick<ProductSummary, "availability">): "delivery" | "pickup" =>
  hasDelivery(p) ? "delivery" : "pickup";

export function matchesChannel(p: Pick<ProductSummary, "availability">, channel: CatalogChannel): boolean {
  if (channel === "delivery") return hasDelivery(p);
  if (channel === "pickup") return hasPickup(p);
  return true;
}

// Unidad del canal solo cuando difiere de la del otro (para no repetirla).
export function differingPickupUnit(a: ProductAvailability | undefined): string | null {
  const pickup = a?.pickup.unit?.trim();
  const delivery = a?.delivery.unit?.trim();
  if (!a?.pickup.available || !pickup) return null;
  return a.delivery.available && delivery && delivery.toUpperCase() === pickup.toUpperCase() ? null : pickup;
}

// Primeras tiendas y cuántas quedan para el "+N".
export function splitSites(sites: readonly PickupSite[], preview = PICKUP_SITES_PREVIEW): { shown: PickupSite[]; hidden: PickupSite[] } {
  return { shown: sites.slice(0, preview), hidden: sites.slice(preview) };
}

// Enlace de mapa: solo http(s) (nada de javascript: ni data:). Cualquier otra cosa se descarta.
export function safeMapUrl(url: string | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

// Lo que se muestra al tocar una tienda; null si no trae ningún dato (no hay nada que desplegar).
export interface SiteDetails {
  address: string | null;
  hours: string | null;
  mapUrl: string | null;
}

export function siteDetails(site: PickupSite): SiteDetails | null {
  const details = { address: site.address?.trim() || null, hours: site.hours?.trim() || null, mapUrl: safeMapUrl(site.mapUrl) };
  return details.address || details.hours || details.mapUrl ? details : null;
}

// ---- Selección de la tienda en el detalle (por clic, toque o Enter/Espacio; nunca por hover) ----

// undefined = el usuario todavía no eligió (rige el valor por defecto); null = cerró el panel a propósito.
export type SiteChoice = string | null | undefined;

// Con UNA sola tienda con datos no hay nada que elegir: su panel va abierto por defecto. Con varias, ninguna.
export function defaultSiteId(sites: readonly PickupSite[]): string | null {
  return sites.length === 1 && siteDetails(sites[0]) ? sites[0].siteId : null;
}

// Tienda seleccionada ahora (la elección del usuario si sigue existiendo en este producto; si no, ninguna).
export function resolveSelectedSite(choice: SiteChoice, sites: readonly PickupSite[]): string | null {
  if (choice === undefined) return defaultSiteId(sites);
  return choice !== null && sites.some((s) => s.siteId === choice) ? choice : null;
}

// Tocar otra tienda cambia el panel; tocar la ya seleccionada lo cierra.
export const toggleSite = (selected: string | null, siteId: string): string | null => (selected === siteId ? null : siteId);

// Recorre las categorías (nivel con `products`) de una lista de familias/nodos.
function forEachCategory(nodes: readonly HierarchyNode[], visit: (category: HierarchyNode) => void): void {
  for (const node of nodes) {
    if (node.products) visit(node);
    else forEachCategory(node.children, visit);
  }
}

// Cuántos productos distintos hay por canal bajo estos nodos (para los chips "Todos / A domicilio / Retiro").
export function countByChannel(nodes: readonly HierarchyNode[]): Record<CatalogChannel, number> {
  const seen = new Map<string, ProductSummary>();
  forEachCategory(nodes, (category) => {
    for (const product of category.products ?? []) seen.set(product.id, product);
  });
  const counts: Record<CatalogChannel, number> = { all: 0, delivery: 0, pickup: 0 };
  for (const product of seen.values()) {
    counts.all += 1;
    if (hasDelivery(product)) counts.delivery += 1;
    if (hasPickup(product)) counts.pickup += 1;
  }
  return counts;
}

// Deja solo los productos del canal y poda lo que queda vacío (categoría, sub-familia, familia); recalcula
// itemCount con lo que queda. "all" devuelve el mismo nodo. El libro, el menú "Ir a categoría" y el PDF se
// arman SIEMPRE desde el árbol ya filtrado, así sus conteos y páginas coinciden.
export function filterNodeByChannel(node: HierarchyNode, channel: CatalogChannel): HierarchyNode | null {
  if (channel === "all") return node;

  if (node.products) {
    const products = node.products.filter((p) => matchesChannel(p, channel));
    if (products.length === 0) return null;
    const packSizes = node.packSizes?.filter((size) => products.some((p) => p.packSize === size));
    // Las sub-categorías no se usan para armar el libro y sus conteos ya no valdrían: se descartan.
    return { ...node, products, itemCount: products.length, children: [], ...(packSizes ? { packSizes } : {}) };
  }

  const children = node.children.map((child) => filterNodeByChannel(child, channel)).filter((c): c is HierarchyNode => c !== null);
  if (children.length === 0) return null;
  return { ...node, children, itemCount: children.reduce((sum, child) => sum + child.itemCount, 0) };
}

export function filterTreeByChannel(nodes: readonly HierarchyNode[], channel: CatalogChannel): HierarchyNode[] {
  if (channel === "all") return nodes as HierarchyNode[];
  return nodes.map((node) => filterNodeByChannel(node, channel)).filter((n): n is HierarchyNode => n !== null);
}

// ---- Lectura de la respuesta de mercasa-api (GET /api/catalog/items) ----

export interface UnifiedCatalogItem {
  itemId: string;
  itemName: string;
  unitId: string;
  hierarchy1: string;
  hierarchy2: string;
  hierarchy3: string;
  hierarchy4: string;
  hierarchy5: string;
  availability: ProductAvailability;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function parseAvailability(raw: unknown): ProductAvailability {
  const a = (raw ?? {}) as Record<string, unknown>;
  const d = (a.delivery ?? {}) as Record<string, unknown>;
  const p = (a.pickup ?? {}) as Record<string, unknown>;
  const sites = Array.isArray(p.sites)
    ? (p.sites as unknown[])
        .map((s) => s as Record<string, unknown>)
        .filter((s) => str(s.siteId).trim() !== "")
        .map((s): PickupSite => {
          const siteId = str(s.siteId).trim();
          const site: PickupSite = { siteId, name: str(s.name).trim() || siteId };
          // Solo los campos que vienen con contenido: una tienda a medio configurar no rompe nada.
          for (const key of ["city", "address", "hours", "mapUrl"] as const) {
            const value = str(s[key]).trim();
            if (value) site[key] = value;
          }
          // Coordenadas: solo si ambas son números válidos (el cálculo de cercanía es del navegador).
          if (typeof s.lat === "number" && Number.isFinite(s.lat) && typeof s.lng === "number" && Number.isFinite(s.lng)) {
            site.lat = s.lat;
            site.lng = s.lng;
          }
          return site;
        })
    : [];
  return {
    delivery: { available: d.available === true, unit: typeof d.unit === "string" ? d.unit : null },
    pickup: { available: p.available === true && sites.length > 0, unit: typeof p.unit === "string" ? p.unit : null, sites },
  };
}

// Valida el cuerpo; null si no tiene la forma esperada (la web cae entonces a la lectura de respaldo).
export function parseUnifiedCatalog(raw: unknown): UnifiedCatalogItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: UnifiedCatalogItem[] = [];
  for (const entry of raw) {
    const e = entry as Record<string, unknown>;
    if (!e || typeof e !== "object" || str(e.itemId).trim() === "") return null;
    const availability = parseAvailability(e.availability);
    // Un producto sin ningún canal no debería existir; si llega así no se muestra.
    if (!availability.delivery.available && !availability.pickup.available) continue;
    items.push({
      itemId: str(e.itemId).trim(),
      itemName: str(e.itemName),
      unitId: str(e.unitId),
      hierarchy1: str(e.hierarchy1),
      hierarchy2: str(e.hierarchy2),
      hierarchy3: str(e.hierarchy3),
      hierarchy4: str(e.hierarchy4),
      hierarchy5: str(e.hierarchy5),
      availability,
    });
  }
  return items;
}
