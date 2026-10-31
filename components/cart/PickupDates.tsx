"use client";

import { useId } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PickupDatesInfo } from "@/lib/auth-types";
import type { CheckoutStatus } from "@/lib/checkout-info";
import { BEIGE, DANGER_TEXT, INK, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import DateChips from "./DateChips";
import { RetryLine } from "./checkout-bits";

interface Props {
  // Fechas ya pedidas por el carrito (usePickupDates): una sola llamada para mostrarlas y para validar la elegida.
  dates: { status: CheckoutStatus; data: PickupDatesInfo | null; retry: () => void };
  // Fecha de retiro elegida ("yyyy-MM-dd") o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  // El servidor rechazó la fecha elegida (pickup_date_invalid): se avisa para que se elija otra.
  invalid?: boolean;
}

// Fechas de retiro en tienda (GET /api/checkout/pickup-dates) como chips. Va en el paso de retiro, DESPUÉS de elegir la tienda: las
// fechas son las mismas para todas las tiendas y las calcula mercasa-api. Solo se montan con grupo de retiro y tienda elegida.
export default function PickupDates({ dates, selectedDate, onSelectDate, invalid = false }: Props) {
  const t = useTranslations("Cart.order");
  const tCheckout = useTranslations("Cart.checkout");
  const titleId = useId();

  const loading = dates.status === "loading";
  const failed = dates.status === "error";
  const list = dates.status === "ready" && dates.data ? dates.data.dates : [];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4" style={{ color: INK }} strokeWidth={1.9} aria-hidden />
        <h3 id={titleId} className="font-display text-[15px] font-semibold" style={{ color: INK }}>
          {t("pickupDatesTitle")}
        </h3>
      </div>

      <div aria-live="polite">
        {loading && (
          <div role="status">
            <span className="sr-only">{t("pickupDatesLoading")}</span>
            <div className="grid grid-cols-3 gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[88px] rounded-2xl motion-safe:animate-pulse" style={{ background: BEIGE }} />
              ))}
            </div>
          </div>
        )}

        {failed && <RetryLine message={t("pickupDatesError")} retryLabel={tCheckout("retry")} onRetry={dates.retry} />}

        {dates.status === "ready" && list.length === 0 && (
          <p className="rounded-2xl px-4 py-3.5 text-[13px] leading-snug" style={{ background: BEIGE, color: TEXT_MUTED }}>
            {t("pickupDatesEmpty")}
          </p>
        )}

        {list.length > 0 && (
          <DateChips dates={list} selectedDate={selectedDate} onSelectDate={onSelectDate} labelledBy={titleId} hint={t("pickupDatesHint")} />
        )}

        {invalid && (
          <p role="alert" className="mt-2 text-[12.5px] font-medium leading-snug" style={{ color: DANGER_TEXT }}>
            {t("pickupDateInvalid")}
          </p>
        )}
      </div>
    </div>
  );
}
