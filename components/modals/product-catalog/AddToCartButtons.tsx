"use client";

import { ShoppingCart, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { showDisabledDeliveryButton, type PrimaryAddState } from "@/lib/add-rules";
import { canAddToCart } from "@/lib/catalog-channel";
import type { CartChannel } from "@/lib/cart-types";
import type { CatalogUnit } from "@/lib/catalog-prices";
import type { ProductSummary } from "@/lib/product-types";

const RULE = "#E2E8F0";
const INK = "#082B5C";
const TEXT_SOFT = "#5C6B7D";
export const PICKUP_UNIT_NOTE_ID = "pd-pickup-unit-note";
export const PICKUP_OUT_NOTE_ID = "pd-pickup-out-note";

type Selected = Pick<CatalogUnit, "pickupAvailable" | "available"> | null;

// Aviso sobre las existencias y el botón principal (arriba de la barra de agregar): la existencia de domicilio SOLO si ya se conoce (viene
// del servidor), y el motivo por el que "Agregar a retiro" está desactivado (presentación no retirable, o la tienda elegida sin existencia
// de esa presentación). Sin nada que decir no pinta nada.
export function AddNote({
  product,
  selected,
  state,
}: {
  product: Pick<ProductSummary, "availability">;
  selected: Selected;
  state: PrimaryAddState | null;
}) {
  const tCart = useTranslations("Cart");
  const deliverable = canAddToCart(product, "delivery");
  // Solo "Disponible a domicilio" / "Sin existencia a domicilio": nunca la cantidad. La existencia de retiro depende de la tienda.
  const knownStock = deliverable && selected ? Math.max(0, Math.floor(selected.available)) : null;
  const pickupReason = state && !state.enabled && state.channel === "pickup" ? state.reason : null;
  const unitNote = pickupReason === "unit";
  const outNote = pickupReason === "out";
  if (knownStock === null && !unitNote && !outNote) return null;

  return (
    <div className="shrink-0 border-t bg-white px-5 pb-0 pt-2.5 text-[12.5px] leading-snug sm:px-6" style={{ borderColor: RULE, color: TEXT_SOFT }}>
      {knownStock !== null && <p aria-live="polite">{tCart("stockKnownDelivery", { count: knownStock })}</p>}
      {unitNote && (
        <p id={PICKUP_UNIT_NOTE_ID} className="font-medium" style={{ color: "#8A5A00" }}>
          {tCart("pickupUnitUnavailable")}
        </p>
      )}
      {outNote && (
        <p id={PICKUP_OUT_NOTE_ID} className="font-medium" style={{ color: "#8A5A00" }}>
          {tCart("pickupOutForUnit")}
        </p>
      )}
    </div>
  );
}

const BASE =
  "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-[14.5px] font-semibold leading-tight outline-none transition focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BASE} min-h-[46px] bg-corp-blue text-white hover:opacity-90`;
const GHOST_DISABLED =
  "flex min-w-0 items-center justify-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[13px] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-50";

// UN solo botón principal: sin tienda elegida "Agregar a domicilio" (o "Agregar al carrito" si el producto solo se entrega); con tienda
// elegida "Agregar a retiro en <tienda>", y debajo el de domicilio deshabilitado con "Quitar tienda" para volver a domicilio. Un producto
// solo de retiro agrega a retiro (la tienda es opcional). Si no se puede agregar, queda desactivado y la nota de arriba dice por qué.
export function AddButtons({
  product,
  state,
  site,
  justAdded,
  onAdd,
  onClearSite,
}: {
  product: Pick<ProductSummary, "availability">;
  state: PrimaryAddState | null;
  // Tienda de retiro elegida (nombre para el botón), o null.
  site: { id: string; name: string } | null;
  justAdded: CartChannel | null;
  onAdd: () => void;
  onClearSite: () => void;
}) {
  const tCart = useTranslations("Cart");
  if (!state) return null;

  const pickupable = canAddToCart(product, "pickup");
  const label =
    justAdded === state.channel
      ? tCart("addedConfirmation")
      : state.channel === "pickup"
        ? site
          ? tCart("addToPickupAt", { store: site.name })
          : tCart("addToPickupCta")
        : pickupable
          ? tCart("addToDeliveryCta")
          : tCart("addToCartCta");
  const describedBy =
    !state.enabled && state.channel === "pickup" ? (state.reason === "unit" ? PICKUP_UNIT_NOTE_ID : state.reason === "out" ? PICKUP_OUT_NOTE_ID : undefined) : undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <button type="button" onClick={onAdd} disabled={!state.enabled} aria-describedby={describedBy} className={PRIMARY}>
        {state.channel === "pickup" ? (
          <Store className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        )}
        <span className="min-w-0">{label}</span>
      </button>

      {showDisabledDeliveryButton(product, site?.id ?? null) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <button type="button" disabled className={GHOST_DISABLED} style={{ borderColor: RULE, color: INK }}>
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {tCart("addToDeliveryCta")}
          </button>
          <button
            type="button"
            onClick={onClearSite}
            className="inline-flex items-center gap-1 rounded px-1 py-1 text-[13px] font-semibold underline underline-offset-4 outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
            style={{ color: "#075FD8" }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            {tCart("clearStore")}
          </button>
        </div>
      )}
    </div>
  );
}
