"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, Package } from "lucide-react";
import type { HierarchyNode } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import Reveal from "../../ui/Reveal";
import ProductCatalogModal from "../../modals/product-catalog/ProductCatalogModal";

// Rediseño completo (ver productos-rediseno-referencia.md y
// reference/productos-target.png): reemplaza por completo el enfoque
// anterior de acordeón (sidebar de familias + panel de categorías con
// dropdowns, ver fix-product-explorer-acordeon.md y docs relacionados) por
// una grilla simple de tarjetas, una por familia — sin subniveles de
// categoría navegables acá, el click lleva directo al catálogo completo de
// esa familia (ProductCatalogModal ya resuelve categorías/sub-familias
// adentro).
const NAVY = "#0B2F63";
const ACCENT = "#2F6FED";
const MUTED = "#5C6B7D";
const CARD_BORDER = "#E7ECF2";
const ICON_BG = "#E6F1FB";
const FEATURED_BG = "#EAF3FC";
const STRIPE_BG = "#0B2947";

export default function ProductExplorer({ families }: { families: HierarchyNode[] }) {
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;

  const openCatalog = (familyId: string) => setCatalogFamilyId(familyId);
  const closeCatalog = () => setCatalogFamilyId(null);

  // "Destacada" = la familia con más productos reales (ver productos-
  // rediseno-referencia.md, punto de la tarjeta "Alimentos" en la
  // referencia) — dato real, no fija a mano ni a la primera de la lista.
  const featuredId = families.reduce<{ id: string; count: number } | null>(
    (best, f) => (!best || f.itemCount > best.count ? { id: f.id, count: f.itemCount } : best),
    null
  )?.id;

  return (
    <div className="mt-10 lg:mt-14">
      {catalogFamily && (
        <ProductCatalogModal family={catalogFamily} allFamilies={families} onClose={closeCatalog} />
      )}

      {/* Wrapper relativo: ancla tanto la franja navy full-bleed (que se
          escapa del <Container> con el truco left-1/2 + -mx-[50vw] +
          w-screen) como la fila de tarjetas, que queda por encima (z-10). */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-1/2 bottom-[-40px] top-[160px] -mx-[50vw] w-screen overflow-hidden sm:top-[190px] lg:top-[210px]"
          style={{ background: STRIPE_BG }}
        >
          <StripePattern />
        </div>

        <div
          className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 pt-4 [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {families.map((family, i) => (
            <Reveal key={family.id} delay={i * 0.05} className="shrink-0 snap-start">
              <FamilyCard
                family={family}
                isFeatured={family.id === featuredId}
                onOpenCatalog={() => openCatalog(family.id)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyCard({
  family,
  isFeatured,
  onOpenCatalog,
}: {
  family: HierarchyNode;
  isFeatured: boolean;
  onOpenCatalog: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;

  return (
    <motion.div
      initial={false}
      animate={{ y: isFeatured ? -16 : 0 }}
      whileHover={{ y: isFeatured ? -20 : -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex w-[220px] flex-col items-center rounded-[26px] px-6 pb-7 pt-8 text-center sm:w-[240px]"
      style={{
        background: isFeatured ? FEATURED_BG : "#ffffff",
        border: `1px solid ${isFeatured ? NAVY : CARD_BORDER}`,
        borderTop: `4px solid ${isFeatured ? NAVY : ACCENT}`,
        boxShadow: isFeatured ? "0 24px 48px rgba(11,47,99,0.18)" : "0 12px 28px rgba(16,37,63,0.06)",
      }}
    >
      <span
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
        style={{ background: ICON_BG }}
      >
        <Icon className="h-9 w-9" strokeWidth={1.5} style={{ color: NAVY }} aria-hidden />
      </span>

      <p className="mt-5 font-display text-[19px] font-bold sm:text-[21px]" style={{ color: NAVY }}>
        {family.name}
      </p>
      <span aria-hidden className="my-2 h-4 w-px" style={{ background: CARD_BORDER }} />
      <p className="text-[14.5px]" style={{ color: MUTED }}>
        {t("productsCount", { count: family.itemCount })}
      </p>

      <button
        type="button"
        onClick={onOpenCatalog}
        aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
        className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition hover:opacity-85"
        style={
          isFeatured
            ? { background: NAVY, color: "#ffffff" }
            : { background: "#ffffff", color: NAVY, border: `1.5px solid ${NAVY}` }
        }
      >
        <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
        {t("viewCatalogCta")}
      </button>
    </motion.div>
  );
}

// Patrón geométrico lineal muy sutil sobre la franja navy (ver productos-
// rediseno-referencia.md: "engranajes/formas lineales muy tenues", pero NO
// literal como el ícono de engranaje que el propio doc pide excluir del
// separador del eyebrow) — un par de círculos concéntricos + un hexágono en
// trazo fino, blancos a opacidad muy baja, apoyados en la esquina inferior
// derecha de la franja, igual que en la referencia.
function StripePattern() {
  const clipId = useId();
  return (
    <svg
      className="absolute bottom-[-60px] right-[-40px] h-[260px] w-[260px] opacity-[0.07] sm:h-[320px] sm:w-[320px]"
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="320" height="320" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} stroke="#ffffff" strokeWidth="1.5">
        <circle cx="230" cy="230" r="140" />
        <circle cx="230" cy="230" r="95" />
        <polygon points="230,120 320,168 320,264 230,312 140,264 140,168" />
      </g>
    </svg>
  );
}
