"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatColones, formatDeliveryDate } from "@/lib/checkout-format";
import { unitLabel } from "@/lib/presentations";
import type { OrderPreview, PaymentMethod } from "@/lib/order-types";
import { BEIGE, DANGER_BG, DANGER_TEXT, FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import OrderSummary, { GrandTotal } from "./OrderSummary";
import type { OrderPreviewLine } from "@/lib/order-types";

export type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; orderNumber: string | null }
  // code: ordering_disabled | ordering_not_available | service_unavailable | session | invalid | unknown
  | { status: "error"; code: string };

interface Props {
  preview: OrderPreview;
  stale: boolean;
  deliveryDate: string | null;
  paymentMethod: PaymentMethod | null;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  submit: SubmitState;
}

// Paso 4: todo lo anterior en solo lectura, términos y estados del envío. El botón "Confirmar pedido" lo pone
// el pie del drawer. `ordering_disabled` / `ordering_not_available` muestran un mensaje amable (los pedidos en
// línea todavía no están habilitados) y el drawer ofrece enviar la cotización por WhatsApp.
export default function ConfirmStep({ preview, stale, deliveryDate, paymentMethod, termsAccepted, onTermsChange, submit }: Props) {
  const t = useTranslations("Cart.order");
  const tCatalog = useTranslations("Products.catalog");
  const locale = useLocale();
  const topRef = useRef<HTMLDivElement>(null);

  // El resultado del envío (éxito, pedidos no habilitados, error) aparece arriba: se lleva a la vista, porque el
  // cuerpo suele estar desplazado hacia abajo (términos y botón).
  useEffect(() => {
    if (submit.status === "error" || submit.status === "done") topRef.current?.scrollIntoView({ block: "start" });
  }, [submit.status]);

  if (submit.status === "done") {
    return (
      <div ref={topRef} className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-6 py-8 text-center" style={{ borderColor: RULE }} role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: BEIGE }} aria-hidden>
          <CheckCircle2 className="h-8 w-8 text-emerald-700" strokeWidth={1.6} />
        </span>
        <p className="font-display text-[19px] font-semibold" style={{ color: INK }}>
          {t("successTitle")}
        </p>
        {submit.orderNumber && (
          <p className="text-[14px] font-semibold" style={{ color: INK }}>
            {t("orderNumber", { number: submit.orderNumber })}
          </p>
        )}
        <p className="text-[13.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          {t("successBody")}
        </p>
      </div>
    );
  }

  const both = !!preview.deliveryGroup && !!preview.pickupGroup;
  const pickupSite = preview.pickupGroup?.sites.find((x) => x.siteId === preview.pickupGroup?.siteId) ?? null;
  const dateLabel = deliveryDate ? formatDeliveryDate(deliveryDate, locale) : null;
  const orderingOff = submit.status === "error" && (submit.code === "ordering_disabled" || submit.code === "ordering_not_available");

  return (
    <div ref={topRef} className="flex flex-col gap-5">
      {orderingOff && (
        <div role="alert" className="rounded-2xl px-4 py-3.5" style={{ background: BEIGE }}>
          <p className="text-[14px] font-semibold leading-snug" style={{ color: INK }}>
            {t("orderingDisabledTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("orderingDisabledBody")}
          </p>
        </div>
      )}

      {submit.status === "error" && !orderingOff && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] font-medium leading-snug"
          style={{ background: DANGER_BG, color: DANGER_TEXT }}
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {submit.code === "session" ? t("sessionExpired") : t("confirmError")}
        </p>
      )}

      {preview.deliveryGroup && (
        <GroupBlock
          title={both ? t("groupDeliveryTitle") : t("summaryTitle")}
          id="summary-delivery"
          lines={preview.deliveryGroup.lines}
          locale={locale}
        >
          <dl className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3.5 text-[13.5px]" style={{ borderColor: RULE }}>
            <div>
              <dt className="text-[11px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
                {t("summaryDelivery")}
              </dt>
              <dd className="m-0 mt-1 font-semibold" style={{ color: INK }}>
                {preview.delivery.requiresCoordination ? t("summaryCoordination") : (dateLabel ?? "—")}
              </dd>
            </div>
          </dl>
          <OrderSummary preview={preview} channel="delivery" stale={stale} showMinimum={false} />
        </GroupBlock>
      )}

      {preview.pickupGroup && (
        <GroupBlock
          title={t("groupPickupTitle")}
          id="summary-pickup"
          lines={preview.pickupGroup.lines}
          locale={locale}
        >
          {pickupSite && (
            <dl className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3.5 text-[13.5px]" style={{ borderColor: RULE }}>
              <div>
                <dt className="text-[11px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
                  {t("summaryPickupStore")}
                </dt>
                <dd className="m-0 mt-1 font-semibold" style={{ color: INK }}>
                  {pickupSite.name || pickupSite.siteId}
                  {pickupSite.city ? ` · ${pickupSite.city}` : ""}
                </dd>
                {pickupSite.address && (
                  <dd className="m-0 mt-0.5 text-[12.5px]" style={{ color: TEXT_MUTED }}>
                    {pickupSite.address}
                  </dd>
                )}
                {pickupSite.hours && (
                  <dd className="m-0 mt-0.5 text-[12.5px]" style={{ color: TEXT_MUTED }}>
                    {tCatalog("pickupStoreHours")}: {pickupSite.hours}
                  </dd>
                )}
              </div>
            </dl>
          )}
          <OrderSummary preview={preview} channel="pickup" stale={stale} showMinimum={false} />
        </GroupBlock>
      )}

      <dl className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3.5 text-[13.5px]" style={{ borderColor: RULE }}>
        <div>
          <dt className="text-[11px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.12em" }}>
            {t("summaryPayment")}
          </dt>
          <dd className="m-0 mt-1 font-semibold" style={{ color: INK }}>
            {paymentMethod === "sinpe" ? t("paymentSinpe") : paymentMethod === "transfer" ? t("paymentTransfer") : "—"}
          </dd>
        </div>
      </dl>

      {both && (
        <>
          <GrandTotal preview={preview} stale={stale} />
          <p className="px-1 text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
            {t("groupsSeparateNote")}
          </p>
        </>
      )}

      <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug" style={{ color: INK }}>
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          className={`mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#082B5C] ${FOCUS_RING}`}
        />
        <span>
          {t("termsLabel")}{" "}
          <Link
            href="/legal/terminos-y-condiciones"
            target="_blank"
            className={`rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
            style={{ color: "#075FD8" }}
          >
            {t("termsLink")}
          </Link>
        </span>
      </label>
    </div>
  );
}

// Un grupo del pedido (se confirma como un pedido aparte): título, líneas con su total y lo que el caller agrega.
function GroupBlock({
  title,
  id,
  lines,
  locale,
  children,
}: {
  title: string;
  id: string;
  lines: OrderPreviewLine[];
  locale: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Cart.order");
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h3 id={`${id}-title`} className="font-display text-[15px] font-semibold" style={{ color: INK }}>
        {title}
      </h3>
      <ul className="flex flex-col divide-y rounded-2xl border bg-white" style={{ borderColor: RULE }}>
        {lines.map((line) => (
          <li key={`${line.itemId}|${line.unitId}`} className="flex items-start justify-between gap-3 px-4 py-3" style={{ borderColor: RULE }}>
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug" style={{ color: INK }}>
              <span className="line-clamp-2 font-medium">{line.name}</span>
              <span className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
                {t("summaryQty", { quantity: line.quantity })}
                {line.unitId ? ` · ${unitLabel(line.unitId, locale)}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-[13.5px] font-semibold tabular-nums" style={{ color: INK }}>
              {formatColones(line.lineTotal, locale, 2)}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
