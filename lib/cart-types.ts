import type { ProductSummary } from "./product-types";

export interface CartItem extends ProductSummary {
  quantity: number;
}
