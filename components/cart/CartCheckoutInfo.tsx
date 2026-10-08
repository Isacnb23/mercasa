"use client";

import { useId } from "react";
import { CalendarDays, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useAddresses } from "@/lib/addresses-context";
import { useActiveDeliveryDates, useMinimumAmount } from "@/lib/checkout-info";
import { formatColones, formatDeliveryDate } from "@/lib/checkout-format";
import { site } from "@/lib/data";

// Mismos tonos del drawer del carrito (CartDrawer.tsx) para que se lea como parte de él.
const INK = "#082B5C";
const MUTED = "#8493A5";
const BEIGE = "#F1ECE4";
const GOLD = "#FFD21A";
const RULE = "#E2E8F0";

interface Props {
  // Fecha elegida ("yyyy-MM-dd") para la dirección activa, o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// Monto mínimo de pedido y fechas de entrega disponibles para la dirección activa.
// El carrito no maneja precios (ver cart-context.tsx), así que el mínimo se muestra
// como información: no hay total contra el cual calcular "cuánto falta" ni bloquear.
export default function CartCheckoutInfo({ selectedDate, onSelectDate }: Props) {
  const t = useTranslations("Cart.checkout");
  const locale = useLocale();
  const { user } = useAuth();
  const { activeAddress, status: addressesStatus } = useAddresses();
  const minimum = useMinimumAmount();
  const dates = useActiveDeliveryDates();
  const groupId = useId();

  if (!user) {
    return (
      <p className="mt-4 rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed" style={{ background: BEIGE, color: "#5C6B7D" }}>
        {t("loginHint")}
      </p>
    );
  }

  return (
    <section className="mt-4 flex flex-col gap-3" aria-label={t("sectionAria")}>
      {/* Monto mínimo */}
      <div className="rounded-2xl border bg-white p-4" style={{ borderColor: RULE }} aria-live="polite">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: BEIGE, boxShadow: `inset 0 0 0 1.5px ${GOLD}` }}
          >
            <Receipt className="h-4 w-4" style={{ color: INK }} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
              {t("minimumLabel")}
            </p>
            {minimum.status === "loading" && (
              <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                {t("minimumLoading")}
              </p>
            )}
            {minimum.status === "error" && <RetryLine message={t("error")} retryLabel={t("retry")} onRetry={minimum.retry} />}
            {minimum.status === "ready" && minimum.data && (
              <>
                <p className="font-display text-[20px] font-semibold leading-tight" style={{ color: INK }}>
                  {formatColones(minimum.data.minimumAmount, locale)}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: "#5C6B7D" }}>
                  {t("minimumNote")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fechas de entrega de la dirección activa */}
      <div className="rounded-2xl border bg-white p-4" style={{ borderColor: RULE }}>
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: BEIGE, boxShadow: `inset 0 0 0 1.5px ${GOLD}` }}
          >
            <CalendarDays className="h-4 w-4" style={{ color: INK }} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p id={`${groupId}-title`} className="text-[11px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
              {t("datesTitle")}
            </p>

            {addressesStatus === "ready" && !activeAddress && (
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "#5C6B7D" }}>
                {t("noAddress")}
              </p>
            )}

            {(addressesStatus === "loading" || dates.status === "loading") && (
              <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                {t("datesLoading")}
              </p>
            )}

            {(addressesStatus === "error" || dates.status === "error") && (
              <RetryLine message={t("error")} retryLabel={t("retry")} onRetry={dates.retry} />
            )}

            {dates.status === "ready" && dates.data && (dates.data.requiresCoordination || dates.data.dates.length === 0) && (
              <div className="mt-1">
                <p className="text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>
                  {t("coordination")}
                </p>
                <a
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[12.5px] font-semibold underline underline-offset-4 outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                  style={{ color: "#075FD8" }}
                >
                  {t("coordinationCta")}
                </a>
              </div>
            )}

            {dates.status === "ready" && dates.data && !dates.data.requiresCoordination && dates.data.dates.length > 0 && (
              <fieldset className="mt-1.5 min-w-0 border-0 p-0" aria-labelledby={`${groupId}-title`}>
                <p className="mb-2 text-[12px] leading-relaxed" style={{ color: "#5C6B7D" }}>
                  {t("datesHint")}
                </p>
                <div className="flex flex-col gap-2">
                  {dates.data.dates.map((iso) => {
                    const label = formatDeliveryDate(iso, locale);
                    if (!label) return null;
                    return (
                      <label key={iso} className="block cursor-pointer">
                        <input
                          type="radio"
                          name={`${groupId}-date`}
                          value={iso}
                          checked={selectedDate === iso}
                          onChange={() => onSelectDate(iso)}
                          className="peer sr-only"
                        />
                        <span
                          className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-[13.5px] font-semibold capitalize motion-safe:transition peer-checked:border-[#082B5C] peer-checked:bg-[rgba(255,210,26,0.18)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2 hover:bg-black/[0.02]"
                          style={{ borderColor: RULE, color: INK }}
                        >
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RetryLine({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-[13px]" style={{ color: "#5C6B7D" }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded text-[12.5px] font-semibold underline underline-offset-4 outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
        style={{ color: "#075FD8" }}
      >
        {retryLabel}
      </button>
    </div>
  );
}
