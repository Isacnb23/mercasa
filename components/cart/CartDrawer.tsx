"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActiveAddress } from "@/lib/addresses-context";
import { useCart } from "@/lib/cart-context";
import { formatDeliveryDate } from "@/lib/checkout-format";
import CartCheckoutInfo from "@/components/cart/CartCheckoutInfo";
import { site } from "@/lib/data";
import { buildWhatsappHref } from "@/lib/utils";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import ProductImage from "@/components/modals/product-catalog/ProductImage";

// Paleta de marca (navy / beige / dorado del resto del sitio). TEXT_MUTED es el gris para
// texto legible (contraste AA sobre blanco y beige); MUTED (#8493A5) solo para detalles
// decorativos como íconos.
const INK = "#082B5C";
const TEXT_MUTED = "#5C6B7D";
const MUTED = "#8493A5";
const RULE = "#E9E3D8";
const BEIGE = "#F1ECE4";
const BODY_BG = "#FBF9F5";
const GOLD = "#FFD21A";

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2";

// Arma el mensaje de WhatsApp con el detalle del pedido — mismo patrón que
// ContactSection/CustomerClassSection (buildWhatsappHref), sin precios (ver
// montar-carrito-en-base-al-catalogo.md): es una lista para que un vendedor
// cotice, no una transacción.
function buildOrderMessage(
  items: { name: string; packSize?: string; quantity: number }[],
  t: ReturnType<typeof useTranslations>,
  deliveryLine: string | null
) {
  const lines = items.map((item) => {
    const pack = item.packSize ? ` (${item.packSize})` : "";
    return `- ${item.name}${pack} x${item.quantity}`;
  });
  // La fecha elegida (si hay) va como línea propia; no se incluye la dirección.
  const delivery = deliveryLine ? `${deliveryLine}\n\n` : "";
  return `${t("whatsappIntro")}\n\n${lines.join("\n")}\n\n${delivery}${t("whatsappOutro")}`;
}

const subscribeNoop = () => () => {};

