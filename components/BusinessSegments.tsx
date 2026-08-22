"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Baby,
  Building2,
  ChefHat,
  Cookie,
  GlassWater,
  Hotel,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import Reveal from "./Reveal";
import { businessSegments } from "@/lib/data";

const segmentIcons = {
  store: Store,
  hotel: Hotel,
  "chef-hat": ChefHat,
  "shopping-bag": ShoppingBag,
  cookie: Cookie,
  building: Building2,
  "shopping-cart": ShoppingCart,
} as const;

// Mismos íconos por categoría que ya usa la sección de Productos — se
// reutilizan acá para que "categorías de producto" se lea como el mismo
// concepto en todo el sitio.
const categoryIcons = {
  alimentos: UtensilsCrossed,
  "bebe-cuidado": Baby,
  "hogar-institucional": Sparkles,
  bebidas: GlassWater,
} as const;

const ACCENT = "#075FD8";

/* Componente controlado: la categoría activa vive en ContactSection (el
   padre), no acá — el CTA único de WhatsApp al final de la sección necesita
   saber qué segmento está seleccionado para armar el mensaje, así que este
   bloque solo muestra el selector y la propuesta de valor, sin su propio
   botón de contacto. */
export default function BusinessSegments({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const t = useTranslations("Contact");
  const tBrands = useTranslations("Brands");
  const activeSegment = businessSegments.find((seg) => seg.key === activeKey) ?? businessSegments[0];

  return (
    <div>
      {/* ---------- Selector de segmento ---------- */}
      <Reveal once className="flex flex-wrap justify-center gap-3">
        {businessSegments.map((segment) => {
          const isActive = segment.key === activeKey;
          const Icon = segmentIcons[segment.icon as keyof typeof segmentIcons];
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => onSelect(segment.key)}
              aria-pressed={isActive}
              className="flex min-h-[44px] items-center gap-2.5 rounded-full px-[18px] text-[13.5px] font-medium transition duration-300"
              style={{
                border: `1px solid ${isActive ? ACCENT : "#D8E1EC"}`,
                background: isActive ? ACCENT : "#ffffff",
                color: isActive ? "#ffffff" : "#0c1a26",
                boxShadow: isActive ? "0 10px 24px rgba(7,95,216,0.25)" : "0 2px 8px rgba(16,37,63,0.05)",
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
              {t(`segments.${segment.key}.label`)}
            </button>
          );
        })}
      </Reveal>

      {/* ---------- Panel de resultado: propuesta de valor + categorías (sin CTA propio) ---------- */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSegment.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 flex max-w-[720px] flex-col items-center rounded-[22px] border bg-white p-7 text-center sm:p-9"
          style={{ borderColor: "#D8E1EC", boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
        >
          <p
            className="font-display text-corp-ink"
            style={{ fontSize: "clamp(19px, 2vw, 24px)", lineHeight: 1.35, fontWeight: 600 }}
          >
            {t(`segments.${activeSegment.key}.valuePhrase`)}
          </p>

          <p
            className="mt-6 text-[11.5px] font-semibold uppercase"
            style={{ letterSpacing: "0.14em", color: ACCENT }}
          >
            {t("segmentsCategoriesLabel")}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {activeSegment.categories.map((categoryKey) => {
              const CategoryIcon = categoryIcons[categoryKey as keyof typeof categoryIcons];
              return (
                <span
                  key={categoryKey}
                  className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium text-corp-ink"
                  style={{ background: "#F5F9FF", border: "1px solid rgba(7,95,216,0.18)" }}
                >
                  <CategoryIcon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} strokeWidth={1.8} aria-hidden />
                  {tBrands(`categories.${categoryKey}.label`)}
                </span>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
