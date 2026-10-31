"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActiveAddress, useAddresses } from "@/lib/addresses-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { itemsInChannel, resolvePickupSite } from "@/lib/cart-logic";
import type { CartChannel } from "@/lib/cart-types";
import { formatColones, formatDeliveryDate } from "@/lib/checkout-format";
import { ORDERING_ENABLED } from "@/lib/feature-flags";
import { canAdvance, groupFor, hasError, hasLineErrors, isPickupDateInvalid, nextStep, previousStep } from "@/lib/order-logic";
import { useOrderPreview } from "@/lib/order-preview";
import { usePickupDates } from "@/lib/checkout-info";
import { onAccountStateCleared } from "@/lib/account-state";
import { submitOrder } from "@/lib/order-submit";
import {
  buildCreateOrderBody,
  buildCreateOrderContent,
  createOrderContentKey,
  resolveRequestId,
  type RequestIdState,
} from "@/lib/order-create";
import type { CheckoutStep, PaymentMethod } from "@/lib/order-types";
import CartCheckoutInfo from "@/components/cart/CartCheckoutInfo";
import CartLines from "@/components/cart/CartLines";
import CheckoutStepper from "@/components/cart/CheckoutStepper";
import ConfirmStep, { type SubmitState } from "@/components/cart/ConfirmStep";
import DeliveryStep from "@/components/cart/DeliveryStep";
import GroupTabs, { GROUP_CARD_IDS } from "@/components/cart/GroupTabs";
import OrderSummary, { GrandTotal } from "@/components/cart/OrderSummary";
import PickupDates from "@/components/cart/PickupDates";
import PickupSiteSelector from "@/components/cart/PickupSiteSelector";
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
import { unitLabel } from "@/lib/presentations";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

