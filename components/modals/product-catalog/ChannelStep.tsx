"use client";

import { useId } from "react";
import { Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChannelOption, DisabledReason, Notice, PurchaseChannel, StockStatus } from "@/lib/purchase";

const INK = "#082B5C";
const MUTED = "#8493A5";
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const DELIVERY = { fg: "#0B4FB0", bg: "#E6F1FB" };
const PICKUP = { fg: "#7A5300", bg: "#FFF3CF" };
const STATUS_COLOR: Record<StockStatus, string> = { available: "#1B6B3A", low: "#7A5300", out: TEXT_SOFT };

interface Props {
  // Solo los canales que el producto tiene (un canal que no tiene no se muestra); los sin existencia llegan deshabilitados con su motivo.
  options: ChannelOption[];
  value: PurchaseChannel | null;
  onChange: (channel: PurchaseChannel) => void;
  // Aviso (área viva) cuando un cambio de presentación deseleccionó algo.
  notice: Notice;
}

// Paso 2: "¿Cómo lo querés?" según la presentación elegida. Opciones EXCLUYENTES (radios con su label, foco visible): cada una muestra su estado
// para esa presentación ("Disponible", "En N tiendas") y, sin existencia, queda deshabilitada con la explicación. Sin cantidades exactas.
export default function ChannelStep({ options, value, onChange, notice }: Props) {
  const tCart = useTranslations("Cart");
  const tCatalog = useTranslations("Products.catalog");
  const group = useId();
  if (options.length === 0) return null;

  const explanation = (reason: DisabledReason | null): string | null =>
    reason === "delivery_out" ? tCart("channelDeliveryOut") : reason === "pickup_out" ? tCart("channelPickupOut") : reason === "pickup_unit" ? tCart("pickupUnitUnavailable") : null;

  const statusText = (option: ChannelOption): { text: string; status: StockStatus } | null => {
    if (!option.enabled) return null;
    if (option.channel === "delivery") {
      if (option.status === "low") return { text: tCart("storeStatusLow"), status: "low" };
      return option.status ? { text: tCart("storeStatusAvailable"), status: "available" } : null;
    }
    return option.stores !== null ? { text: tCart("channelStores", { count: option.stores }), status: "available" } : null;
  };

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" data-slot="channel-step">
      <legend className="p-0 text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
        {tCatalog("howTitle")}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const palette = option.channel === "pickup" ? PICKUP : DELIVERY;
          const Icon = option.channel === "pickup" ? Store : Truck;
          const status = statusText(option);
          const why = explanation(option.reason);
          return (
            <label key={option.channel} className={`relative block ${option.enabled ? "cursor-pointer" : "cursor-not-allowed"}`}>
              <input
                type="radio"
                name={`${group}-channel`}
                value={option.channel}
                checked={value === option.channel}
                disabled={!option.enabled}
                onChange={() => onChange(option.channel)}
                className="peer sr-only"
              />
              <span
                className="flex min-h-[76px] items-start gap-3 rounded-2xl border bg-white px-3.5 py-3 motion-safe:transition-colors motion-safe:duration-150 hover:border-[#B9C6D8] peer-checked:border-[#082B5C] peer-checked:bg-[#EAF0F8] peer-checked:shadow-[inset_0_0_0_1px_#082B5C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2 peer-disabled:bg-[#F7F8FA] peer-disabled:opacity-80 peer-disabled:hover:border-[#E2E8F0]"
                style={{ borderColor: RULE, color: INK }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: palette.bg }} aria-hidden>
                  <Icon className="h-4 w-4" strokeWidth={2} style={{ color: option.enabled ? palette.fg : TEXT_SOFT }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-snug">
                    {option.channel === "pickup" ? tCatalog("channelPickup") : tCatalog("channelDelivery")}
                  </span>
                  {status && (
                    <span className="mt-0.5 block text-[12.5px] font-semibold leading-snug" style={{ color: STATUS_COLOR[status.status] }}>
                      {status.text}
                    </span>
                  )}
                  {why && (
                    <span className="mt-0.5 block text-[12.5px] font-medium leading-snug" style={{ color: TEXT_SOFT }}>
                      {why}
                    </span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className={notice ? "mt-2 text-[12.5px] font-medium leading-snug" : "sr-only"} style={{ color: "#8A5A00" }}>
        {notice === "store_cleared" ? tCart("noticeStoreCleared") : notice === "channel_changed" ? tCart("noticeChannelChanged") : ""}
      </p>
    </fieldset>
  );
}
