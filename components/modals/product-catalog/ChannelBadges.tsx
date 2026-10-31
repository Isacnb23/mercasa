"use client";

import { Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
import { CATALOG_CHANNELS, hasDelivery, hasPickup, type CatalogChannel } from "@/lib/catalog-channel";

// "A domicilio" (camión, azul) y "Retiro en tienda" (tienda, dorado). Siempre con TEXTO además del color e
// ícono (accesible). Los colores de texto cumplen contraste AA sobre su fondo.
const DELIVERY = { fg: "#0B4FB0", bg: "#E6F1FB", border: "#BFD8F5" };
const PICKUP = { fg: "#7A5300", bg: "#FFF3CF", border: "#EBCB6B" };
const INK = "#082B5C";
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";

// Etiquetas chicas de la tarjeta del listado: las dos si aplica. Un producto sin `availability` (lectura de
// respaldo) es solo A domicilio.
export function ChannelBadges({
  product,
  omitPickup = false,
}: {
  product: Pick<ProductSummary, "availability">;
  /** true cuando la línea "En tienda ₡X" ya hace de etiqueta del canal de retiro (ahorra una fila de alto). */
  omitPickup?: boolean;
}) {
  const t = useTranslations("Products.catalog");
  const delivery = hasDelivery(product);
  const pickup = hasPickup(product) && !omitPickup;
  if (!delivery && !pickup) return null;

  // Con ícono Y texto (no dependen solo del color). Un poco más grandes que antes y con aire respecto al borde.
  // Tamaño y aire en CSS (.pc-badge) para poder compactarlos en pantallas bajas sin perder la rejilla 3×3.
  const badge = "pc-badge inline-flex items-center gap-[3px] rounded-full border font-semibold leading-none";
  const size = {};

  return (
    <span className="pc-badges flex flex-wrap items-center justify-center gap-x-1 gap-y-[2px]">
      {delivery && (
        <span className={badge} style={{ ...size, color: DELIVERY.fg, background: DELIVERY.bg, borderColor: DELIVERY.border }}>
          <Truck className="h-[10px] w-[10px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t("channelDelivery")}
        </span>
      )}
      {pickup && (
        <span className={badge} style={{ ...size, color: PICKUP.fg, background: PICKUP.bg, borderColor: PICKUP.border }}>
          <Store className="h-[10px] w-[10px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t("channelPickup")}
        </span>
      )}
    </span>
  );
}

// Chips "Todos / A domicilio / Retiro en tienda" arriba del catálogo, con cuántos productos hay en cada uno
// (los de conteo 0 se desactivan, salvo el seleccionado).
export function ChannelFilterBar({
  value,
  counts,
  onChange,
  disabled,
  inline = false,
}: {
  value: CatalogChannel;
  counts: Record<CatalogChannel, number>;
  onChange: (channel: CatalogChannel) => void;
  disabled?: boolean;
  /** En línea (dentro del encabezado, sin barra propia): no resta alto a la hoja del libro. */
  inline?: boolean;
}) {
  const t = useTranslations("Products.catalog");

  const label = (channel: CatalogChannel) =>
    channel === "delivery" ? t("channelDelivery") : channel === "pickup" ? t("channelPickup") : t("channelAll");
  const Icon = (channel: CatalogChannel) => (channel === "delivery" ? Truck : channel === "pickup" ? Store : null);

  return (
    <div
      className={inline ? "flex flex-wrap items-center gap-1.5" : "flex shrink-0 flex-wrap items-center gap-2 px-5 py-2 sm:px-8"}
      style={inline ? undefined : { borderBottom: `1px solid ${RULE}`, background: "#FFFFFF" }}
    >
      {!inline && (
        <span className="text-[11.5px] font-semibold" style={{ color: TEXT_SOFT }}>
          {t("channelFilterLabel")}
        </span>
      )}
      <div role="radiogroup" aria-label={t("channelFilterLabel")} className="flex flex-wrap items-center gap-1.5">
        {CATALOG_CHANNELS.map((channel) => {
          const selected = value === channel;
          const ChannelIcon = Icon(channel);
          const palette = channel === "pickup" ? PICKUP : DELIVERY;
          return (
            <button
              key={channel}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || (!selected && counts[channel] === 0)}
              onClick={() => onChange(channel)}
              className={`inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#075FD8] disabled:cursor-not-allowed disabled:opacity-40 ${inline ? "px-2.5 py-[3px] text-[11.5px]" : "px-3 py-1 text-[12.5px]"}`}
              style={
                selected
                  ? { color: channel === "all" ? "#FFFFFF" : palette.fg, background: channel === "all" ? INK : palette.bg, borderColor: channel === "all" ? INK : palette.fg }
                  : { color: INK, background: "#FFFFFF", borderColor: RULE }
              }
            >
              {ChannelIcon && <ChannelIcon className={`h-3.5 w-3.5 ${inline ? "hidden sm:block" : ""}`} strokeWidth={2} aria-hidden />}
              {label(channel)}
              <span className={`tabular-nums opacity-70 ${inline ? "hidden sm:inline" : ""}`}>{counts[channel]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
