"use client";

import { useId } from "react";
import { CalendarDays, Check, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useAddresses } from "@/lib/addresses-context";
import { useActiveDeliveryDates, useMinimumAmount } from "@/lib/checkout-info";
import { formatColones, formatDeliveryChip, formatDeliveryDate } from "@/lib/checkout-format";
import { site } from "@/lib/data";

// Mismos tonos del drawer del carrito (CartDrawer.tsx). TEXT_MUTED (#5C6B7D) es el gris
// para texto legible (contraste AA sobre blanco y beige); #8493A5 queda solo para detalles.
const INK = "#082B5C";
const ACCENT = "#075FD8";
const TEXT_MUTED = "#5C6B7D";
const BEIGE = "#F1ECE4";
const RING = "#E9E3D8";

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2";

interface Props {
  // Fecha elegida ("yyyy-MM-dd") para la dirección activa, o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// Pedido mínimo y fechas de entrega de la dirección activa. El carrito no maneja precios
// (ver cart-context.tsx), así que el mínimo se muestra como información: no hay total
// contra el cual calcular "cuánto falta" ni bloquear.
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
      <p
        className="mt-5 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed"
        style={{ background: BEIGE, color: TEXT_MUTED }}
      >
        {t("loginHint")}
      </p>
    );
  }

  const datesLoading = addressesStatus === "loading" || dates.status === "loading";
  const datesError = addressesStatus === "error" || dates.status === "error";
  const noAddress = addressesStatus === "ready" && !activeAddress;
  const needsCoordination =
    dates.status === "ready" && !!dates.data && (dates.data.requiresCoordination || dates.data.dates.length === 0);
  const hasDates =
    dates.status === "ready" && !!dates.data && !dates.data.requiresCoordination && dates.data.dates.length > 0;

  return (
    <section className="mt-6 flex flex-col gap-5" aria-label={t("sectionAria")}>
      <MinimumAmountRow
        label={t("minimumLabel")}
        note={t("minimumNote")}
        loadingLabel={t("minimumLoading")}
        errorLabel={t("error")}
        retryLabel={t("retry")}
        status={minimum.status}
        amount={minimum.data ? formatColones(minimum.data.minimumAmount, locale) : null}
        onRetry={minimum.retry}
      />

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
                  <div
                    key={i}
                    className="h-[88px] rounded-2xl motion-safe:animate-pulse"
                    style={{ background: BEIGE }}
                  />
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
                        style={{ borderColor: RING, color: INK }}
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
    </section>
  );
}

interface MinimumAmountRowProps {
  label: string;
  note: string;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  status: "idle" | "loading" | "ready" | "error";
  amount: string | null;
  onRetry: () => void;
  // Reservado: cuando el carrito maneje un total en colones, pasar acá el avance hacia el
  // mínimo para mostrar la barra de progreso. Hoy nadie lo pasa y no se dibuja nada.
  progress?: { ratio: number; label: string };
}

function MinimumAmountRow({
  label,
  note,
  loadingLabel,
  errorLabel,
  retryLabel,
  status,
  amount,
  onRetry,
  progress,
}: MinimumAmountRowProps) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RING }} aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: BEIGE }}
          aria-hidden
        >
          <Receipt className="h-4 w-4" style={{ color: INK }} strokeWidth={1.9} />
        </span>
        <p className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
          {label}
        </p>
        {status === "ready" && amount && (
          <p className="shrink-0 font-display text-[22px] font-semibold leading-none" style={{ color: INK }}>
            {amount}
          </p>
        )}
      </div>
      {status === "loading" && (
        <div role="status" className="mt-3 pl-11">
          <span className="sr-only">{loadingLabel}</span>
          <div className="h-3 w-3/4 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} aria-hidden />
        </div>
      )}
      {status === "error" && (
        <div className="pl-11">
          <RetryLine message={errorLabel} retryLabel={retryLabel} onRetry={onRetry} />
        </div>
      )}
      {status === "ready" && (
        <p className="mt-2 pl-11 text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
          {note}
        </p>
      )}
      {status === "ready" && progress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: BEIGE }}>
            <div
              className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${Math.round(Math.min(Math.max(progress.ratio, 0), 1) * 100)}%`, background: INK }}
            />
          </div>
          <p className="mt-1.5 text-[12px]" style={{ color: TEXT_MUTED }}>
            {progress.label}
          </p>
        </div>
      )}
    </div>
  );
}

function RetryLine({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`rounded text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
        style={{ color: ACCENT }}
      >
        {retryLabel}
      </button>
    </div>
  );
}
