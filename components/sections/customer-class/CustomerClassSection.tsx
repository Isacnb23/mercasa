"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Baby,
  Building2,
  ChefHat,
  Check,
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
import type { HierarchyNode } from "@/lib/product-types";
import { businessSegments } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useScrollTo } from "@/lib/hooks/useScrollTo";
import Container from "../../ui/Container";
import Reveal from "../../ui/Reveal";
import SoftCurve from "../../ui/SoftCurve";

const segmentIcons = {
  store: Store,
  hotel: Hotel,
  "chef-hat": ChefHat,
  "shopping-bag": ShoppingBag,
  cookie: Cookie,
  building: Building2,
  "shopping-cart": ShoppingCart,
} as const;

const categoryIcons = {
  alimentos: UtensilsCrossed,
  bebidas: GlassWater,
  "cuidado-del-bebe": Baby,
  "higiene-personal": Droplets,
  "limpieza-del-hogar": Sparkles,
  institucional: Landmark,
} as const;

// Paleta del spec (ver rediseno-customer-class-spec-completo.md) — variantes
// cercanas a la paleta institucional ya usada en el resto del sitio
// (navy #082b5c/#061e41, gold #FFD21A), pero se usan los valores exactos del
// spec/mockup para esta sección puntual, tal como autoriza el propio spec
// ("está bien usar las de este spec para esta sección específica").
const NAVY = "#0B2F63";
// Antes #FFC400 (amarillo puro/muy saturado, se veía "chillón" — ver
// customer-class-fixes-2.md, punto 2). Bajado a un dorado/mostaza más suave
// sin perder contraste contra el navy: es el único lugar del proyecto que
// usa este valor (confirmado por grep), así que ajustarlo acá no toca el
// botón "Reclutamiento" del navbar (ese usa su propio "#FFD21A" hardcodeado
// en RecruitmentPopover.tsx, variable completamente aparte).
const GOLD = "#E3A93D";
const IVORY = "#F6F2E9";
const MUTED = "#53637A";

const panelTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };

// Resuelve cada chip de categoría (y el botón "Explorar productos") a dónde
// tiene que abrir el catálogo: o bien una Familia completa, o una
// Sub-familia puntual dentro de otra Familia. Reubicado acá desde
// ContactSection.tsx (ver rediseno-customer-class-spec-completo.md — este
// componente reemplaza por completo el módulo anterior de Customer Class,
// junto con toda su lógica de resolución de categorías).
const CHIP_TARGETS: Record<string, { family: string; subFamily?: string }> = {
  alimentos: { family: "alimentos" },
  bebidas: { family: "bebidas" },
  "cuidado-del-bebe": { family: "cuidado-personal", subFamily: "cuidado-del-bebe" },
  "higiene-personal": { family: "cuidado-personal", subFamily: "higiene-personal" },
  "limpieza-del-hogar": { family: "cuidado-del-hogar", subFamily: "limpieza-del-hogar" },
  institucional: { family: "cuidado-del-hogar", subFamily: "institucional" },
};

function firstCategoryInFamily(family: HierarchyNode): string | undefined {
  for (const subFamily of family.children) {
    for (const category of subFamily.children) {
      if ((category.products?.length ?? 0) > 0) return category.id;
    }
  }
  return undefined;
}

function firstCategoryInSubFamily(subFamily: HierarchyNode): string | undefined {
  for (const category of subFamily.children) {
    if ((category.products?.length ?? 0) > 0) return category.id;
  }
  return undefined;
}

export function resolveChipTarget(families: HierarchyNode[], categoryKey: string) {
  const target = CHIP_TARGETS[categoryKey];
  if (!target) return null;
  const family = families.find((f) => f.id === target.family);
  if (!family) return null;

  if (!target.subFamily) {
    return { familyId: family.id, categoryId: firstCategoryInFamily(family) };
  }
  const subFamily = family.children.find((sf) => sf.id === `${family.id}/${target.subFamily}`);
  if (!subFamily) return null;
  return { familyId: family.id, categoryId: firstCategoryInSubFamily(subFamily) };
}

