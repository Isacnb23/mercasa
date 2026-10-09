import type { ProductSummary } from "./product-types";

export interface CartItem extends ProductSummary {
  quantity: number;
  // Presentación elegida (por ejemplo "CAJA"). Ausente = la presentación por defecto (la que muestra el
  // listado). Solo se guarda cuando es DISTINTA de la por defecto, así una misma presentación nunca queda en
  // dos líneas (una con unidad y otra sin ella). No es un precio ni una conversión: el servidor valida que
  // exista para ese ítem y calcula todo.
  unitId?: string;
}

