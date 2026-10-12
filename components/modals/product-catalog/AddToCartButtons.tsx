"use client";

import { ShoppingCart, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { channelButtonState } from "@/lib/add-rules";
import { canAddToCart } from "@/lib/catalog-channel";
import type { CartChannel } from "@/lib/cart-types";
import type { CatalogUnit } from "@/lib/catalog-prices";
import type { ProductSummary } from "@/lib/product-types";

const RULE = "#E2E8F0";
const TEXT_SOFT = "#5C6B7D";
export const PICKUP_UNIT_NOTE_ID = "pd-pickup-unit-note";

type Selected = Pick<CatalogUnit, "pickupAvailable" | "available"> | null;

// Aviso sobre las existencias y el retiro de la presentación elegida (arriba de la barra de agregar): la existencia de
// domicilio SOLO si ya se conoce (viene del servidor), y el motivo por el que "Agregar a retiro en tienda" está
// desactivado. Sin nada que decir no pinta nada.
export function AddNote({ product, selected }: { product: Pick<ProductSummary, "availability">; selected: Selected }) {
  const tCart = useTranslations("Cart");
  const deliverable = canAddToCart(product, "delivery");
  const pickup = channelButtonState(product, "pickup", selected);
  const pickupUnitNote = canAddToCart(product, "pickup") && !pickup.enabled && pickup.reason === "unit";
  // La existencia de retiro depende de la tienda: se ve en el carrito, no se inventa aquí.
  const knownStock = deliverable && selected ? Math.max(0, Math.floor(selected.available)) : null;
  if (knownStock === null && !pickupUnitNote) return null;

  return (
    <div className="shrink-0 border-t bg-white px-5 pb-0 pt-2.5 text-[12.5px] leading-snug sm:px-6" style={{ borderColor: RULE, color: TEXT_SOFT }}>
      {knownStock !== null && <p aria-live="polite">{tCart("stockKnownDelivery", { count: knownStock })}</p>}
      {pickupUnitNote && (
        <p id={PICKUP_UNIT_NOTE_ID} className="font-medium" style={{ color: "#8A5A00" }}>
          {tCart("pickupUnitUnavailable")}
        </p>
      )}
    </div>
  );
}

const BASE = "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14.5px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BASE} bg-corp-blue text-white hover:opacity-90`;
const SECONDARY = `${BASE} border bg-white hover:bg-[#FFF3CF]`;

// Un botón de agregar por canal ("Agregar a domicilio" / "Agregar a retiro en tienda"), cada uno habilitado solo si la
// presentación elegida está disponible en ese canal; si no, queda desactivado y la nota de arriba dice por qué.
export function ChannelButtons({
  product,
  selected,
  justAdded,
  onAdd,
}: {
  product: Pick<ProductSummary, "availability">;
  selected: Selected;
  justAdded: CartChannel | null;
  onAdd: (channel: CartChannel) => void;
}) {
  const tCart = useTranslations("Cart");
  const deliverable = canAddToCart(product, "delivery");
  const pickupable = canAddToCart(product, "pickup");
  const delivery = channelButtonState(product, "delivery", selected);
  const pickup = channelButtonState(product, "pickup", selected);

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
      {deliverable && (
        <button type="button" onClick={() => onAdd("delivery")} disabled={!delivery.enabled} className={PRIMARY}>
          <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
          {justAdded === "delivery" ? tCart("addedConfirmation") : pickupable ? tCart("addToDeliveryCta") : tCart("addToCartCta")}
        </button>
      )}
      {pickupable && (
        <button
          type="button"
          onClick={() => onAdd("pickup")}
          disabled={!pickup.enabled}
          aria-describedby={!pickup.enabled && pickup.reason === "unit" ? PICKUP_UNIT_NOTE_ID : undefined}
          className={deliverable ? SECONDARY : PRIMARY}
          style={deliverable ? { borderColor: "#EBCB6B", color: "#7A5300" } : undefined}
        >
          <Store className="h-4 w-4" strokeWidth={2} aria-hidden />
          {justAdded === "pickup" ? tCart("addedConfirmation") : tCart("addToPickupCta")}
        </button>
      )}
    </div>
  );
}
