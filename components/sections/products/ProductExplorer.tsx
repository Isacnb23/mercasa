"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
//
// Pulido (ver productos-pulido-tarjetas.md): las 5 tarjetas caben en una
// sola fila desde xl (a partir de lg el ancho de contenedor real todavía no
// alcanza para 5 tarjetas cómodas — a 1024px el área útil son ~896px, muy
// justo — así que el punto de quiebre scroll-horizontal → fila fija se
// movió a xl, donde sí sobra margen), todas a la misma altura (flex +
// h-full en cada tarjeta + items-stretch en la fila, spacer flex-1 antes
// del botón para que quede siempre a la misma distancia del borde inferior)
// y el estado "destacado" ya no queda fijo en la familia con más productos:
// ahora es hover/focus de cualquier tarjeta.
const NAVY = "#0B2F63";
const ACCENT = "#2F6FED";
const MUTED = "#5C6B7D";
const CARD_BORDER = "#E7ECF2";
const ICON_BG = "#E6F1FB";
const ICON_BG_ACTIVE = "#D9EAFC";
const FEATURED_BG = "#EAF3FC";
const STRIPE_BG = "#0B2947";

export default function ProductExplorer({ families }: { families: HierarchyNode[] }) {
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;

  const openCatalog = (familyId: string) => setCatalogFamilyId(familyId);
  const closeCatalog = () => setCatalogFamilyId(null);

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
          {/* Borde superior orgánico (ver productos-pulido-tarjetas.md,
              punto 3): antes la franja arrancaba con un corte recto, ahora
              una ola llena del mismo color que se apoya justo encima del
              rectángulo, mismo recurso que HeroWave pero en navy sobre
              beige en vez de blanco sobre navy. */}
          <svg
            aria-hidden
            className="absolute inset-x-0 top-0 h-[30px] w-full -translate-y-[calc(100%-1px)] sm:h-[42px]"
            viewBox="0 0 1440 42"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0,28 C240,6 480,38 720,20 C960,2 1200,36 1440,14 L1440,42 L0,42 Z"
              fill={STRIPE_BG}
            />
          </svg>
          <StripePattern />
        </div>

        <div
          className="relative flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-1 pb-2 pt-4 [&::-webkit-scrollbar]:hidden xl:flex-wrap xl:justify-center xl:overflow-visible xl:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {families.map((family, i) => (
            <Reveal key={family.id} delay={i * 0.1} className="flex h-auto shrink-0 snap-start">
              <FamilyCard family={family} onOpenCatalog={() => openCatalog(family.id)} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyCard({
  family,
  onOpenCatalog,
}: {
  family: HierarchyNode;
  onOpenCatalog: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  const [isActive, setIsActive] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      initial={false}
      animate={
        reduceMotion
          ? undefined
          : {
              y: isActive ? -10 : 0,
              boxShadow: isActive ? "0 24px 48px rgba(11,47,99,0.18)" : "0 12px 28px rgba(16,37,63,0.06)",
              backgroundColor: isActive ? FEATURED_BG : "#ffffff",
              borderLeftColor: isActive ? NAVY : CARD_BORDER,
              borderRightColor: isActive ? NAVY : CARD_BORDER,
              borderBottomColor: isActive ? NAVY : CARD_BORDER,
              borderTopColor: isActive ? NAVY : ACCENT,
            }
      }
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full w-[210px] flex-col items-center rounded-[26px] border border-t-4 px-6 pb-7 pt-8 text-center sm:w-[240px] xl:w-[212px]"
      style={
        reduceMotion
          ? {
              background: isActive ? FEATURED_BG : "#ffffff",
              borderColor: isActive ? NAVY : CARD_BORDER,
              borderTopColor: isActive ? NAVY : ACCENT,
              boxShadow: isActive ? "0 24px 48px rgba(11,47,99,0.18)" : "0 12px 28px rgba(16,37,63,0.06)",
            }
          : undefined
      }
    >
      <span
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
        style={{ background: isActive ? ICON_BG_ACTIVE : ICON_BG }}
      >
        <Icon
          className="h-9 w-9 transition-colors duration-300"
          strokeWidth={1.5}
          style={{ color: isActive ? ACCENT : NAVY }}
          aria-hidden
        />
      </span>

      <p className="mt-5 font-display text-[20px] font-bold sm:text-[22px]" style={{ color: NAVY }}>
        {family.name}
      </p>
      <span aria-hidden className="my-2 h-4 w-px" style={{ background: CARD_BORDER }} />
      <p className="text-[16.5px]" style={{ color: MUTED }}>
        {t("productsCount", { count: family.itemCount })}
      </p>

      {/* Spacer que absorbe el alto extra de las tarjetas (todas la misma
          altura por el stretch del contenedor flex): el botón queda
          siempre a la misma distancia del borde inferior de la tarjeta,
          sin importar cuántas líneas ocupe el nombre de la familia. */}
      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenCatalog}
        aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
        className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition hover:opacity-85"
        style={
          isActive
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
