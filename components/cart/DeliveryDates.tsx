"use client";

import { useId } from "react";
import { CalendarDays, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAddresses } from "@/lib/addresses-context";
import { useActiveDeliveryDates } from "@/lib/checkout-info";
import { formatDeliveryChip, formatDeliveryDate } from "@/lib/checkout-format";
import { site } from "@/lib/data";
import { ACCENT, BEIGE, FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
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
  const locale = useLocale();
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
          <fieldset className="m-0 min-w-0 border-0 p-0" aria-labelledby={`${groupId}-title`}>
            <div className="grid grid-cols-3 gap-2">
              {dates.data.dates.map((iso) => {
                const chip = formatDeliveryChip(iso, locale);
                const full = formatDeliveryDate(iso, locale);
                if (!chip || !full) return null;
                return (
                  <label key={iso} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name={`${groupId}-date`}
                      value={iso}
                      checked={selectedDate === iso}
                      onChange={() => onSelectDate(iso)}
                      aria-label={full}
                      className="peer sr-only"
                    />
                    <span
                      className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl border bg-white px-1 py-3 text-center motion-safe:transition motion-safe:duration-150 hover:border-[#B9C6D8] hover:bg-[#FBF9F5] peer-checked:border-[#082B5C] peer-checked:bg-[#EAF0F8] peer-checked:shadow-[inset_0_0_0_1px_#082B5C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2"
                      style={{ borderColor: RULE, color: INK }}
                      aria-hidden
                    >
                      <span className="text-[11px] font-bold uppercase leading-none" style={{ letterSpacing: "0.1em", color: TEXT_MUTED }}>
                        {chip.weekday}
                      </span>
                      <span className="mt-1.5 font-display text-[26px] font-semibold leading-none">{chip.day}</span>
                      <span className="mt-1.5 text-[11px] font-bold uppercase leading-none" style={{ letterSpacing: "0.1em" }}>
                        {chip.month}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full text-white peer-checked:flex"
                      style={{ background: INK }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("datesHint")}
            </p>
          </fieldset>
        )}
      </div>
    </div>
  );
}
