"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-context";
import { site } from "@/lib/data";
import { buildWhatsappHref } from "@/lib/utils";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import ProductImage from "@/components/modals/product-catalog/ProductImage";

const INK = "#082B5C";
const ACCENT = "#075FD8";
const MUTED = "#8493A5";
const RULE = "#E2E8F0";
const CHIP_BG = "#F4F6F9";

// Arma el mensaje de WhatsApp con el detalle del pedido — mismo patrón que
// ContactSection/CustomerClassSection (buildWhatsappHref), sin precios (ver
// montar-carrito-en-base-al-catalogo.md): es una lista para que un vendedor
// cotice, no una transacción.
function buildOrderMessage(
  items: { name: string; packSize?: string; quantity: number }[],
  t: ReturnType<typeof useTranslations>
) {
  const lines = items.map((item) => {
    const pack = item.packSize ? ` (${item.packSize})` : "";
    return `- ${item.name}${pack} x${item.quantity}`;
  });
  return `${t("whatsappIntro")}\n\n${lines.join("\n")}\n\n${t("whatsappOutro")}`;
}

export default function CartDrawer() {
  const t = useTranslations("Cart");
  const { items, isOpen, closeCart, removeItem, setQuantity, clear, totalCount } = useCart();

  // Este componente vive montado SIEMPRE en el Header (a diferencia de
  // ProductCatalogModal, que solo se monta tras un click) — createPortal
  // corre en cada render, incluyendo el pase de servidor, donde `document`
  // no existe. `mounted` retrasa ese createPortal hasta después del primer
  // render en el cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const whatsappHref = buildWhatsappHref(site.whatsappHref, buildOrderMessage(items, t));

  if (!mounted) return null;

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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[310] flex w-full max-w-[440px] flex-col bg-white shadow-[0_0_70px_rgba(8,20,40,0.3)]"
          >
            {/* Header navy — mismo lenguaje que la barra del catálogo
                (ProductCatalogModal): chip de ícono + eyebrow + título, no un
                header blanco genérico. */}
            <div
              className="relative flex items-center justify-between gap-3 overflow-hidden px-6 py-5"
              style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)` }}
            >
              <svg
                className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 opacity-[0.08]"
                viewBox="0 0 320 320"
                fill="none"
                aria-hidden
              >
                <circle cx="160" cy="160" r="140" stroke="#fff" strokeWidth="1.5" />
                <circle cx="160" cy="160" r="95" stroke="#fff" strokeWidth="1.5" />
              </svg>
              <div className="relative flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12">
                  <ShoppingBag className="h-5 w-5 text-white" strokeWidth={1.7} aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase text-white/60" style={{ letterSpacing: "0.16em" }}>
                    {t("eyebrow")}
                  </p>
                  <p className="font-display text-[19px] font-semibold leading-tight text-white">{t("title")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label={t("close")}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <X className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: CHIP_BG }}
                >
                  <ShoppingCart className="h-7 w-7" strokeWidth={1.5} style={{ color: MUTED }} aria-hidden />
                </span>
                <p className="font-display text-[16px] font-semibold" style={{ color: INK }}>
                  {t("emptyTitle")}
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: MUTED }}>
                  {t("empty")}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <span
                  className="mb-3 inline-block text-[11px] font-bold uppercase"
                  style={{ color: MUTED, letterSpacing: "0.1em" }}
                >
                  {t("itemsCount", { count: totalCount })}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border bg-white p-2.5 transition hover:shadow-[0_4px_16px_rgba(8,43,92,0.08)]"
                      style={{ borderColor: RULE }}
                    >
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                        style={{ background: CHIP_BG }}
                      >
                        <ProductImage itemId={item.id} name={item.name} size="s" className="h-full w-full object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug" style={{ color: INK }}>
                          {item.name}
                        </p>
                        {item.packSize && (
                          <p className="mt-0.5 text-[11.5px] font-medium" style={{ color: MUTED }}>
                            {item.packSize}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            aria-label={t("decreaseAria", { name: item.name })}
                            className="flex h-[26px] w-[26px] items-center justify-center rounded-full transition hover:opacity-75"
                            style={{ background: CHIP_BG, color: ACCENT }}
                          >
                            <Minus className="h-3 w-3" strokeWidth={2.4} aria-hidden />
                          </button>
                          <span className="w-5 text-center text-[13px] font-bold" style={{ color: INK }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            aria-label={t("increaseAria", { name: item.name })}
                            className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-white transition hover:opacity-85"
                            style={{ background: ACCENT }}
                          >
                            <Plus className="h-3 w-3" strokeWidth={2.4} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={t("removeAria", { name: item.name })}
                        className="shrink-0 self-start rounded-full p-2 transition hover:bg-red-50"
                        style={{ color: MUTED }}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex flex-col gap-3 px-5 py-5" style={{ borderTop: `1px solid ${RULE}` }}>
                <p className="text-center text-[12.5px]" style={{ color: MUTED }}>
                  {t("checkoutHint")}
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 rounded-full bg-corp-blue py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(11,46,95,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                >
                  <WhatsAppIcon className="h-[19px] w-[19px]" />
                  {t("checkoutCta")}
                </a>
                <button
                  type="button"
                  onClick={clear}
                  className="text-[12.5px] font-semibold underline underline-offset-4 transition hover:opacity-70"
                  style={{ color: MUTED }}
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
