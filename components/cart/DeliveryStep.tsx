"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveAddress } from "@/lib/addresses-context";
import { FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import DeliveryDates from "./DeliveryDates";

interface Props {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  // Abre la lista de direcciones del perfil para cambiar la dirección activa.
  onChangeAddress: () => void;
}

// Paso 2: dirección activa (cambiar abre "Mis direcciones" del perfil) y fechas disponibles como chips.
export default function DeliveryStep({ selectedDate, onSelectDate, onChangeAddress }: Props) {
  const t = useTranslations("Cart.order");
  const { address } = useActiveAddress();

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="delivery-address-title">
        <h3 id="delivery-address-title" className="mb-3 font-display text-[15px] font-semibold" style={{ color: INK }}>
          {t("deliveryAddress")}
        </h3>
        <div className="flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }}>
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: INK }} strokeWidth={1.9} aria-hidden />
          <div className="min-w-0 flex-1">
            {address ? (
              <>
                <p className="text-[14px] font-semibold leading-snug" style={{ color: INK }}>
                  {address.name || t("unnamedAddress")}
                </p>
                {address.description && (
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug" style={{ color: TEXT_MUTED }}>
                    {address.description}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
                {t("noAddress")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onChangeAddress}
            className={`shrink-0 rounded text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
            style={{ color: "#075FD8" }}
          >
            {t("changeAddress")}
          </button>
        </div>
      </section>

      <DeliveryDates selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </div>
  );
}
