"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown, Package } from "lucide-react";
import type { HierarchyNode } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import { formatProductCount } from "@/lib/utils";
import Reveal from "./Reveal";
import ProductCatalogModal from "./ProductCatalogModal";

// Corrección de dirección (ver fix-product-explorer-acordeon.md): el intento
// anterior (rediseno-product-explorer.md) convertía esto en 3 pantallas que
// se reemplazaban entre sí — Isaac lo probó y no es lo que quiere. La
// dirección correcta es un acordeón contenido en UN SOLO cuadro fijo: click
// en una familia expande sus categorías hacia ADENTRO del mismo cuadro
// (nunca reemplaza toda la sección), click en una categoría expande sus
// productos (solo texto, sin foto/precio) un nivel más adentro. Sin
// buscador — se eliminó por completo (era de la versión anterior).
const ACCENT = "#185FA5";
const CHIP_BG = "#F0F5FA";
const INK = "#0c1a26";
const MUTED = "#5C6B7D";
const RULE = "#E2E8F0";

// Wash geométrico sutil en navy institucional (mismo tono que usa el resto
// del sitio, solo varía la intensidad/ángulo por familia para diferenciar
// filas sin fotos de producto — ver "Estilo general" del rediseño previo,
// que este fix mantiene).
const FAMILY_ROW_WASH = [
  { tint: "rgba(8,43,92,0.045)", angle: 122 },
  { tint: "rgba(8,43,92,0.075)", angle: 148 },
  { tint: "rgba(8,43,92,0.095)", angle: 100 },
  { tint: "rgba(8,43,92,0.06)", angle: 164 },
  { tint: "rgba(8,43,92,0.085)", angle: 132 },
];

function familyRowWash(index: number) {
  return FAMILY_ROW_WASH[index % FAMILY_ROW_WASH.length];
}

// Primera categoría CON productos reales de la familia (recorre sub-familia
// -> categoría en orden) — es donde react-pageflip realmente tiene una
// página (ver buildBookPages en ProductCatalogModal), así que el botón
// "Revista" de la familia entra directo al contenido en vez de forzar al
// usuario a pasar primero por portada/portafolio.
function firstCategoryWithProducts(family: HierarchyNode): string | undefined {
  for (const subFamily of family.children) {
    for (const category of subFamily.children) {
      if ((category.products?.length ?? 0) > 0) return category.id;
    }
  }
  return undefined;
}

const expandTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };

