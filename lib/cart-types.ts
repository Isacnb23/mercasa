import type { ProductSummary } from "./product-types";

// Canal de una línea del carrito: "Envío a domicilio" (cmer) o "Retiro en tienda" (fmcm). Los carritos guardados
// antes de la fase 2 no tienen canal: pasan a domicilio.
export type CartChannel = "delivery" | "pickup";

export interface CartItem extends ProductSummary {
  quantity: number;
  // Presentación elegida (por ejemplo "CAJA"). Ausente = la presentación por defecto (la que muestra el
  // listado). Solo se guarda cuando es DISTINTA de la por defecto, así una misma presentación nunca queda en
  // dos líneas (una con unidad y otra sin ella). No es un precio ni una conversión: el servidor valida que
  // exista para ese ítem y calcula todo.
  unitId?: string;
  // Una línea por (producto, presentación, canal). El mismo producto en los dos canales son dos líneas.
  channel: CartChannel;
  // Solo líneas de retiro: códigos de las tiendas donde había existencia al agregarlo. Solo sirve para proponer
  // una tienda por defecto; la existencia real la valida el servidor.
  pickupSiteIds?: string[];
}
