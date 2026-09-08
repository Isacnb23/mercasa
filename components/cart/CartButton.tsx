"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-context";

// Mismo lenguaje visual que el resto de la barra (LocaleSwitcher: pill con
// borde/fondo navy translúcido) — el badge usa corp-yellow (el acento de
// marca que ya marca la línea bajo títulos/CTAs en todo el sitio), no un
// rojo genérico de e-commerce, para que se sienta parte de Mercasa y no un
// plugin de carrito pegado encima.
export default function CartButton() {
  const t = useTranslations("Cart");
  const { totalCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={t("openAria", { count: totalCount })}
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:-translate-y-0.5"
      style={{ borderColor: "rgba(8,43,92,0.14)", background: "rgba(8,43,92,0.04)" }}
    >
      <ShoppingCart
        className="h-[18px] w-[18px] transition group-hover:scale-105"
        strokeWidth={2}
        style={{ color: "#075FD8" }}
        aria-hidden
      />
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.span
            key={totalCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 22 }}
            className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10.5px] font-extrabold leading-none"
            style={{ background: "#FFD21A", color: "#082B5C", boxShadow: "0 2px 6px rgba(8,43,92,0.25)" }}
            aria-hidden
          >
            {totalCount > 99 ? "99+" : totalCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