// Arma el mensaje de WhatsApp con el detalle del pedido — mismo patrón que
// ContactSection/CustomerClassSection (buildWhatsappHref): una lista para que un vendedor cotice, no una
// transacción. Puede incluir el total estimado validado por el servidor y la fecha elegida; nunca la dirección.
function buildOrderMessage(
  items: { name: string; packSize?: string; quantity: number; unitId?: string; channel?: CartChannel }[],
  t: ReturnType<typeof useTranslations>,
  extraLines: string[],
  locale: string,
  pickupLabel: string
) {
  const lines = items.map((item) => {
    const pack = item.packSize ? ` (${item.packSize})` : "";
    const unit = item.unitId ? ` ${unitLabel(item.unitId, locale)}` : "";
    // Las líneas de retiro en tienda se marcan para que el vendedor las distinga de las de domicilio.
    const channel = item.channel === "pickup" ? ` [${pickupLabel}]` : "";
    return `- ${item.name}${pack} x${item.quantity}${unit}${channel}`;
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
  const { items, isOpen, closeCart, removeItem, setQuantity, changeUnit, clear, totalCount, pickupSiteId, setPickupSite, pickupDate, setPickupDate } = useCart();
  const { addressId, revision: addressRevision } = useActiveAddress();
  const { status: addressesStatus } = useAddresses();

  // Todo el estado del flujo vive en memoria del componente (nada en localStorage ni cookies).
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  // Instrucciones de entrega opcionales del pedido.
  const [notes, setNotes] = useState("");
  // requestId de la confirmación: NUEVO por cada pantalla de pago (se descarta al abrirla) y el MISMO en los reintentos de esa
  // confirmación (timeout o red), para que un doble clic o un reintento no duplique el pedido. Se descarta tras un 201/202.
  const requestIdRef = useRef<RequestIdState | null>(null);
  // Evita dos envíos simultáneos aunque el estado de React todavía no se haya actualizado (doble clic muy rápido).
  const submittingRef = useRef(false);

  // Fecha de entrega elegida, atada a la dirección activa: si cambia la dirección, la elección anterior deja
  // de aplicar sin necesidad de un efecto que la borre.
  // La fecha elegida vale solo para esa dirección Y esa versión de ella: si se edita (cambian sus días de entrega), se vuelve a elegir.
  const [chosenDate, setChosenDate] = useState<{ addressId: number; revision: number; date: string } | null>(null);
  const selectedDate = chosenDate && chosenDate.addressId === addressId && chosenDate.revision === addressRevision ? chosenDate.date : null;

  // Cierre de sesión o sesión expirada: los borradores del checkout son de la cuenta y se descartan (las líneas del carrito no).
  useEffect(
    () =>
      onAccountStateCleared(() => {
        setStep("cart");
        setPaymentMethod(null);
        setTermsAccepted(false);
        setSubmit({ status: "idle" });
        setNotes("");
        setChosenDate(null);
        requestIdRef.current = null;
      }),
    [],
  );

  // Dos grupos: domicilio y retiro en tienda (una línea por producto, presentación y canal).
  const deliveryItems = itemsInChannel(items, "delivery");
  const pickupItems = itemsInChannel(items, "pickup");
  const present = { delivery: deliveryItems.length > 0, pickup: pickupItems.length > 0 };
  const deliveryCount = deliveryItems.reduce((sum, item) => sum + item.quantity, 0);
  const pickupCount = pickupItems.reduce((sum, item) => sum + item.quantity, 0);
  // Tienda de retiro: la elegida o, sin elección, una propuesta donde haya existencia de lo que lleva el cliente.
  const pickupSite = resolvePickupSite(items, pickupSiteId);

  // Vista previa del servidor: precios, totales, mínimo y errores por grupo. Sin sesión no se llama; el grupo de
  // domicilio necesita además una dirección y el de retiro, una tienda.
  // Fechas de retiro (solo con grupo de retiro, sesión y tienda). La fecha elegida solo viaja si sigue entre las ofrecidas.
  const pickupDates = usePickupDates(!!user && present.pickup && pickupSite !== null);
  const selectedPickupDate = pickupDate && pickupDates.data?.dates.includes(pickupDate) ? pickupDate : null;
  const order = useOrderPreview({ cartItems: items, addressId, addressRevision, deliveryDate: selectedDate, paymentMethod, pickupSiteId: pickupSite, pickupDate: selectedPickupDate });
  const preview = order.preview;
  const expectDelivery = !!user && addressId !== null;
  const expectPickup = !!user && present.pickup && pickupSite !== null;
  const expectPrices = expectDelivery || expectPickup;

  // Flujo de 4 pasos solo con la bandera encendida y sesión, y (si hay domicilio) con dirección; si no, "cotización
  // por WhatsApp". Un carrito solo de retiro no necesita dirección.
  const flow = ORDERING_ENABLED && expectPrices && (!present.delivery || expectDelivery) && (!present.pickup || expectPickup);
  const currentStep: CheckoutStep = flow && items.length > 0 ? step : "cart";
  const selection = { deliveryDate: selectedDate, paymentMethod, pickupDate: selectedPickupDate };

  const selectedLabel = selectedDate ? formatDeliveryDate(selectedDate, locale) : null;
  const extraLines: string[] = [];
  if (preview && !order.stale) {
    extraLines.push(tOrder("whatsappTotalLine", { total: formatColones(preview.grandTotals.total, locale, 2) }));
  }
  if (selectedLabel) extraLines.push(tCheckout("whatsappDeliveryLine", { date: selectedLabel }));
  const pickupLabel = present.pickup && selectedPickupDate ? formatDeliveryDate(selectedPickupDate, locale) : null;
  if (pickupLabel) extraLines.push(tCheckout("whatsappPickupLine", { date: pickupLabel }));
  const whatsappHref = buildWhatsappHref(site.whatsappHref, buildOrderMessage(items, t, extraLines, locale, tOrder("groupPickupTitle")));

  const goTo = (target: CheckoutStep) => {
    if (submittingRef.current) return;
    // Abrir la pantalla de pago desde otro paso empieza una confirmación nueva (otro requestId). Volver del resumen al pago
    // conserva el mismo: es la misma confirmación.
    if (target === "payment" && step !== "summary") requestIdRef.current = null;
    setSubmit({ status: "idle" });
    setStep(target);
  };

  const changeAddress = () => {
    // La lista de direcciones vive en el perfil; el estado del pedido se conserva en memoria al volver.
    closeCart();
    openProfile();
  };

  const confirm = async () => {
    if (submittingRef.current || submit.status === "sending") return;

    // Zonas que se coordinan con servicio al cliente no tienen fecha: no se puede pedir en línea todavía.
    if (present.delivery && preview?.delivery.requiresCoordination) {
      setSubmit({ status: "error", code: "delivery_coordination_not_supported" });
      return;
    }

    // Solo ids, cantidades y selecciones: nunca precios, totales ni la cuenta (sale del JWT en el servidor).
    const content = buildCreateOrderContent(items, { addressId, deliveryDate: selectedDate, paymentMethod, pickupSiteId: pickupSite }, notes);
    if (!content) {
      setSubmit({ status: "error", code: "invalid_request" });
      return;
    }

    requestIdRef.current = resolveRequestId(requestIdRef.current, createOrderContentKey(content));
    submittingRef.current = true;
    setSubmit({ status: "sending" });
    try {
      const result = await submitOrder(buildCreateOrderBody(content, requestIdRef.current.id));
      if (result.ok) {
        requestIdRef.current = null; // el pedido ya salió: el próximo es otro
        setSubmit({ status: "done", kind: result.kind, orderNumber: result.orderNumber });
      } else {
        setSubmit({ status: "error", code: result.code, errors: result.errors });
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const openOrders = () => {
    closeCart();
    openProfile();
  };

  const finish = () => {
    clear();
    setSubmit({ status: "idle" });
    setStep("cart");
    setTermsAccepted(false);
    setPaymentMethod(null);
    setNotes("");
    requestIdRef.current = null;
    closeCart();
  };

  const orderingOff = submit.status === "error" && (submit.code === "ordering_disabled" || submit.code === "ordering_not_available");
  const done = submit.status === "done";

  // ----- Contenido del paso "Carrito" (también es todo el cuerpo en modo cotización por WhatsApp) -----
  // Cada grupo es una tarjeta autocontenida.
  //   Domicilio: productos -> fecha de entrega -> mínimo (barra compacta) -> flete -> total del envío.
  //   Retiro:    tienda -> fecha de retiro -> productos -> total del retiro (sin bloque de mínimo cuando es 0).
  // Con el flujo de pasos las fechas se eligen en el paso "Entrega"; sin él (cotización por WhatsApp) van dentro de la tarjeta.
  const groupSection = (channel: CartChannel) => {
    const groupItems = channel === "delivery" ? deliveryItems : pickupItems;
    if (groupItems.length === 0) return null;
    const expect = channel === "delivery" ? expectDelivery : expectPickup;
    const groupCount = groupItems.reduce((sum, item) => sum + item.quantity, 0);
    const group = preview ? groupFor(preview, channel) : null;
    const titleId = `cart-group-${channel}`;

    return (
      <section
        key={channel}
        id={GROUP_CARD_IDS[channel]}
        aria-labelledby={titleId}
        className="mb-5 scroll-mt-20 rounded-3xl border p-3.5 last:mb-0 sm:p-4"
        style={{ borderColor: RULE, background: BEIGE }}
      >
        <h3 id={titleId} className="mb-3 flex items-baseline justify-between gap-3 font-display text-[16px] font-semibold" style={{ color: INK }}>
          {channel === "delivery" ? tOrder("groupDeliveryTitle") : tOrder("groupPickupTitle")}
          <span className="text-[12.5px] font-semibold" style={{ color: TEXT_MUTED }}>
            {t("itemsCount", { count: groupCount })}
          </span>
        </h3>

        {channel === "pickup" && preview?.pickupGroup && (
          <div className="mb-4 flex flex-col gap-4">
            <PickupSiteSelector
              sites={preview.pickupGroup.sites}
              selectedId={preview.pickupGroup.siteId}
              proposed={pickupSiteId === null}
              onSelect={setPickupSite}
            />
            {!flow && preview.pickupGroup.siteId !== "" && (
              <PickupDates
                dates={pickupDates}
                selectedDate={selectedPickupDate}
                onSelectDate={setPickupDate}
                invalid={isPickupDateInvalid(preview)}
              />
            )}
          </div>
        )}

        <CartLines
          items={groupItems}
          channel={channel}
          preview={preview}
          expectPrices={expect}
          onQuantity={(item, quantity) => setQuantity(item.id, quantity, item.unitId, item.channel)}
          onRemove={(item) => removeItem(item.id, item.unitId, item.channel)}
          onChangeUnit={(item, unitId) => changeUnit(item.id, item.unitId, unitId, item.channel)}
        />

        {channel === "delivery" && !flow && user && (
          <div className="mb-1">
            <CartCheckoutInfo selectedDate={selectedDate} onSelectDate={(date) => addressId !== null && setChosenDate({ addressId, revision: addressRevision, date })} />
          </div>
        )}

        {expect && preview && group && !order.error && (
          <div className="mt-4">
            <OrderSummary preview={preview} channel={channel} stale={order.stale} deliveryDate={channel === "delivery" ? selectedDate : undefined} />
          </div>
        )}
      </section>
    );
  };

  const cartStep = (
    <>
      {present.delivery && present.pickup && <GroupTabs deliveryCount={deliveryCount} pickupCount={pickupCount} />}
      {groupSection("delivery")}
      {groupSection("pickup")}

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
          ) : !preview && order.status === "loading" ? (
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

      {user && present.delivery && addressId === null && addressesStatus === "ready" && (
        <p className="mt-6 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed" style={{ background: BEIGE, color: TEXT_MUTED }}>
          {present.pickup ? tOrder("noAddressForDelivery") : tOrder("noAddressForPrices")}
        </p>
      )}

      {/* Sin el flujo de pasos y sin sesión: aviso para iniciar sesión (las fechas van dentro de cada tarjeta). */}
      {!flow && !user && <CartCheckoutInfo selectedDate={selectedDate} onSelectDate={() => {}} />}
    </>
  );

  // ----- Motivo por el que no se puede continuar desde el carrito -----
  let cartBlockedReason: string | null = null;
  if (flow && currentStep === "cart" && preview && !order.stale) {
    const belowMinimum = [preview.deliveryGroup, preview.pickupGroup].find((g) => g?.belowMinimum);
    if (hasLineErrors(preview)) cartBlockedReason = tOrder("blockedLineErrors");
    else if (hasError(preview, "price_list_missing")) cartBlockedReason = null; // el resumen ya lo explica
    else if (belowMinimum) {
      cartBlockedReason = tOrder("minimumShortfall", { amount: formatColones(belowMinimum.shortfall, locale, 2) });
    }
  }
  // Motivo por el que no se puede continuar desde la entrega: con retiro, la fecha es obligatoria y no puede estar rechazada.
  let deliveryBlockedReason: string | null = null;
  if (flow && currentStep === "delivery" && preview && !order.stale && present.pickup) {
    if (isPickupDateInvalid(preview)) deliveryBlockedReason = tOrder("pickupDateInvalid");
    else if (!selectedPickupDate) deliveryBlockedReason = tOrder("pickupDateRequired");
  }
  // Carrito y entrega exigen una respuesta fresca del servidor (precios, mínimo, fecha válida); el pago solo depende
  // del método elegido, así que no se bloquea mientras se vuelve a validar.
  const advanceOk =
    canAdvance(currentStep, preview, selection, present) && order.status !== "error" && (currentStep === "payment" || (!order.stale && order.status === "ready"));

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
              onSelectDate={(date) => addressId !== null && setChosenDate({ addressId, revision: addressRevision, date })}
              onChangeAddress={changeAddress}
              showDelivery={present.delivery}
              pickup={
                present.pickup
                  ? {
                      group: preview?.pickupGroup ?? null,
                      proposed: pickupSiteId === null,
                      onSelectSite: setPickupSite,
                      dates: pickupDates,
                      selectedDate: selectedPickupDate,
                      onSelectDate: setPickupDate,
                    }
                  : null
              }
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
                notes={notes}
                onNotesChange={setNotes}
                onOpenOrders={openOrders}
                contactHref={site.whatsappHref}
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
          {/* Total general con el total de cada grupo (cuando hay los dos), siempre a la vista junto al botón. */}
          {currentStep === "cart" && expectPrices && preview && !order.error && (
            <div className="mb-2.5">
              <GrandTotal preview={preview} stale={order.stale} compact />
            </div>
          )}

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

          {flow && !done && deliveryBlockedReason && (
            <p className="mb-2.5 text-center text-[12.5px] font-medium leading-snug" style={{ color: "#8A5A00" }} role="status">
              {deliveryBlockedReason}
            </p>
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
