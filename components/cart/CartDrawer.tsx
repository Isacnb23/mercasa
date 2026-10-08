"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActiveAddress, useAddresses } from "@/lib/addresses-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatColones, formatDeliveryDate } from "@/lib/checkout-format";
import { ORDERING_ENABLED } from "@/lib/feature-flags";
import { canAdvance, hasError, hasLineErrors, nextStep, previousStep } from "@/lib/order-logic";
import { useOrderPreview } from "@/lib/order-preview";
import { submitOrder } from "@/lib/order-submit";
import type { CheckoutStep, PaymentMethod } from "@/lib/order-types";
import CartCheckoutInfo from "@/components/cart/CartCheckoutInfo";
import CartLines from "@/components/cart/CartLines";
import CheckoutStepper from "@/components/cart/CheckoutStepper";
import ConfirmStep, { type SubmitState } from "@/components/cart/ConfirmStep";
import DeliveryStep from "@/components/cart/DeliveryStep";
import OrderSummary from "@/components/cart/OrderSummary";
import PaymentStep from "@/components/cart/PaymentStep";
import { RetryLine } from "@/components/cart/checkout-bits";
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerShell } from "@/components/ui/Drawer";
import {
  BEIGE,
  BODY_BG,
  FOCUS_RING,
  GOLD,
  INK,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  RULE,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";
import { site } from "@/lib/data";
import { buildWhatsappHref } from "@/lib/utils";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

// Arma el mensaje de WhatsApp con el detalle del pedido — mismo patrón que
// ContactSection/CustomerClassSection (buildWhatsappHref): una lista para que un vendedor cotice, no una
// transacción. Puede incluir el total estimado validado por el servidor y la fecha elegida; nunca la dirección.
function buildOrderMessage(
  items: { name: string; packSize?: string; quantity: number }[],
  t: ReturnType<typeof useTranslations>,
  extraLines: string[]
) {
  const lines = items.map((item) => {
    const pack = item.packSize ? ` (${item.packSize})` : "";
    return `- ${item.name}${pack} x${item.quantity}`;
  });
  const extra = extraLines.length > 0 ? `${extraLines.join("\n")}\n\n` : "";
  return `${t("whatsappIntro")}\n\n${lines.join("\n")}\n\n${extra}${t("whatsappOutro")}`;
}

export default function CartDrawer() {
  const t = useTranslations("Cart");
  const tCheckout = useTranslations("Cart.checkout");
  const tOrder = useTranslations("Cart.order");
  const locale = useLocale();
  const { user, openProfile } = useAuth();
  const { items, isOpen, closeCart, removeItem, setQuantity, clear, totalCount } = useCart();
  const { addressId } = useActiveAddress();
  const { status: addressesStatus } = useAddresses();

  // Todo el estado del flujo vive en memoria del componente (nada en localStorage ni cookies).
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  // Fecha de entrega elegida, atada a la dirección activa: si cambia la dirección, la elección anterior deja
  // de aplicar sin necesidad de un efecto que la borre.
  const [chosenDate, setChosenDate] = useState<{ addressId: number; date: string } | null>(null);
  const selectedDate = chosenDate && chosenDate.addressId === addressId ? chosenDate.date : null;

  // Vista previa del servidor: precios, totales, mínimo y errores. Sin sesión o sin dirección no se llama.
  const order = useOrderPreview({ cartItems: items, addressId, deliveryDate: selectedDate, paymentMethod });
  const preview = order.preview;
  const expectPrices = !!user && addressId !== null;

  // Flujo de 4 pasos solo con la bandera encendida, sesión y dirección; si no, "cotización por WhatsApp".
  const flow = ORDERING_ENABLED && expectPrices;
  const currentStep: CheckoutStep = flow && items.length > 0 ? step : "cart";
  const selection = { deliveryDate: selectedDate, paymentMethod };

  const selectedLabel = selectedDate ? formatDeliveryDate(selectedDate, locale) : null;
  const extraLines: string[] = [];
  if (preview && !order.stale) {
    extraLines.push(tOrder("whatsappTotalLine", { total: formatColones(preview.totals.total, locale, 2) }));
  }
  if (selectedLabel) extraLines.push(tCheckout("whatsappDeliveryLine", { date: selectedLabel }));
  const whatsappHref = buildWhatsappHref(site.whatsappHref, buildOrderMessage(items, t, extraLines));

  const goTo = (target: CheckoutStep) => {
    setSubmit({ status: "idle" });
    setStep(target);
  };

  const changeAddress = () => {
    // La lista de direcciones vive en el perfil; el estado del pedido se conserva en memoria al volver.
    closeCart();
    openProfile();
  };

  const confirm = async () => {
    if (submit.status === "sending") return;
    setSubmit({ status: "sending" });
    const result = await submitOrder();
    setSubmit(result.ok ? { status: "done", orderNumber: result.orderNumber } : { status: "error", code: result.code });
  };

  const finish = () => {
    clear();
    setSubmit({ status: "idle" });
    setStep("cart");
    setTermsAccepted(false);
    setPaymentMethod(null);
    closeCart();
  };

  const orderingOff = submit.status === "error" && (submit.code === "ordering_disabled" || submit.code === "ordering_not_available");
  const done = submit.status === "done";

  // ----- Contenido del paso "Carrito" (también es todo el cuerpo en modo cotización por WhatsApp) -----
  const cartStep = (
    <>
      <p className="mb-3 text-[12.5px] font-semibold" style={{ color: TEXT_MUTED }}>
        {t("itemsCount", { count: totalCount })}
      </p>

      <CartLines items={items} preview={preview} expectPrices={expectPrices} onQuantity={setQuantity} onRemove={removeItem} />

      {expectPrices && (
        <div className="mt-6">
          {order.status === "error" ? (
            <div className="rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }} role="alert">
              <p className="flex items-start gap-2 text-[13.5px] font-medium leading-snug" style={{ color: INK }}>
                <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {order.error === "session" ? tOrder("sessionExpired") : tOrder("previewError")}
              </p>
              {order.error !== "session" && (
                <RetryLine message="" retryLabel={tCheckout("retry")} onRetry={order.retry} />
              )}
            </div>
          ) : preview ? (
            <OrderSummary preview={preview} stale={order.stale} />
          ) : order.status === "loading" ? (
            <div role="status" className="rounded-2xl border bg-white px-4 py-4" style={{ borderColor: RULE }}>
              <span className="sr-only">{tOrder("recalculating")}</span>
              <div className="flex flex-col gap-2.5" aria-hidden>
                <span className="h-3 w-2/5 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
                <span className="h-3 w-3/4 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
                <span className="h-6 w-1/2 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {user && addressId === null && addressesStatus === "ready" && (
        <p className="mt-6 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed" style={{ background: BEIGE, color: TEXT_MUTED }}>
          {tOrder("noAddressForPrices")}
        </p>
      )}

      {/* Sin el flujo de pasos: aviso de sesión o fechas de entrega (la elegida viaja en el WhatsApp). */}
      {!flow && <CartCheckoutInfo selectedDate={selectedDate} onSelectDate={(date) => addressId !== null && setChosenDate({ addressId, date })} />}
    </>
  );

  // ----- Motivo por el que no se puede continuar desde el carrito -----
  let cartBlockedReason: string | null = null;
  if (flow && currentStep === "cart" && preview && !order.stale) {
    if (hasLineErrors(preview)) cartBlockedReason = tOrder("blockedLineErrors");
    else if (hasError(preview, "price_list_missing")) cartBlockedReason = null; // el resumen ya lo explica
    else if (preview.belowMinimum) {
      cartBlockedReason = tOrder("minimumShortfall", { amount: formatColones(preview.shortfall, locale, 2) });
    }
  }
  // Carrito y entrega exigen una respuesta fresca del servidor (precios, mínimo, fecha válida); el pago solo depende
  // del método elegido, así que no se bloquea mientras se vuelve a validar.
  const advanceOk =
    canAdvance(currentStep, preview, selection) && order.status !== "error" && (currentStep === "payment" || (!order.stale && order.status === "ready"));

  const quoteButton = (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={PRIMARY_BUTTON}
      style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
    >
      <WhatsAppIcon className="h-[19px] w-[19px]" />
      {orderingOff ? tOrder("sendQuote") : t("checkoutCta")}
    </a>
  );

  const clearLink = (
    <button
      type="button"
      onClick={clear}
      className={`mx-auto mt-2.5 block rounded px-1 text-[13px] font-medium underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
      style={{ color: TEXT_MUTED }}
    >
      {t("clearCta")}
    </button>
  );

  const primaryStyle = { background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" } as const;

  return (
    // Este componente vive montado SIEMPRE en el Header; DrawerShell crea el portal solo ya
    // en el navegador (en el servidor no existe `document`).
    <DrawerShell isOpen={isOpen} onClose={closeCart} label={t("title")} name="cart">
      <DrawerHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        closeLabel={t("close")}
        onClose={closeCart}
        badge={
          totalCount > 0 ? (
            <span
              className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-extrabold leading-none"
              style={{ background: GOLD, color: INK }}
              aria-hidden
            >
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          ) : undefined
        }
      />

      {flow && items.length > 0 && !done && <CheckoutStepper current={currentStep} />}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8" style={{ background: BODY_BG }}>
          <div className="flex w-full max-w-[280px] flex-col items-center gap-3 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: BEIGE, boxShadow: `inset 0 0 0 2px ${GOLD}` }}
            >
              <ShoppingBag className="h-7 w-7" strokeWidth={1.6} style={{ color: INK }} aria-hidden />
            </span>
            <p className="font-display text-[18px] font-semibold" style={{ color: INK }}>
              {t("emptyTitle")}
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("empty")}
            </p>
          </div>
        </div>
      ) : (
        <DrawerBody>
          {currentStep === "cart" && cartStep}

          {currentStep === "delivery" && (
            <DeliveryStep
              selectedDate={selectedDate}
              onSelectDate={(date) => addressId !== null && setChosenDate({ addressId, date })}
              onChangeAddress={changeAddress}
            />
          )}

          {currentStep === "payment" && <PaymentStep value={paymentMethod} onChange={setPaymentMethod} />}

          {currentStep === "summary" &&
            (preview ? (
              <ConfirmStep
                preview={preview}
                stale={order.stale}
                deliveryDate={selectedDate}
                paymentMethod={paymentMethod}
                termsAccepted={termsAccepted}
                onTermsChange={setTermsAccepted}
                submit={submit}
              />
            ) : (
              <div className="rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }} role="alert">
                <p className="text-[13.5px] font-medium" style={{ color: INK }}>
                  {tOrder("previewError")}
                </p>
                <RetryLine message="" retryLabel={tCheckout("retry")} onRetry={order.retry} />
              </div>
            ))}
        </DrawerBody>
      )}

      {items.length > 0 && (
        <DrawerFooter>
          {/* Modo cotización: precios validados (si hay) y envío por WhatsApp, como siempre. */}
          {!flow && (
            <>
              <p className="mb-2.5 text-center text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
                {t("checkoutHint")}
              </p>
              {quoteButton}
              {clearLink}
            </>
          )}

          {flow && done && (
            <button type="button" onClick={finish} className={PRIMARY_BUTTON} style={primaryStyle}>
              {tOrder("done")}
            </button>
          )}

          {flow && !done && currentStep === "cart" && (
            <>
              {cartBlockedReason && (
                <p className="mb-2.5 text-center text-[12.5px] font-medium leading-snug" style={{ color: "#8A5A00" }} role="status">
                  {cartBlockedReason}
                </p>
              )}
              <button
                type="button"
                disabled={!advanceOk}
                onClick={() => goTo(nextStep(currentStep))}
                className={PRIMARY_BUTTON}
                style={primaryStyle}
              >
                {tOrder("continue")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mx-auto mt-2.5 block w-fit rounded px-1 text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
                style={{ color: "#075FD8" }}
              >
                {t("checkoutCta")}
              </a>
              {clearLink}
            </>
          )}

          {flow && !done && (currentStep === "delivery" || currentStep === "payment") && (
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <button type="button" onClick={() => goTo(previousStep(currentStep))} className={`${SECONDARY_BUTTON} !w-auto`} style={{ borderColor: RULE, color: INK }}>
                <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {tOrder("back")}
              </button>
              <button
                type="button"
                disabled={!advanceOk}
                onClick={() => goTo(nextStep(currentStep))}
                className={PRIMARY_BUTTON}
                style={primaryStyle}
              >
                {tOrder("continue")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          )}

          {flow && !done && currentStep === "summary" && (
            <>
              {orderingOff ? (
                quoteButton
              ) : (
                <button
                  type="button"
                  disabled={!preview?.canOrder || order.stale || !termsAccepted || submit.status === "sending"}
                  onClick={confirm}
                  className={PRIMARY_BUTTON}
                  style={primaryStyle}
                  aria-busy={submit.status === "sending"}
                >
                  {submit.status === "sending" ? tOrder("confirming") : tOrder("confirm")}
                </button>
              )}
              {preview && !preview.canOrder && !order.stale && (
                <p className="mt-2.5 text-center text-[12.5px] font-medium leading-snug" style={{ color: "#8A5A00" }} role="status">
                  {tOrder("reviewOrder")}
                </p>
              )}
              <button
                type="button"
                onClick={() => goTo("payment")}
                className={`mx-auto mt-2.5 flex items-center gap-1.5 rounded px-1 text-[13px] font-medium underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
                style={{ color: TEXT_MUTED }}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                {tOrder("back")}
              </button>
            </>
          )}
        </DrawerFooter>
      )}
    </DrawerShell>
  );
}
