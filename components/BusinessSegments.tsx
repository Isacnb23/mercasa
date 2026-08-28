"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Baby,
  Building2,
  Check,
  ChefHat,
  Cookie,
  Droplets,
  GlassWater,
  Hotel,
  Landmark,
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

// Ícono por chip de categoría — ahora son las 6 keys reales (ver
// customer-class-chips-reales.md), ya no las 4 etiquetas compuestas
// viejas. "institucional" usa un ícono distinto al de la SEGMENT
// "instituciones" (Building2) para que no se repita el mismo dibujo dos
// veces en la misma pantalla cuando ese segmento está activo.
const categoryIcons = {
  alimentos: UtensilsCrossed,
  bebidas: GlassWater,
  "cuidado-del-bebe": Baby,
  "higiene-personal": Droplets,
  "limpieza-del-hogar": Sparkles,
  institucional: Landmark,
} as const;

const ACCENT = "#075FD8";

/* Componente controlado: la categoría activa vive en ContactSection (el
   padre), no acá — el CTA único de WhatsApp al final de la sección necesita
   saber qué segmento está seleccionado para armar el mensaje, así que este
   bloque solo muestra el selector y la propuesta de valor, sin su propio
   botón de contacto. `onSelectCategory` (ver customer-class-chips-reales.md)
   también vive en el padre — ahí es donde está la data real del catálogo
   (`families`) para resolver a qué Familia/Sub-familia abrir. */
export default function BusinessSegments({
  activeKey,
  onSelect,
  onSelectCategory,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
  onSelectCategory: (categoryKey: string) => void;
}) {
  const t = useTranslations("Contact");
  const activeSegment = businessSegments.find((seg) => seg.key === activeKey) ?? businessSegments[0];

  return (
    <div>
      {/* ---------- Selector de segmento ---------- */}
      <Reveal className="mb-6 text-center">
        <p
          className="text-[15px] font-bold uppercase"
          style={{ letterSpacing: "0.1em", color: ACCENT }}
        >
          {t("segmentsSelectorLabel")}
        </p>
      </Reveal>
      <Reveal className="flex flex-wrap justify-center gap-3.5">
        {businessSegments.map((segment) => {
          const isActive = segment.key === activeKey;
          const Icon = segmentIcons[segment.icon as keyof typeof segmentIcons];
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => onSelect(segment.key)}
              aria-pressed={isActive}
              className="flex min-h-[56px] items-center gap-3 rounded-full px-7 text-[15px] font-semibold transition duration-300"
              style={{
                border: `2px solid ${isActive ? ACCENT : "#D8E1EC"}`,
                background: isActive ? ACCENT : "#ffffff",
                color: isActive ? "#ffffff" : "#0c1a26",
                boxShadow: isActive ? "0 16px 36px rgba(7,95,216,0.32)" : "0 2px 8px rgba(16,37,63,0.05)",
              }}
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.8} aria-hidden />
              {t(`segments.${segment.key}.label`)}
              {/* Indicador extra de "elegido" además del fondo navy sólido —
                  ver ajuste-customer-class-y-mapa.md. */}
              {isActive && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </Reveal>

      {/* ---------- Panel de resultado: propuesta de valor + categorías (sin CTA propio) ----------
          Ya no tiene su propio fondo blanco/borde/sombra — vive DENTRO de la
          tarjeta blanca que ahora envuelve todo el bloque (ver
          ContactSection.tsx), así que un segundo cuadro blanco encimado se
          hubiera visto como una caja dentro de otra caja. Se distingue con un
          tinte celeste suave en vez de repetir blanco+sombra. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSegment.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 flex max-w-[720px] flex-col items-center rounded-[22px] p-7 text-center sm:p-9"
          style={{ background: "#F5F9FF" }}
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
                <button
                  key={categoryKey}
                  type="button"
                  onClick={() => onSelectCategory(categoryKey)}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-corp-ink transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_8px_20px_rgba(7,95,216,0.18)]"
                  style={{ border: "1px solid rgba(7,95,216,0.18)" }}
                >
                  <CategoryIcon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} strokeWidth={1.8} aria-hidden />
                  {t(`segmentCategories.${categoryKey}.label`)}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
