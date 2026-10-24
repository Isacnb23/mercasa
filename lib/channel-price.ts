// Precio por canal en el catálogo (sin React, probado con `npm test`): qué ítems piden precio y cómo se escribe
// el precio de "Retiro en tienda" junto al de "A domicilio". Cada canal con SU precio: nunca se mezclan.
import type { PickupPriceView } from "./catalog-prices";
import type { ProductSummary } from "./product-types";

// Un producto pide precio si se consigue por algún canal (domicilio o retiro). Antes los solo-retiro se
// excluían y no mostraban precio; el "+" y el carrito siguen siendo solo para domicilio (canAddToCart).
// (Misma lectura que hasDelivery/hasPickup de catalog-channel.ts, escrita aquí para que este módulo no tenga
// imports en tiempo de ejecución y se pueda probar con `npm test`: sin availability = solo domicilio.)
export const needsPrice = (p: Pick<ProductSummary, "availability">): boolean =>
  (p.availability?.delivery.available ?? true) || (p.availability?.pickup.available ?? false);

interface PageLike {
  kind: string;
  products?: readonly Pick<ProductSummary, "id" | "availability">[];
}

// Ids de las páginas del spread actual y las vecinas (precarga de la siguiente), sin repetir.
export function collectVisiblePriceIds(pages: readonly PageLike[], currentPage: number): string[] {
  const ids: string[] = [];
  for (let i = Math.max(0, currentPage - 1); i <= currentPage + 2 && i < pages.length; i++) {
    const page = pages[i];
    if (page.kind !== "category") continue;
    for (const product of page.products ?? []) if (needsPrice(product)) ids.push(product.id);
  }
  return ids;
}

export interface PickupPriceLabels {
  /** "{price} IVA incluido" */
  vatIncluded: (price: string) => string;
  /** "Desde {price} IVA incluido" */
  fromVatIncluded: (price: string) => string;
  /** "En tienda {price}" */
  inStore: (price: string) => string;
  /** "En tienda desde {price}" */
  inStoreFrom: (price: string) => string;
}

// Texto del precio de retiro:
//   - "primary": el ítem solo se retira en tienda; una línea con su precio total ("₡X IVA incluido" / "Desde ₡X
//     IVA incluido").
//   - "secondary": el ítem está en los dos canales; el de domicilio es el principal y este va aparte, breve
//     ("En tienda ₡X" / "En tienda desde ₡X").
// null cuando no hay precio que mostrar (sin sesión o cargando o "Consultar": lo resuelve quien dibuja).
export function pickupPriceText(
  view: PickupPriceView,
  role: "primary" | "secondary",
  labels: PickupPriceLabels,
  format: (amount: number) => string,
): string | null {
  if (view.kind !== "price") return null;
  const price = format(view.total);
  if (role === "primary") return view.varies ? labels.fromVatIncluded(price) : labels.vatIncluded(price);
  return view.varies ? labels.inStoreFrom(price) : labels.inStore(price);
}

// Precio total (con IVA) de una tienda puntual en el desplegable del modal; si no hay precio por tienda (precio
// único), el de siempre.
export function sitePrice(view: PickupPriceView, siteId: string): number | null {
  if (view.kind !== "price") return null;
  if (!view.varies) return view.total;
  return view.bySite.find((s) => s.siteId.toUpperCase() === siteId.toUpperCase())?.total ?? null;
}
