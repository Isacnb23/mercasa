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
// Pulido (ver productos-pulido-tarjetas.md): de sm a xl scroll horizontal con
// tarjetas de ancho fijo (a 1024px, lg, el área útil real todavía no alcanza
// para varias tarjetas cómodas). Desde xl, grid fija de 3 columnas (ver
// familias-orden-grilla-3-columnas.md): con las 6 familias actuales da
// exactamente 2 filas completas, sin ninguna tarjeta huérfana — a diferencia
// del wrap anterior (5 por fila), que dejaba la sexta sola. Todas a la misma
// altura (flex + h-full en cada tarjeta + items-stretch en la fila, spacer
// flex-1 antes del botón para que quede siempre a la misma distancia del
// borde inferior) y el estado "destacado" ya no queda fijo en la familia con
// más productos: ahora es hover/focus de cualquier tarjeta.
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

        {/* Mobile (< sm): grid fija de 2 columnas, todas las tarjetas
            visibles sin scroll horizontal (ver mobile-fixes-ronda2.md,
            punto 3 — Isaac prefirió esto al scroll-con-fade de la ronda
            anterior). Si el número de familias es impar, la última tarjeta
            queda sola en su columna (grid no la estira a las 2, ver
            FamilyCard más abajo: `w-full` normal, no `col-span-2`).
            De sm en adelante se mantiene el scroll horizontal con snap +
            fade de siempre (tarjetas de ancho fijo, no entran 2 por fila
            cómodas ahí), y desde xl la fila fija envuelta de siempre. */}
        {/* Indicio visual de scroll horizontal (ver mobile-revision-
            completa.md, punto 2): la scrollbar va oculta y el patrón
            scroll-snap por sí solo no deja claro que hay más tarjetas al
            costado. Un `mask-image` desvanece el borde derecho de las
            tarjetas mismas en vez de pintar un overlay de color que
            tendría que adivinar qué hay detrás (beige o la franja navy).
            Solo de sm a xl — en mobile es grid fija sin scroll (ver arriba,
            `[mask-image:none]` base) y desde xl la fila ya no scrollea
            (envuelve, `xl:[mask-image:none]`). */}
        <div
          className="relative grid grid-cols-2 gap-3 px-1 pb-2 pt-4 [mask-image:none] [-webkit-mask-image:none] sm:flex sm:snap-x sm:snap-mandatory sm:items-stretch sm:gap-4 sm:overflow-x-auto sm:[&::-webkit-scrollbar]:hidden sm:[-webkit-mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] sm:[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] xl:grid xl:grid-cols-3 xl:items-stretch xl:gap-6 xl:overflow-visible xl:px-0 xl:[mask-image:none] xl:[-webkit-mask-image:none]"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {families.map((family, i) => (
            <Reveal key={family.id} delay={i * 0.1} className="flex h-auto w-full sm:w-auto sm:shrink-0 sm:snap-start xl:w-full">
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
      className="flex h-full w-full flex-col items-center rounded-[22px] border border-t-4 px-3 pb-5 pt-6 text-center sm:w-[240px] sm:rounded-[26px] sm:px-6 sm:pb-7 sm:pt-8 xl:w-full xl:rounded-[28px] xl:px-8 xl:pb-9 xl:pt-10"
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
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:h-20 sm:w-20 xl:h-24 xl:w-24"
        style={{ background: isActive ? ICON_BG_ACTIVE : ICON_BG }}
      >
        <Icon
          className="h-6 w-6 transition-colors duration-300 sm:h-9 sm:w-9 xl:h-11 xl:w-11"
          strokeWidth={1.5}
          style={{ color: isActive ? ACCENT : NAVY }}
          aria-hidden
        />
      </span>

      <p className="mt-3 font-display text-[15px] font-bold sm:mt-5 sm:text-[22px] xl:mt-6 xl:text-[26px]" style={{ color: NAVY }}>
        {family.name}
      </p>
      <span aria-hidden className="my-1.5 h-4 w-px sm:my-2 xl:my-3" style={{ background: CARD_BORDER }} />
      <p className="text-[13px] sm:text-[16.5px] xl:text-[18px]" style={{ color: MUTED }}>
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
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition hover:opacity-85 sm:mt-6 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[15px] xl:mt-8 xl:px-6 xl:py-3 xl:text-[16px]"
        style={
          isActive
            ? { background: NAVY, color: "#ffffff" }
            : { background: "#ffffff", color: NAVY, border: `1.5px solid ${NAVY}` }
        }
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
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
