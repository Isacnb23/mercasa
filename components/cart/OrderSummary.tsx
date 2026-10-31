"use client";

import { AlertCircle, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatColones } from "@/lib/checkout-format";
import type { CartChannel } from "@/lib/cart-types";
import { deliveryNotPossibleReasons, groupFor, hasError, isDeliveryNotPossible } from "@/lib/order-logic";
import type { OrderPreview } from "@/lib/order-types";
import { BEIGE, DANGER_BG, DANGER_TEXT, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

interface Props {
  preview: OrderPreview;
  // Grupo que se resume (por defecto domicilio, como antes de la fase 2).
  channel?: CartChannel;
  // Se está recalculando: los valores mostrados son los últimos del servidor (se atenúan).
  stale: boolean;
  // Con false no se muestra el avance hacia el mínimo (resumen de solo lectura).
  showMinimum?: boolean;
}

// Resumen de UN grupo del pedido con TODOS los números del servidor: subtotal, descuento, impuesto y total
// (estimado: los descuentos y promociones se aplican al confirmar), el flete pendiente del AIF (solo domicilio) y
// el avance hacia el pedido mínimo (solo si el grupo tiene mínimo). Nada se calcula en el navegador, salvo la
// proporción de la barra de progreso (total / mínimo) que es solo visual.
export default function OrderSummary({ preview, channel = "delivery", stale, showMinimum = true }: Props) {
  const t = useTranslations("Cart.order");
  const tCheckout = useTranslations("Cart.checkout");
  const locale = useLocale();
  const money = (n: number) => formatColones(n, locale, 2);
  const group = groupFor(preview, channel);
  const priceListMissing = channel === "delivery" && hasError(preview, "price_list_missing");

  if (!group) return null;

  // AX no puede atender el domicilio: aviso con las razones y sin totales (el grupo no avanza).
  if (channel === "delivery" && isDeliveryNotPossible(preview)) {
    const reasons = deliveryNotPossibleReasons(preview);
    return (
      <div role="alert" className="rounded-2xl px-4 py-3.5" style={{ background: DANGER_BG, color: DANGER_TEXT }}>
        <p className="flex items-start gap-2 text-[14px] font-semibold leading-snug">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {t("deliveryNotPossibleTitle")}
        </p>
        <p className="mt-1.5 text-[13px] leading-snug">{t("deliveryNotPossibleIntro")}</p>
        {reasons.length > 0 && (
          <ul className="mt-1.5 list-disc pl-5 text-[13px] leading-snug">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-[13px] font-medium leading-snug">{t("deliveryNotPossibleOptions")}</p>
        <p className="mt-1.5 text-[13px] leading-snug">{t("deliveryNotPossibleHelp")}</p>
      </div>
    );
  }

  if (priceListMissing) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-2xl px-4 py-3.5 text-[13px] font-medium leading-snug"
        style={{ background: DANGER_BG, color: DANGER_TEXT }}
      >
        <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        {t("priceListMissing")}
      </p>
    );
  }

  const minimum = group.minimumAmount;
  const ratio = minimum !== null && minimum > 0 ? Math.min(group.totals.total / minimum, 1) : 1;

  return (
    <div className="flex flex-col gap-4" aria-busy={stale}>
      <div
        className="rounded-2xl border bg-white px-4 py-4 motion-safe:transition-opacity motion-safe:duration-150"
        style={{ borderColor: RULE, opacity: stale ? 0.55 : 1 }}
      >
        <p className="text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
          {t("estimatedTotal")}
        </p>

        <dl className="mt-3 flex flex-col gap-1.5 text-[13.5px]" style={{ color: TEXT_MUTED }}>
          <Row label={t("subtotal")} value={money(group.totals.subtotal)} />
          <Row label={t("discount")} value={money(group.totals.discount)} />
          <Row label={t("tax")} value={money(group.totals.tax)} />
          {channel === "delivery" && (
            <Row
              label={t("freight")}
              value={preview.freight !== null ? money(preview.freight) : preview.freightPending ? t("freightPending") : "—"}
            />
          )}
        </dl>

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t pt-3" style={{ borderColor: RULE }}>
          <span className="text-[14px] font-semibold" style={{ color: INK }}>
            {t("total")}
          </span>
          <span className="font-display text-[24px] font-semibold tabular-nums leading-none" style={{ color: INK }}>
            {money(group.totals.total)}
          </span>
        </div>

        <p className="mt-3 text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
          {t("discountsNote")}
        </p>
        <p className="mt-1.5 text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
          {t("priceNote")}
        </p>
      </div>

      {showMinimum && minimum === null && (
        <p className="px-1 text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
          {t("noMinimum")}
        </p>
      )}

      {showMinimum && minimum !== null && (
        <div
          className="rounded-2xl border bg-white px-4 py-3.5 motion-safe:transition-opacity motion-safe:duration-150"
          style={{ borderColor: group.belowMinimum ? "#E8C98A" : RULE, opacity: stale ? 0.55 : 1 }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: BEIGE }} aria-hidden>
              <Receipt className="h-4 w-4" style={{ color: INK }} strokeWidth={1.9} />
            </span>
            <p className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
              {tCheckout("minimumLabel")}
            </p>
            <p className="shrink-0 font-display text-[20px] font-semibold leading-none tabular-nums" style={{ color: INK }}>
              {formatColones(minimum, locale)}
            </p>
          </div>

          <div
            role="progressbar"
            aria-label={tCheckout("minimumLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="mt-3 h-1.5 overflow-hidden rounded-full"
            style={{ background: BEIGE }}
          >
            <div
              className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${Math.round(ratio * 100)}%`, background: INK }}
            />
          </div>

          <p className="mt-2 text-[12.5px] leading-snug" style={{ color: group.belowMinimum ? "#8A5A00" : TEXT_MUTED }} aria-live="polite">
            {group.belowMinimum
              ? t("minimumShortfall", { amount: money(group.shortfall) })
              : t("minimumReached")}
          </p>
        </div>
      )}
    </div>
  );
}

// Total general cuando el pedido trae los dos grupos (cada uno se confirma como un pedido aparte).
export function GrandTotal({ preview, stale }: { preview: OrderPreview; stale: boolean }) {
  const t = useTranslations("Cart.order");
  const locale = useLocale();
  return (
    <div
      className="flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3.5 motion-safe:transition-opacity motion-safe:duration-150"
      style={{ background: BEIGE, opacity: stale ? 0.55 : 1 }}
    >
      <span className="text-[14px] font-semibold" style={{ color: INK }}>
        {t("grandTotalLabel")}
      </span>
      <span className="font-display text-[22px] font-semibold tabular-nums leading-none" style={{ color: INK }}>
        {formatColones(preview.grandTotals.total, locale, 2)}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </div>
  );
}