/**
 * "Customer Class" — sección independiente y comercial, ubicada antes de
 * "Hablemos de negocios" (ver rediseno-customer-class-spec-completo.md).
 * Reemplaza por completo el intento anterior (BusinessSegments.tsx, panel
 * navy sidebar+resultado dentro de la tarjeta de Contacto) — ya no vive
 * dentro de esa sección, aunque el estado del segmento activo sigue viviendo
 * en el padre (ContactSection, que ahora renderiza esta sección + la suya
 * propia como dos <section> hermanas) para no perder la contextualización
 * del WhatsApp de cierre.
 */
export default function CustomerClassSection({
  activeKey,
  onSelect,
  onSelectCategory,
  onExploreProducts,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
  onSelectCategory: (categoryKey: string) => void;
  onExploreProducts: () => void;
}) {
  const t = useTranslations("CustomerClass");
  const tContact = useTranslations("Contact");
  const activeSegment = businessSegments.find((seg) => seg.key === activeKey) ?? businessSegments[0];
  const reduceMotion = useReducedMotion();
  const scrollTo = useScrollTo();

  // Segmentos sin copy detallado propio (todos menos "supermercados", ver
  // lib/data.ts `detailedCopy`) reusan el valuePhrase corto ya validado como
  // título, sin descripción — el spec pide explícitamente no inventar copy
  // nuevo para ellos.
  const heading = activeSegment.detailedCopy
    ? tContact(`segments.${activeSegment.key}.title`)
    : tContact(`segments.${activeSegment.key}.valuePhrase`);
  const description = activeSegment.detailedCopy
    ? tContact(`segments.${activeSegment.key}.description`)
    : null;

  return (
    <section
      id="customer-class"
      // pt subido de 112/120px a 130/150px (ver header-spacing-fix.md):
      // mismo valor que el resto de las secciones para un espaciado parejo.
      // id renombrado de "contacto" a "customer-class" (ver
      // navbar-customer-class.md): esta sección ahora tiene su propio ítem
      // en el navbar en vez de compartir target con "Contacto".
      className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden pb-[36px] pt-[130px] sm:pb-[48px] sm:pt-[150px]"
      style={{ background: IVORY }}
    >
      <Container className="relative z-10">
        {/* ---------- Encabezado centrado ---------- */}
        {/* Sin max-width acá (a diferencia del resto del sitio): "Customer
            Class" necesita respirar en una sola línea (ver
            ajustes-customer-class-4-puntos.md, punto 3) — el subtítulo ya
            tiene su propio max-w-[560px] más abajo, así que ensanchar este
            contenedor no lo afecta. */}
        <Reveal y={0} className="mx-auto text-center">
          <span className="flex items-center justify-center gap-3 text-[13px] font-bold uppercase sm:text-[15px]" style={{ letterSpacing: "0.2em", color: "#075FD8" }}>
            <span className="h-[3px] w-8 shrink-0 rounded-full" style={{ background: GOLD }} />
            {t("eyebrow")}
            <span className="h-[3px] w-8 shrink-0 rounded-full" style={{ background: GOLD }} />
          </span>
          <h2
            className="mt-5 whitespace-normal font-display sm:whitespace-nowrap"
            style={{
              fontSize: "clamp(2.75rem, 6vw, 6.5rem)",
              lineHeight: 0.95,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: NAVY,
            }}
          >
            {t("title")}
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[17px] leading-[1.6] sm:text-[19px]" style={{ color: MUTED }}>
            {t("subtitle")}
          </p>
        </Reveal>

        {/* ---------- Selector de tipos de cliente ---------- */}
        {/* role="tablist"/"tab" (ver spec, punto de interactividad — "usa
            atributos como aria-selected"). Scroll horizontal sin barra fea:
            scrollbarWidth/msOverflowStyle "none" + ocultar el thumb webkit. */}
        <div
          role="tablist"
          aria-label={t("title")}
          className="mt-12 flex justify-start gap-3 overflow-x-auto pb-2 sm:justify-center md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {businessSegments.map((segment) => {
            const isActive = segment.key === activeKey;
            const Icon = segmentIcons[segment.icon as keyof typeof segmentIcons];
            return (
              <button
                key={segment.key}
                id={`customer-class-tab-${segment.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="customer-class-panel"
                onClick={() => onSelect(segment.key)}
                className={cn(
                  "relative flex w-[132px] shrink-0 flex-col items-center gap-2 rounded-2xl px-3 py-5 text-center transition duration-300 sm:w-[148px]",
                  isActive ? "-translate-y-1 shadow-[0_16px_32px_rgba(11,47,99,0.16)]" : "hover:bg-[#E4EAF3]"
                )}
                style={{
                  background: isActive ? "#ffffff" : "#EEF2F7",
                  border: `1px solid ${isActive ? "rgba(11,47,99,0.08)" : "rgba(11,47,99,0.12)"}`,
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-1 rounded-full"
                    style={{ background: GOLD }}
                  />
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: "#075FD8", boxShadow: "0 4px 10px rgba(7,95,216,0.35)" }}
                  >
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
                  </span>
                )}
                <Icon className="h-6 w-6 shrink-0" strokeWidth={1.6} style={{ color: NAVY }} aria-hidden />
                <span className="text-[13px] font-semibold leading-tight" style={{ color: NAVY }}>
                  {tContact(`segments.${segment.key}.label`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- Panel principal ---------- */}
        <AnimatePresence mode="wait" initial={reduceMotion ? false : undefined}>
          <motion.div
            key={reduceMotion ? "static" : activeSegment.key}
            id="customer-class-panel"
            role="tabpanel"
            aria-labelledby={`customer-class-tab-${activeSegment.key}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={panelTransition}
            className="relative mx-auto mt-12 max-w-[1380px] overflow-hidden rounded-[30px]"
            style={{ background: NAVY, boxShadow: "0 30px 70px rgba(11,47,99,0.22)" }}
          >
            <div className="grid grid-cols-1 md:min-h-[500px] md:grid-cols-[47%_53%]">
              {/* Columna izquierda: fotografía */}
              {/* Corte cóncavo tipo "cuarto de círculo" en la esquina
                  inferior (ver customer-class-fixes-2.md, punto 1 — el
                  intento anterior con un círculo NAVY superpuesto +
                  overflow-hidden SÍ se renderizaba bien (confirmado a fondo
                  con DevTools: rect, clip y color correctos), pero al ser
                  una "pintura" de un círculo del mismo color que el fondo en
                  vez de un recorte real, cualquier duda razonable sobre si
                  "de verdad" corta algo quedaba sin poder zanjarse — y en la
                  práctica, contra fotos con textura/color variado, terminaba
                  leyéndose igual que ningún cambio. Se reemplaza acá por un
                  `mask-image` real (radial-gradient transparente centrado en
                  la esquina): esto SÍ recorta el propio elemento de la foto
                  — no una ilusión de color superpuesto — así que es
                  verificable sin ambigüedad en DevTools (aparece la
                  propiedad `mask-image`). El agujero real necesita sí o sí
                  algo navy detrás para leerse como "muerde hacia el panel"
                  en vez de mostrar el fondo beige de la sección — por eso el
                  motion.div contenedor del panel (el padre, ver más arriba)
                  ahora tiene `background: NAVY` explícito; antes no hacía
                  falta porque el color lo pintaba el propio círculo
                  superpuesto. Solo desktop/tablet — mobile apila el layout y
                  no necesita el corte. */}
              <div
                className="relative h-[260px] overflow-hidden sm:h-[280px] md:h-full md:[-webkit-mask-image:radial-gradient(circle_110px_at_100%_100%,transparent_99%,black_100%)] md:[mask-image:radial-gradient(circle_110px_at_100%_100%,transparent_99%,black_100%)]"
              >
                <Image
                  key={activeSegment.key}
                  src={activeSegment.image}
                  alt={t("photoAlt", { segment: tContact(`segments.${activeSegment.key}.label`) })}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 47vw, 100vw"
                  priority={activeSegment.key === "supermercados"}
                />
              </div>

              {/* Columna derecha: contenido, fondo navy con degradado extremadamente sutil */}
              <div
                className="relative flex flex-col justify-center overflow-hidden p-8 sm:p-10 md:p-12"
                style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0E3A78 100%)` }}
              >
                {/* Profundidad extra sobre el degradado plano (ver
                    customer-class-fixes.md, punto 3): mismo recurso de
                    viñeta ya usado sobre el mapa de ContactSection.tsx
                    (overlay absoluto con inset box-shadow) — acá con un
                    brillo sutil arriba-izquierda (de donde "vendría la luz")
                    y un oscurecimiento suave en los bordes, sin gradiente
                    de color nuevo que compita con el texto blanco/dorado. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 90px 20px rgba(4,14,30,0.22)",
                  }}
                />
                {/* Ilustración lineal muy tenue de estanterías/productos —
                    puramente decorativa, no debe competir con el contenido. */}
                <svg
                  aria-hidden
                  className="pointer-events-none absolute -bottom-6 -right-6 hidden h-56 w-56 lg:block"
                  viewBox="0 0 200 200"
                  fill="none"
                >
                  <g stroke="#8FB3E0" strokeWidth="1.2" opacity="0.12">
                    <line x1="0" y1="40" x2="200" y2="40" />
                    <line x1="0" y1="90" x2="200" y2="90" />
                    <line x1="0" y1="140" x2="200" y2="140" />
                    <rect x="20" y="14" width="22" height="24" rx="2" />
                    <rect x="55" y="10" width="18" height="28" rx="2" />
                    <rect x="120" y="64" width="24" height="24" rx="2" />
                    <rect x="160" y="60" width="18" height="28" rx="2" />
                    <rect x="30" y="112" width="20" height="26" rx="2" />
                    <rect x="90" y="116" width="24" height="22" rx="2" />
                  </g>
                </svg>

                <span
                  className="relative text-[12.5px] font-bold uppercase"
                  style={{ letterSpacing: "0.16em", color: GOLD }}
                >
                  {tContact(`segments.${activeSegment.key}.label`)}
                </span>

                <h3
                  className="relative mt-4 font-display text-white"
                  style={{ fontSize: "clamp(24px, 2.6vw, 32px)", lineHeight: 1.25, fontWeight: 600 }}
                >
                  {heading}
                </h3>

                {description && (
                  <p className="relative mt-4 max-w-[480px] text-[14.5px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.78)" }}>
                    {description}
                  </p>
                )}

                <span
                  className="relative mt-7 text-[11.5px] font-bold uppercase"
                  style={{ letterSpacing: "0.16em", color: GOLD }}
                >
                  {t("categoriesLabel")}
                </span>

                <div className="relative mt-3 flex flex-wrap gap-3">
                  {activeSegment.categories.map((categoryKey) => {
                    const CategoryIcon = categoryIcons[categoryKey as keyof typeof categoryIcons];
                    return (
                      <button
                        key={categoryKey}
                        type="button"
                        onClick={() => onSelectCategory(categoryKey)}
                        className="flex items-center gap-2 rounded-full bg-transparent px-3.5 py-2 text-[13px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                        style={{ border: "1px solid rgba(255,255,255,0.35)" }}
                      >
                        <CategoryIcon className="h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={1.8} aria-hidden />
                        {tContact(`segmentCategories.${categoryKey}.label`)}
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <button
                    type="button"
                    onClick={onExploreProducts}
                    className="inline-flex w-full items-center justify-center rounded-full px-7 py-3.5 text-[14.5px] font-bold transition duration-300 hover:-translate-y-0.5 hover:brightness-105 sm:w-fit"
                    style={{ background: GOLD, color: NAVY, boxShadow: "0 12px 28px rgba(255,196,0,0.28)" }}
                  >
                    {t("exploreCta")}
                  </button>

                  {/* CTA secundario para bajar directo a "Hablemos de
                      negocios" con el segmento ya elegido acá arriba (ver
                      customer-class-fixes.md, punto 4) — el WhatsApp de esa
                      sección ya arma su mensaje según `activeSegmentKey`
                      (estado compartido, ver ContactSection.tsx), así que
                      alcanza con hacer scroll, sin pasar nada más. Link de
                      texto subrayado, no otro botón sólido: no debe competir
                      con "Explorar productos", que es la acción principal. */}
                  <button
                    type="button"
                    onClick={() => scrollTo("#hablemos-de-negocios")}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85 underline-offset-4 transition hover:gap-2.5 hover:text-white hover:underline"
                  >
                    {t("contactCta", { segment: tContact(`segments.${activeSegment.key}.label`) })}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Container>

      <SoftCurve position="bottom" flip />
    </section>
  );
}
