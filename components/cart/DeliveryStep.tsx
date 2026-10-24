"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveAddress } from "@/lib/addresses-context";
import { FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import type { OrderPreviewPickupGroup } from "@/lib/order-types";
import DeliveryDates from "./DeliveryDates";
import PickupSiteSelector from "./PickupSiteSelector";

interface Props {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  // Abre la lista de direcciones del perfil para cambiar la dirección activa.
  onChangeAddress: () => void;
  // ¿El carrito tiene grupo de domicilio? Solo entonces se piden dirección y fecha.
  showDelivery?: boolean;
  // Grupo de retiro (con la tienda elegida) si el carrito lo tiene; solo entonces se muestra la tienda.
  pickup?: { group: OrderPreviewPickupGroup | null; proposed: boolean; onSelectSite: (siteId: string) => void } | null;
}

// Paso 2: con grupo de domicilio, la dirección activa (cambiar abre "Mis direcciones" del perfil) y las fechas
// disponibles como chips; con grupo de retiro, la tienda (una sola) con su dirección, horario y mapa. Un grupo que el
// carrito no tiene no pide nada.
export default function DeliveryStep({ selectedDate, onSelectDate, onChangeAddress, showDelivery = true, pickup = null }: Props) {
  const t = useTranslations("Cart.order");
  const { address } = useActiveAddress();

  return (
    <div className="flex flex-col gap-6">
      {pickup && (
        <section aria-labelledby="delivery-pickup-title">
          <h3 id="delivery-pickup-title" className="mb-1.5 font-display text-[15px] font-semibold" style={{ color: INK }}>
            {t("groupPickupTitle")}
          </h3>
          <p className="mb-3 text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
            {t("pickupStepIntro")} {!showDelivery && t("pickupOnlyNote")}
          </p>
          {pickup.group ? (
            <PickupSiteSelector
              sites={pickup.group.sites}
              selectedId={pickup.group.siteId}
              proposed={pickup.proposed}
              onSelect={pickup.onSelectSite}
            />
          ) : (
            <p className="rounded-2xl border bg-white px-4 py-3.5 text-[13px]" style={{ borderColor: RULE, color: TEXT_MUTED }}>
              {t("pickupNoSite")}
            </p>
          )}
        </section>
      )}

      {showDelivery && (
      <>
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
      </>
      )}
    </div>
  );
}
