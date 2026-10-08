"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActiveAddress } from "@/lib/addresses-context";
import { useCart } from "@/lib/cart-context";
import { formatDeliveryDate } from "@/lib/checkout-format";
import CartCheckoutInfo from "@/components/cart/CartCheckoutInfo";
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerShell } from "@/components/ui/Drawer";
import { BEIGE, BODY_BG, FOCUS_RING, GOLD, INK, MUTED, PRIMARY_BUTTON, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import { site } from "@/lib/data";
import { buildWhatsappHref } from "@/lib/utils";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import ProductImage from "@/components/modals/product-catalog/ProductImage";

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

export default function CartDrawer() {
  const t = useTranslations("Cart");
  const tCheckout = useTranslations("Cart.checkout");
  const locale = useLocale();
  const { items, isOpen, closeCart, removeItem, setQuantity, clear, totalCount } = useCart();
  const { addressId } = useActiveAddress();

  // Fecha de entrega elegida, atada a la dirección activa: si cambia la dirección,
  // la elección anterior deja de aplicar sin necesidad de un efecto que la borre.
  const [chosenDate, setChosenDate] = useState<{ addressId: number; date: string } | null>(null);
  const selectedDate = chosenDate && chosenDate.addressId === addressId ? chosenDate.date : null;

  const selectedLabel = selectedDate ? formatDeliveryDate(selectedDate, locale) : null;
  const deliveryLine = selectedLabel ? tCheckout("whatsappDeliveryLine", { date: selectedLabel }) : null;
  const whatsappHref = buildWhatsappHref(site.whatsappHref, buildOrderMessage(items, t, deliveryLine));

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
        </DrawerBody>
      )}

      {items.length > 0 && (
        <DrawerFooter>
          <p className="mb-2.5 text-center text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
            {t("checkoutHint")}
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={PRIMARY_BUTTON}
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
        </DrawerFooter>
      )}
    </DrawerShell>
  );
}
