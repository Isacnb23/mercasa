"use client";

import { AlertCircle } from "lucide-react";
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
  // Fecha de entrega elegida ("yyyy-MM-dd") o null. Solo domicilio: el flete se pide al servidor SOLO con fecha, así que sin ella
  // se avisa que hay que elegirla. `undefined` = quien llama no maneja fecha (se muestra el texto de siempre).
  deliveryDate?: string | null;
}

// Resumen de UN grupo del pedido con TODOS los números del servidor, en este orden: avance hacia el pedido mínimo (barra compacta,
// solo si el grupo tiene un mínimo mayor que 0), y debajo subtotal, descuento, impuesto, flete (solo domicilio) y total (estimado:
// los descuentos y promociones se aplican al confirmar). Nada se calcula en el navegador, salvo la proporción de la barra de
// progreso (total / mínimo) que es solo visual.
export default function OrderSummary({ preview, channel = "delivery", stale, showMinimum = true, deliveryDate }: Props) {
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
  // Un mínimo de 0 es "sin mínimo" (lo que manda el servidor para el retiro en tienda): no hay bloque que mostrar.
  const hasMinimum = minimum !== null && minimum > 0;
  const ratio = hasMinimum ? Math.min(group.totals.total / minimum, 1) : 1;

  // El flete solo se pide con fecha de entrega elegida (y una zona que no se coordina aparte): sin ella se invita a elegirla.
  const freightNeedsDate = channel === "delivery" && deliveryDate === null && !preview.delivery.requiresCoordination;
  // Fecha de ruta o de plan (o flete 0 de AX): "Sin costo", no ₡0.
  const freeShipping = preview.freight === 0 || preview.delivery.dateType === "route" || preview.delivery.dateType === "plan";
  const freightValue =
    freeShipping && preview.freight !== null
      ? t("freightFree")
      : preview.freight !== null
        ? money(preview.freight)
      : freightNeedsDate
        ? t("freightPickDate")
        : preview.freightPending
          ? t("freightPending")
          : "—";

  return (
    <div className="flex flex-col gap-3" aria-busy={stale}>
      {showMinimum && minimum === null && (
        <p className="px-1 text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
          {t("noMinimum")}
        </p>
      )}

      {showMinimum && hasMinimum && (
        <div
          className="rounded-2xl border bg-white px-3.5 py-3 motion-safe:transition-opacity motion-safe:duration-150"
          style={{ borderColor: group.belowMinimum ? "#E8C98A" : RULE, opacity: stale ? 0.55 : 1 }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
              {tCheckout("minimumLabel")}
            </p>
            <p className="shrink-0 font-display text-[16px] font-semibold leading-none tabular-nums" style={{ color: INK }}>
              {formatColones(minimum, locale)}
            </p>
          </div>

          <div
            role="progressbar"
            aria-label={tCheckout("minimumLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="mt-2 h-1 overflow-hidden rounded-full"
            style={{ background: BEIGE }}
          >
            <div
              className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${Math.round(ratio * 100)}%`, background: INK }}
            />
          </div>

          <p className="mt-1.5 text-[12px] leading-snug" style={{ color: group.belowMinimum ? "#8A5A00" : TEXT_MUTED }} aria-live="polite">
            {group.belowMinimum ? t("minimumShortfall", { amount: money(group.shortfall) }) : t("minimumReached")}
          </p>
        </div>
      )}

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
          {channel === "delivery" && <Row label={t("freight")} value={freightValue} />}
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
    </div>
  );
}

// Total general (cada grupo se confirma como un pedido aparte). Con `compact` (pie fijo del carrito) es más bajo y, si el pedido
// trae los dos grupos, antepone el total de cada uno; sin `compact` es el bloque de siempre.
export function GrandTotal({ preview, stale, compact = false }: { preview: OrderPreview; stale: boolean; compact?: boolean }) {
  const t = useTranslations("Cart.order");
  const locale = useLocale();
  const money = (n: number) => formatColones(n, locale, 2);
  const both = !!preview.deliveryGroup && !!preview.pickupGroup;

  return (
    <div
      className={`rounded-2xl motion-safe:transition-opacity motion-safe:duration-150 ${compact ? "px-3.5 py-2.5" : "px-4 py-3.5"}`}
      style={{ background: BEIGE, opacity: stale ? 0.55 : 1 }}
    >
      {compact && both && (
        <dl className="mb-1.5 flex flex-col gap-0.5 text-[12.5px]" style={{ color: TEXT_MUTED }}>
          <Row label={t("groupDeliveryTitle")} value={money(preview.deliveryGroup!.totals.total)} />
          <Row label={t("groupPickupTitle")} value={money(preview.pickupGroup!.totals.total)} />
        </dl>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold" style={{ color: INK }}>
          {t("grandTotalLabel")}
        </span>
        <span className={`font-display font-semibold tabular-nums leading-none ${compact ? "text-[20px]" : "text-[22px]"}`} style={{ color: INK }}>
          {money(preview.grandTotals.total)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="m-0 text-right tabular-nums">{value}</dd>
    </div>
  );
}
