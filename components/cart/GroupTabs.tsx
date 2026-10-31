"use client";

import { useTranslations } from "next-intl";
import { FOCUS_RING, BODY_BG, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

// Id de la tarjeta de cada grupo del carrito: el ancla a la que lleva el selector de arriba.
export const GROUP_CARD_IDS = { delivery: "cart-card-delivery", pickup: "cart-card-pickup" } as const;

interface Props {
  deliveryCount: number;
  pickupCount: number;
}

// Selector/ancla "Domicilio (n) | Retiro (n)" que va fijo arriba del carrito cuando hay los dos grupos: lleva (scroll) a la
// tarjeta del grupo. No cambia nada del pedido; son atajos, no pestañas con contenido propio.
export default function GroupTabs({ deliveryCount, pickupCount }: Props) {
  const t = useTranslations("Cart.order");

  const go = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const tab = "min-h-[40px] flex-1 rounded-full px-3 text-[13.5px] font-semibold motion-safe:transition motion-safe:duration-150 hover:bg-white";

  return (
    <nav
      aria-label={t("groupTabsAria")}
      className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 px-5 pb-3 pt-5"
      style={{ background: BODY_BG, boxShadow: `0 1px 0 ${RULE}` }}
    >
      <div className="flex gap-1 rounded-full border p-1" style={{ borderColor: RULE, background: "#F1ECE4" }}>
        <button type="button" onClick={() => go(GROUP_CARD_IDS.delivery)} className={`${tab} ${FOCUS_RING}`} style={{ color: INK }}>
          {t("tabDelivery", { count: deliveryCount })}
        </button>
        <button type="button" onClick={() => go(GROUP_CARD_IDS.pickup)} className={`${tab} ${FOCUS_RING}`} style={{ color: TEXT_MUTED }}>
          {t("tabPickup", { count: pickupCount })}
        </button>
      </div>
    </nav>
  );
}
