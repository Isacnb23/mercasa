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
import { businessSegments, site } from "@/lib/data";
import { buildWhatsappHref, cn } from "@/lib/utils";
import Container from "../../ui/Container";
import Reveal from "../../ui/Reveal";
import SoftCurve from "../../ui/SoftCurve";
import WhatsAppIcon from "../../ui/WhatsAppIcon";

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

// Paleta específica de esta sección (ver customer-class-rediseno-final.md
// — replica reference/customer-class-target.png con fidelidad de color).
// Reemplaza por completo la paleta navy-pesado/gold de las iteraciones
// anteriores (mask circular, luego foto de fondo + overlay navy): ahora es
// una tarjeta clara de dos columnas, sin overlay ni amarillo. Estos valores
// son propios de Customer Class — no tocan el design system del resto del
// sitio (corp-blue/corp-yellow/corp-ink, ver AGENTS del proyecto).
const NAVY = "#0B315E";
const TEXT_SECONDARY = "#536273";
const BEIGE_MAIN = "#CDBB9F";
const BEIGE_LIGHT = "#F1ECE4";
const BORDER = "#DDE3E8";
const IVORY = "#F7F4EE";

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

  // WhatsApp directo por segmento (ver customer-class-whatsapp-directo.md):
  // MISMA lógica de armado de mensaje que ya usa el botón "Escríbanos por
  // WhatsApp" de Contacto (ContactSection.tsx) — mismo número
  // (site.whatsappHref) y misma key de mensaje "segmentsWhatsappMessage",
  // solo que acá se recalcula contra `activeSegment` de ESTE componente en
  // vez del estado compartido, para no depender de que ContactSection ya
  // haya montado.
  const segmentWhatsappHref = buildWhatsappHref(
    site.whatsappHref,
    tContact("segmentsWhatsappMessage", { noun: tContact(`segments.${activeSegment.key}.whatsappNoun`) })
  );

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

  const segmentIndex = businessSegments.findIndex((seg) => seg.key === activeSegment.key);
  const segmentNumber = String(segmentIndex + 1).padStart(2, "0");
  const segmentTotal = String(businessSegments.length).padStart(2, "0");

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
          <span className="flex items-center justify-center gap-3 text-[13px] font-bold uppercase sm:text-[15px]" style={{ letterSpacing: "0.2em", color: NAVY }}>
            <span className="h-px w-10 shrink-0 sm:w-14" style={{ background: BEIGE_MAIN }} />
            {t("eyebrow")}
            <span className="h-px w-10 shrink-0 sm:w-14" style={{ background: BEIGE_MAIN }} />
          </span>
          <h2
            className="mt-5 whitespace-normal font-display sm:whitespace-nowrap"
            style={{
              fontSize: "clamp(3.8rem, 7vw, 6.8rem)",
              lineHeight: 0.95,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: NAVY,
            }}
          >
            {t("title")}
          </h2>
          <p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[1.6] sm:text-[19px]" style={{ color: TEXT_SECONDARY }}>
            {t("subtitle")}
          </p>
        </Reveal>

        {/* ---------- Selector de tipos de cliente ---------- */}
        {/* role="tablist"/"tab" (ver spec, punto de interactividad — "usa
            atributos como aria-selected"). Scroll horizontal con snap hasta
            lg (ver customer-class-rediseno-final.md — en tablet el panel de
            abajo ya está en dos columnas, pero el selector sigue
            scrolleable en vez de wrappear, así no compite por alto con el
            panel); a partir de lg pasa a wrap en una sola fila de 7. Barra
            de scroll oculta: scrollbarWidth/msOverflowStyle "none" + thumb
            webkit oculto. */}
        <div
          role="tablist"
          aria-label={t("title")}
          className="mt-12 flex snap-x snap-mandatory justify-start gap-3 overflow-x-auto pb-2 sm:justify-center lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
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
                  "relative flex min-h-[130px] w-[136px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl px-3 py-5 text-center transition duration-300 sm:w-[150px]",
                  isActive ? "shadow-[0_12px_28px_rgba(11,49,94,0.1)]" : "hover:border-[#c7d0d8] hover:bg-[#FBFAF7]"
                )}
                style={{
                  background: "#ffffff",
                  border: `1px solid ${isActive ? NAVY : BORDER}`,
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-[3px] rounded-full"
                    style={{ background: BEIGE_MAIN }}
                  />
                )}
                {isActive && (
                  <Check
                    aria-hidden
                    className="absolute right-3 top-3 h-4 w-4"
                    strokeWidth={2.5}
                    style={{ color: NAVY }}
                  />
                )}
                <Icon className="h-7 w-7 shrink-0" strokeWidth={1.5} style={{ color: NAVY }} aria-hidden />
                <span className="text-[14px] font-semibold leading-tight" style={{ color: NAVY }}>
                  {tContact(`segments.${segment.key}.label`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- Panel principal ---------- */}
        {/* Rediseño final (ver customer-class-rediseno-final.md y
            reference/customer-class-target.png): reemplaza el layout de
            foto de fondo + overlay/gradiente navy de la ronda anterior por
            una tarjeta clara de dos columnas — foto real a la izquierda
            (sin overlay, sin degradado, sin texto encima) y contenido sobre
            fondo blanco a la derecha. El navy vuelve a ser solo acento
            (título, iconos, borde activo, botón principal), sin amarillo en
            ningún lado de la sección. */}
        {/* La tarjeta (borde/sombra/esquinas) ya NO se remonta por segmento
            (ver customer-class-animacion-filtro.md — antes todo el panel,
            foto+contenido+tarjeta, era un solo motion.div en mode="wait":
            se sentía como un corte porque la tarjeta entera se deslizaba de
            salida y recién DESPUÉS entraba la siguiente, con blanco de por
            medio). Ahora la tarjeta es estática y foto/contenido animan
            cada una por su cuenta adentro. */}
        <div
          id="customer-class-panel"
          role="tabpanel"
          aria-labelledby={`customer-class-tab-${activeSegment.key}`}
          className="relative mx-auto mt-12 grid max-w-[1280px] grid-cols-1 overflow-hidden rounded-[30px] bg-white md:grid-cols-[52%_48%]"
          style={{ border: `1px solid ${BORDER}`, boxShadow: "0 40px 80px -20px rgba(11,49,94,0.14)" }}
        >
          {/* Columna izquierda: fotografía real, sin overlay ni degradado —
              clara, brillante, protagonista tal como pide el spec. Crossfade
              real (ver customer-class-animacion-filtro.md): AnimatePresence
              en modo "sync" (default) monta la foto nueva YA mientras la
              vieja todavía se desvanece — se superponen (ambas
              `absolute inset-0`, position la da `fill` de next/image), en
              vez de esperar a que la vieja termine de salir. Así la foto de
              abajo sigue visible durante toda la transición: nunca hay un
              frame en blanco/gris mientras la nueva decodea. */}
          <div className="relative h-[280px] shrink-0 overflow-hidden sm:h-[320px] md:h-full">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeSegment.key}
                className="absolute inset-0"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src={activeSegment.image}
                  alt={t("photoAlt", { segment: tContact(`segments.${activeSegment.key}.label`) })}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 52vw, 100vw"
                  priority={activeSegment.key === "supermercados"}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Columna derecha: contenido sobre blanco. Altura FIJA por
              breakpoint (ver customer-class-altura-fija.md) — antes esta
              columna se dimensionaba naturalmente al contenido (sin altura
              propia), así que el panel entero crecía o encogía según cuántos
              chips de categoría tuviera el segmento activo (3 a 6 según el
              dato real, ver lib/data.ts) — se sentía inconsistente y movía
              el resto de la página al cambiar de tab. Los valores salen de
              medir en vivo el segmento MÁS alto (siempre "supermercados":
              5 categorías + descripción propia) en cada bracket de Tailwind
              — no es un solo valor global porque el layout cambia de una
              columna (foto arriba, ancho completo) a dos columnas (foto al
              lado, columna de contenido angosta al ~48%) justo en `md`, y
              esa columna angosta necesita MÁS alto que el mobile de una
              columna a pesar de ser una pantalla más grande (más ancho ≠
              más ancho de ESTA columna puntual). En vez de min-height (que
              solo pone un piso y deja crecer), esto es un h-[] real: el
              contenido de menos categorías queda centrado con aire arriba/
              abajo (`justify-center`) en vez de achicar el panel. */}
          <div className="relative flex h-[720px] flex-col justify-center overflow-hidden p-6 sm:h-[520px] sm:p-8 md:h-[920px] md:p-[52px] lg:h-[700px] xl:h-[640px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={reduceMotion ? "static" : activeSegment.key}
                className="relative"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Numeral editorial gigante, muy tenue, decorativo —
                    esquina superior derecha, se deja sangrar apenas fuera
                    del borde (ver referencia) sin generar overflow real
                    gracias al overflow-hidden del contenedor. Ancla acá
                    (al motion.div, que se dimensiona solo al contenido real,
                    NO a la columna de afuera que ahora es más alta y fija) —
                    si anclara a la columna, en los segmentos con menos
                    contenido (centrado gracias al alto fijo) el numeral se
                    quedaría pegado arriba de todo mientras el texto baja al
                    centrarse, separándose cada vez más de él. */}
                {/* Piso del clamp bajado de 96px a 44px (ver mobile-revision-
                    completa.md, punto 3): en mobile la columna es angosta
                    (una sola, foto arriba) y 11vw cae por debajo de 96px, así
                    que el clamp forzaba siempre el piso — un numeral de 96px
                    en una columna de ~340px choca con la etiqueta "01/07 ·
                    SEGMENTO" de abajo, que en mobile ocupa casi todo el ancho
                    disponible. A partir de md (columna angosta pero ya con
                    más aire real, ver comentario de altura fija arriba) 11vw
                    vuelve a superar el piso nuevo sin cambiar el tamaño que
                    ya se veía bien en desktop. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-6 select-none font-display font-semibold"
                  style={{ fontSize: "clamp(44px, 11vw, 156px)", lineHeight: 1, color: "rgba(11,49,94,0.06)" }}
                >
                  {segmentNumber}
                </span>

                <div className="relative">
                  {/* pr-14 en mobile: deja el ancho justo para que la
                      etiqueta no corra por debajo del numeral de la esquina
                      (ver comentario arriba) — md+ ya tiene columna angosta
                      pero con suficiente aire natural, así que no hace falta. */}
                  <span className="block max-w-[calc(100%-56px)] text-[12px] font-bold uppercase tracking-[0.14em] md:max-w-none">
                    <span style={{ color: BEIGE_MAIN }}>
                      {segmentNumber} / {segmentTotal}
                    </span>
                    <span style={{ color: NAVY }}> · {tContact(`segments.${activeSegment.key}.label`)}</span>
                  </span>

                  <h3
                    className="mt-4 max-w-[440px] font-display"
                    style={{ fontSize: "clamp(26px, 2.4vw, 34px)", lineHeight: 1.25, fontWeight: 600, color: NAVY }}
                  >
                    {heading}
                  </h3>

                  {description && (
                    <p className="mt-4 max-w-[440px] text-[15.5px] leading-[1.65]" style={{ color: TEXT_SECONDARY }}>
                      {description}
                    </p>
                  )}

                  <span
                    className="mt-7 block text-[11.5px] font-bold uppercase"
                    style={{ letterSpacing: "0.14em", color: NAVY }}
                  >
                    {t("categoriesLabel")}
                  </span>

                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {activeSegment.categories.map((categoryKey) => {
                      const CategoryIcon = categoryIcons[categoryKey as keyof typeof categoryIcons];
                      return (
                        <button
                          key={categoryKey}
                          type="button"
                          onClick={() => onSelectCategory(categoryKey)}
                          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-medium transition hover:-translate-y-0.5"
                          style={{ border: "1px solid rgba(205,187,159,0.45)", background: BEIGE_LIGHT, color: NAVY }}
                        >
                          <CategoryIcon className="h-4 w-4 shrink-0" style={{ color: NAVY }} strokeWidth={1.8} aria-hidden />
                          {tContact(`segmentCategories.${categoryKey}.label`)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
                    <button
                      type="button"
                      onClick={onExploreProducts}
                      className="inline-flex w-full items-center justify-center rounded-full px-7 py-3.5 text-[15.5px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 sm:w-fit"
                      style={{ background: NAVY, boxShadow: "0 12px 28px rgba(11,49,94,0.22)" }}
                    >
                      {t("exploreCta")}
                    </button>

                    {/* CTA secundario: antes hacía scroll a "Hablemos de
                        negocios" para que el usuario buscara ahí el botón de
                        WhatsApp — ahora abre WhatsApp DIRECTO en una pestaña
                        nueva, ya con el mensaje personalizado del segmento
                        elegido acá arriba, sin el paso intermedio (ver
                        customer-class-whatsapp-directo.md). Mismo armado de
                        link (buildWhatsappHref + site.whatsappHref) y mismo
                        ícono que el botón "Escríbanos por WhatsApp" de
                        Contacto (ContactSection.tsx) — no se duplica la
                        lógica, se reusa. Se mantiene el copy real ("Contactar
                        sobre {segmento}"), ver customer-class-rediseno-
                        final.md — la referencia muestra un texto genérico
                        "Hablar con un asesor", pero el doc pide explícitamente
                        mantener el comportamiento y copy real ya
                        implementado, solo ajustar el estilo. Restyle a botón
                        "outline" real (ver customer-class-boton-contactar-
                        visible.md): antes era texto plano azul sin caja, se
                        veía demasiado discreto al lado de "Explorar
                        productos" — mismo tratamiento de botón secundario con
                        borde que ya usa el CTA final de LogisticsSteps (borde
                        1.5px + relleno navy en hover), pero se mantiene sin
                        fondo sólido en reposo para que "Explorar productos"
                        siga siendo el CTA dominante. */}
                    <a
                      href={segmentWhatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-[#0B315E] hover:text-white sm:w-fit"
                      style={{ color: NAVY, border: `1.5px solid ${NAVY}` }}
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                      {t("contactCta", { segment: tContact(`segments.${activeSegment.key}.label`) })}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>

      <SoftCurve position="bottom" flip />
    </section>
  );
}