export default function ProductExplorer({ families }: { families: HierarchyNode[] }) {
  const t = useTranslations("Products");

  // El catálogo interactivo sigue siendo independiente por familia — se abre
  // como overlay de pantalla completa (ProductCatalogModal, portal a
  // document.body), nunca dentro de este cuadro. `catalogCategoryId` (si
  // viene) posiciona el libro directo en esa categoría al abrir.
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const [catalogCategoryId, setCatalogCategoryId] = useState<string | undefined>(undefined);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;

  const openCatalog = (familyId: string, categoryId?: string) => {
    setCatalogFamilyId(familyId);
    setCatalogCategoryId(categoryId);
  };
  const closeCatalog = () => {
    setCatalogFamilyId(null);
    setCatalogCategoryId(undefined);
  };

  // Acordeón clásico: una sola familia expandida a la vez, y dentro de ella
  // una sola categoría expandida a la vez — así el cuadro se mantiene
  // manejable (ver punto 5 del fix). Cambiar de familia colapsa la
  // categoría que hubiera quedado abierta en la anterior.
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const toggleFamily = (id: string) => {
    setExpandedFamilyId((current) => (current === id ? null : id));
    setExpandedCategoryId(null);
  };
  const toggleCategory = (id: string) => {
    setExpandedCategoryId((current) => (current === id ? null : id));
  };

  return (
    <div className="mt-16 lg:mt-20">
      <Reveal className="flex items-center justify-center gap-4">
        <span
          className="whitespace-nowrap text-[12px] font-bold uppercase text-corp-blue"
          style={{ letterSpacing: "0.16em" }}
        >
          {t("familiesLabel")}
        </span>
      </Reveal>

      {/* CTA para quien prefiere hojear todo de una vez en vez de navegar
          por familia/categoría — abre la revista de la primera familia
          directo en la portada (no existe un "catálogo unificado" propio:
          cada familia es su propia revista, ver ProductCatalogModal). */}
      <Reveal delay={0.03} className="mx-auto mt-6 flex max-w-[480px] flex-col items-center text-center">
        <button
          type="button"
          onClick={() => openCatalog(families[0].id)}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-semibold text-white shadow-[0_10px_26px_rgba(24,95,165,0.28)] transition hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t("exploreCta")}
        </button>
        <p className="mt-2.5 text-[12.5px]" style={{ color: MUTED }}>
          {t("exploreCtaSubtitle")}
        </p>
      </Reveal>

      {catalogFamily && (
        <ProductCatalogModal
          family={catalogFamily}
          allFamilies={families}
          initialCategoryId={catalogCategoryId}
          onClose={closeCatalog}
        />
      )}

      {/* Un solo cuadro fijo — no cambia de posición en la página, y su
          alto crece/encoge con `layout` (framer-motion anima la
          transición) en vez de saltar de golpe al expandir/colapsar
          familias o categorías adentro. */}
      <Reveal delay={0.06}>
        <motion.div
          layout
          transition={expandTransition}
          className="mt-8 overflow-hidden rounded-[28px] border bg-white"
          style={{ borderColor: RULE, boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
        >
          {families.map((family, index) => (
            <FamilyRow
              key={family.id}
              family={family}
              wash={familyRowWash(index)}
              isExpanded={expandedFamilyId === family.id}
              onToggle={() => toggleFamily(family.id)}
              onOpenCatalog={() => openCatalog(family.id, firstCategoryWithProducts(family))}
              expandedCategoryId={expandedCategoryId}
              onToggleCategory={toggleCategory}
              onOpenCategoryInCatalog={(categoryId) => openCatalog(family.id, categoryId)}
              isLast={index === families.length - 1}
            />
          ))}
        </motion.div>
      </Reveal>
    </div>
  );
}

// Fila de familia — protagonista (ver fix-product-explorer-acordeon.md):
// ícono grande, nombre, conteo, y su propio acceso directo a la revista. El
// resto de la fila (no el botón "Revista") expande/colapsa sus categorías
// hacia ADENTRO del mismo cuadro.
function FamilyRow({
  family,
  wash,
  isExpanded,
  onToggle,
  onOpenCatalog,
  expandedCategoryId,
  onToggleCategory,
  onOpenCategoryInCatalog,
  isLast,
}: {
  family: HierarchyNode;
  wash: { tint: string; angle: number };
  isExpanded: boolean;
  onToggle: () => void;
  onOpenCatalog: () => void;
  expandedCategoryId: string | null;
  onToggleCategory: (id: string) => void;
  onOpenCategoryInCatalog: (categoryId: string) => void;
  isLast: boolean;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  const subFamiliesWithCategories = family.children.filter((sf) => sf.children.length > 0);

  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${RULE}` }}>
      <div className="relative flex items-stretch">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(${wash.angle}deg, ${wash.tint} 0px, ${wash.tint} 1px, transparent 1px, transparent 13px)`,
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left transition hover:bg-black/[0.015] sm:px-7 sm:py-5"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14"
            style={{ background: CHIP_BG }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.6} style={{ color: ACCENT }} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-semibold leading-tight sm:text-[19px]" style={{ color: INK }}>
              {family.name}
            </span>
            <span className="mt-0.5 block text-[12.5px] font-medium" style={{ color: ACCENT }}>
              {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
            </span>
          </span>
          <ChevronDown
            className="h-4.5 w-4.5 shrink-0 transition-transform duration-300"
            style={{ color: ACCENT, transform: isExpanded ? "rotate(180deg)" : undefined }}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={onOpenCatalog}
          aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
          title={t("catalog.openFamilyButton", { familyName: family.name })}
          className="relative z-10 my-3 mr-3 flex shrink-0 items-center gap-1.5 self-center rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition hover:opacity-80 sm:mr-5"
          style={{ color: ACCENT, background: CHIP_BG }}
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          <span className="hidden sm:inline">{t("catalog.openFamilyButtonShort")}</span>
        </button>
      </div>

      <motion.div
        initial={false}
        animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={expandTransition}
        style={{ overflow: "hidden" }}
      >
        <div className="px-5 pb-5 sm:px-7">
          {subFamiliesWithCategories.map((subFamily) => (
            <div key={subFamily.id} className="mt-3 first:mt-0">
              {subFamiliesWithCategories.length > 1 && (
                <p className="mb-1.5 pl-[60px] text-[10px] font-bold uppercase sm:pl-[68px]" style={{ color: "#8493A5", letterSpacing: "0.08em" }}>
                  {subFamily.name}
                </p>
              )}
              <div className="space-y-1 pl-[60px] sm:pl-[68px]">
                {subFamily.children.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    isExpanded={expandedCategoryId === category.id}
                    onToggle={() => onToggleCategory(category.id)}
                    onOpenCatalog={() => onOpenCategoryInCatalog(category.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Fila de categoría (indentada, dentro de la familia expandida) — expande
// para mostrar los nombres de producto en texto plano. Solo una categoría
// expandida a la vez (acordeón dentro del acordeón, ver punto 5 del fix).
function CategoryRow({
  category,
  isExpanded,
  onToggle,
  onOpenCatalog,
}: {
  category: HierarchyNode;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenCatalog: () => void;
}) {
  const t = useTranslations("Products");
  const products = category.products ?? [];
  const hasCatalogEntry = products.length > 0;

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: isExpanded ? "#FAFBFC" : undefined }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.02]"
      >
        <span className="truncate text-[13.5px] font-medium" style={{ color: INK }}>
          {category.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11.5px] font-medium" style={{ color: MUTED }}>
            {t("productsCount", { count: category.itemCount })}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform duration-300"
            style={{ color: ACCENT, transform: isExpanded ? "rotate(180deg)" : undefined }}
            aria-hidden
          />
        </span>
      </button>

      <motion.div
        initial={false}
        animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={expandTransition}
        style={{ overflow: "hidden" }}
      >
        <div className="px-3 pb-3 pt-1">
          {hasCatalogEntry ? (
            <>
              <button
                type="button"
                onClick={onOpenCatalog}
                className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold transition hover:opacity-70"
                style={{ color: ACCENT }}
              >
                <BookOpen className="h-3 w-3" strokeWidth={2} aria-hidden />
                {t("viewInCatalogCta")}
              </button>
              {/* Nivel de productos: solo nombre, sin foto ni precio (ver
                  fix-product-explorer-acordeon.md). max-height + scroll
                  propio acá — una categoría con 400 productos no debe
                  volver gigante todo el cuadro. */}
              <div className="max-h-[220px] overflow-y-auto pr-1">
                <div className="columns-1 gap-x-5 sm:columns-2 lg:columns-3">
                  {products.map((product) => (
                    <p
                      key={product.id}
                      className="break-inside-avoid py-0.5 text-[12.5px] leading-snug"
                      style={{ color: "#3E4C5C" }}
                    >
                      {product.name}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-[12.5px]" style={{ color: MUTED }}>
              {t("noProductsListed")}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
