"use client";

import { useId } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAddresses } from "@/lib/addresses-context";
import { useActiveDeliveryDates } from "@/lib/checkout-info";
import { site } from "@/lib/data";
import { ACCENT, BEIGE, FOCUS_RING, INK, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import DateChips from "./DateChips";
import { RetryLine } from "./checkout-bits";

interface Props {
  // Fecha elegida ("yyyy-MM-dd") para la dirección activa, o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// Fechas de entrega de la dirección ACTIVA (GET /api/checkout/delivery-dates) como chips de un grupo de
// radios accesible. Se usa en el carrito (la fecha viaja en la cotización por WhatsApp) y en el paso
// "Entrega" del flujo del pedido. `requiresCoordination` → mensaje de coordinación con servicio al cliente.
export default function DeliveryDates({ selectedDate, onSelectDate }: Props) {
  const t = useTranslations("Cart.checkout");
  const { activeAddress, status: addressesStatus } = useAddresses();
  const dates = useActiveDeliveryDates();
  const groupId = useId();

  const datesLoading = addressesStatus === "loading" || dates.status === "loading";
  const datesError = addressesStatus === "error" || dates.status === "error";
  const noAddress = addressesStatus === "ready" && !activeAddress;
  const needsCoordination =
    dates.status === "ready" && !!dates.data && (dates.data.requiresCoordination || dates.data.dates.length === 0);
  const hasDates =
    dates.status === "ready" && !!dates.data && !dates.data.requiresCoordination && dates.data.dates.length > 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4" style={{ color: INK }} strokeWidth={1.9} aria-hidden />
        <h3 id={`${groupId}-title`} className="font-display text-[15px] font-semibold" style={{ color: INK }}>
          {t("datesTitle")}
        </h3>
      </div>

      <div aria-live="polite">
        {noAddress && (
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("noAddress")}
          </p>
        )}

        {datesLoading && !datesError && (
          <div role="status">
            <span className="sr-only">{t("datesLoading")}</span>
            <div className="grid grid-cols-3 gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[88px] rounded-2xl motion-safe:animate-pulse" style={{ background: BEIGE }} />
              ))}
            </div>
          </div>
        )}

        {datesError && <RetryLine message={t("error")} retryLabel={t("retry")} onRetry={dates.retry} />}

        {needsCoordination && (
          <div className="rounded-2xl px-4 py-3.5" style={{ background: BEIGE }}>
            <p className="text-[14px] font-semibold leading-snug" style={{ color: INK }}>
              {t("coordination")}
            </p>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1.5 inline-block rounded text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: ACCENT }}
            >
              {t("coordinationCta")}
            </a>
          </div>
        )}

        {hasDates && dates.data && (
          <DateChips dates={dates.data.dates} selectedDate={selectedDate} onSelectDate={onSelectDate} labelledBy={`${groupId}-title`} hint={t("datesHint")} />
        )}
      </div>
    </div>
  );
}