export default function CartDrawer() {
  const t = useTranslations("Cart");
  const tCheckout = useTranslations("Cart.checkout");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const { items, isOpen, closeCart, removeItem, setQuantity, clear, totalCount } = useCart();
  const { addressId } = useActiveAddress();

  // Fecha de entrega elegida, atada a la dirección activa: si cambia la dirección,
  // la elección anterior deja de aplicar sin necesidad de un efecto que la borre.
  const [chosenDate, setChosenDate] = useState<{ addressId: number; date: string } | null>(null);
  const selectedDate = chosenDate && chosenDate.addressId === addressId ? chosenDate.date : null;

  // Este componente vive montado SIEMPRE en el Header (a diferencia de
  // ProductCatalogModal, que solo se monta tras un click) — createPortal
  // corre en cada render, incluyendo el pase de servidor, donde `document`
  // no existe. `mounted` es false en el servidor y true en el cliente, así el
  // portal solo se crea ya en el navegador.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  const selectedLabel = selectedDate ? formatDeliveryDate(selectedDate, locale) : null;
  const deliveryLine = selectedLabel ? tCheckout("whatsappDeliveryLine", { date: selectedLabel }) : null;
  const whatsappHref = buildWhatsappHref(site.whatsappHref, buildOrderMessage(items, t, deliveryLine));

  if (!mounted) return null;

  // Con "reducir movimiento" el panel solo aparece con un fundido (sin deslizarse).
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(8,20,40,0.45)", backdropFilter: "blur(2px)" }}
            onClick={closeCart}
            aria-hidden
          />
          <motion.div
            key="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            {...panelMotion}
            transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[310] flex w-full max-w-[440px] flex-col overflow-hidden bg-white shadow-[0_0_60px_rgba(8,20,40,0.22)] md:rounded-l-[28px]"
          >
            {/* Encabezado claro: título grande en navy con la cantidad al lado, cierre discreto
                y una línea divisoria sutil (sin bloque de color). */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-6 pb-4 pt-6" style={{ borderColor: RULE }}>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.14em" }}>
                  {t("eyebrow")}
                </p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <h2 className="font-display text-[24px] font-semibold leading-tight" style={{ color: INK }}>
                    {t("title")}
                  </h2>
                  {totalCount > 0 && (
                    <span
                      className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[12px] font-extrabold leading-none"
                      style={{ background: GOLD, color: INK }}
                      aria-hidden
                    >
                      {totalCount > 99 ? "99+" : totalCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label={t("close")}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] ${FOCUS_RING}`}
                style={{ borderColor: RULE, color: INK }}
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>

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
              // Cuerpo con scroll propio (encabezado y pie quedan fijos). `data-lenis-prevent`
              // evita que el scroll suave del sitio capture la rueda/gesto dentro del panel.
              <div
                data-lenis-prevent
                className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5"
                style={{ background: BODY_BG }}
              >
                <p className="mb-3 text-[12.5px] font-semibold" style={{ color: TEXT_MUTED }}>
                  {t("itemsCount", { count: totalCount })}
                </p>
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3.5 rounded-2xl border bg-white p-3 sm:gap-4 sm:p-3.5"
                      style={{ borderColor: RULE }}
                    >
                      <div
                        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-20 sm:w-20"
                        style={{ background: BEIGE }}
                      >
                        <ProductImage itemId={item.id} name={item.name} size="s" className="h-full w-full object-contain p-2" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[14px] font-medium leading-snug" style={{ color: INK }}>
                          {item.name}
                        </p>
                        {item.packSize && (
                          <p className="mt-0.5 text-[12px] font-medium" style={{ color: TEXT_MUTED }}>
                            {item.packSize}
                          </p>
                        )}
                        {/* Selector de cantidad como pastilla compacta. */}
                        <div className="mt-3 inline-flex items-center rounded-full p-0.5" style={{ background: BEIGE }}>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            aria-label={t("decreaseAria", { name: item.name })}
                            className={`flex h-8 w-8 items-center justify-center rounded-full motion-safe:transition motion-safe:duration-150 hover:bg-white ${FOCUS_RING}`}
                            style={{ color: INK }}
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                          </button>
                          <span className="min-w-[32px] text-center text-[14px] font-bold tabular-nums" style={{ color: INK }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            aria-label={t("increaseAria", { name: item.name })}
                            className={`flex h-8 w-8 items-center justify-center rounded-full motion-safe:transition motion-safe:duration-150 hover:bg-white ${FOCUS_RING}`}
                            style={{ color: INK }}
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={t("removeAria", { name: item.name })}
                        className={`shrink-0 self-start rounded-full p-2 motion-safe:transition motion-safe:duration-150 hover:bg-red-50 hover:text-red-700 ${FOCUS_RING}`}
                        style={{ color: MUTED }}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <CartCheckoutInfo
                  selectedDate={selectedDate}
                  onSelectDate={(date) => addressId !== null && setChosenDate({ addressId, date })}
                />
              </div>
            )}

            {items.length > 0 && (
              // Pie fijo: superficie blanca con sombra superior suave, botón principal a todo
              // el ancho (≥ 48 px) y "Vaciar carrito" como enlace secundario discreto.
              <div
                className="shrink-0 bg-white px-5 pb-4 pt-3.5"
                style={{ boxShadow: "0 -10px 28px -14px rgba(8,43,92,0.22)" }}
              >
                <p className="mb-2.5 text-center text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
                  {t("checkoutHint")}
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-[50px] items-center justify-center gap-2.5 rounded-full px-5 text-[15px] font-semibold text-white motion-safe:transition motion-safe:duration-200 hover:brightness-110 motion-safe:hover:-translate-y-0.5 ${FOCUS_RING}`}
                  style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
                >
                  <WhatsAppIcon className="h-[19px] w-[19px]" />
                  {t("checkoutCta")}
                </a>
                <button
                  type="button"
                  onClick={clear}
                  className={`mx-auto mt-2.5 block rounded px-1 text-[13px] font-medium underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
                  style={{ color: TEXT_MUTED }}
                >
                  {t("clearCta")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
