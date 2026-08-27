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
// dirección correcta es un solo cuadro fijo (ver fix-acordeon-altura-fija.md
// para el alto constante). Layout interno de sidebar + panel (ver
// fix-sidebar-panel-scroll.md): las familias viven en una columna angosta a
// la izquierda (solo seleccionan, no empujan nada hacia abajo) y sus
// categorías/productos se muestran en un panel dedicado a la derecha, con su
// propio scroll interno — así el contenido de una familia con muchas
// categorías nunca queda "descolgado" al fondo del cuadro. Sin buscador — se
// eliminó por completo (era de la versión anterior).
const ACCENT = "#185FA5";
const CHIP_BG = "#F0F5FA";
const INK = "#0c1a26";
const MUTED = "#5C6B7D";
const RULE = "#E2E8F0";

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

  // Sidebar (familias) + panel de contenido (categorías) de la familia
  // seleccionada. Clickear una familia solo cambia cuál está activa — nunca
  // expande nada hacia abajo en el propio sidebar. Dentro del panel,
  // categorías siguen siendo un acordeón (una expandida a la vez).
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id ?? "");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const selectedFamily = families.find((f) => f.id === selectedFamilyId) ?? families[0] ?? null;

  const selectFamily = (id: string) => {
    setSelectedFamilyId(id);
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

      {/* Un solo cuadro de altura FIJA (no max-height) — nunca cambia de
          tamaño ni empuja el contenido de abajo, en ningún estado (ver
          fix-acordeon-altura-fija.md). Adentro, dos columnas LADO A LADO por
          default (flex-row, ver fix-urgente-layout-scroll.md — el intento
          anterior lo apilaba porque el row solo se activaba desde lg/1024px;
          ahora row es la base y solo se apila en pantallas realmente chicas
          con max-sm:). Panel de categorías a la derecha con SU PROPIO
          overflow-y-auto — un <div> plano, sin ningún motion.div de Framer
          Motion envolviéndolo. La causa real del scroll roto (confirmado con
          Playwright: el scrollTop nunca se movía y el wheel terminaba
          scrolleando la PÁGINA en su lugar) era Lenis
          (components/SmoothScroll.tsx, smoothWheel:true global) capturando
          todos los eventos de wheel del sitio — `data-lenis-prevent` en cada
          contenedor con overflow-y-auto le devuelve el scroll nativo. */}
      <Reveal delay={0.06}>
        <div
          className="mt-8 flex h-[440px] shrink-0 flex-row overflow-hidden rounded-[28px] border bg-white sm:h-[520px] max-sm:flex-col"
          style={{ borderColor: RULE, boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
        >
          <div
            data-lenis-prevent
            className="flex w-[248px] shrink-0 flex-col gap-1 overflow-y-auto border-r p-3 max-sm:w-full max-sm:flex-row max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:overflow-y-visible max-sm:border-b max-sm:border-r-0 max-sm:p-2.5"
            style={{ borderColor: RULE }}
          >
            {families.map((family) => (
              <SidebarFamilyItem
                key={family.id}
                family={family}
                isActive={family.id === selectedFamilyId}
                onSelect={() => selectFamily(family.id)}
                onOpenCatalog={() => openCatalog(family.id, firstCategoryWithProducts(family))}
              />
            ))}
          </div>

          {/* key={selectedFamily.id}: al cambiar de familia este <div>
              remonta, lo que resetea su scrollTop a 0 automáticamente — sin
              necesidad de leer/escribir el DOM a mano. */}
          {selectedFamily && (
            // overflow-y-auto vive en ESTE div, sin padding propio — así la
            // scrollbar queda pegada al borde real del panel. El padding
            // (ver ajuste-padding-titulos.md) va en el wrapper interno de
            // abajo, para que el texto tenga aire sin que la barra de scroll
            // quede flotando a mitad del padding.
            <div
              key={selectedFamily.id}
              data-lenis-prevent
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="px-7 pb-8 pt-7 max-sm:px-5 max-sm:pb-6 max-sm:pt-5">
                <CategoryPanel
                  family={selectedFamily}
                  expandedCategoryId={expandedCategoryId}
                  onToggleCategory={toggleCategory}
                  onOpenCategoryInCatalog={(categoryId) => openCatalog(selectedFamily.id, categoryId)}
                  onOpenFamilyCatalog={() => openCatalog(selectedFamily.id, firstCategoryWithProducts(selectedFamily))}
                />
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

// Ítem del sidebar — ícono + nombre + acceso directo a la revista (ver
// ajuste-padding-vertical-boton-sidebar.md). Dos <button> HERMANOS dentro de
// un <div> (no un botón anidado dentro de otro, que sería HTML inválido):
// click en el nombre/ícono = seleccionar familia (cambia el panel derecho);
// click en el ícono de libro = abre la revista de esa familia directo,
// funcione o no seleccionada. Columna angosta apilada verticalmente por
// default (sidebar al lado del panel, lado a lado); solo en pantallas
// realmente chicas (max-sm:) se listan como chips horizontales.
function SidebarFamilyItem({
  family,
  isActive,
  onSelect,
  onOpenCatalog,
}: {
  family: HierarchyNode;
  isActive: boolean;
  onSelect: () => void;
  onOpenCatalog: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  const iconColor = isActive ? "#ffffff" : ACCENT;
  const textColor = isActive ? "#ffffff" : INK;

  return (
    <div
      className="flex w-full shrink-0 items-center gap-0.5 rounded-xl transition max-sm:w-auto max-sm:rounded-full"
      style={{ background: isActive ? ACCENT : CHIP_BG }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left max-sm:w-auto max-sm:flex-none max-sm:gap-2 max-sm:whitespace-nowrap max-sm:px-3.5 max-sm:py-2"
      >
        <Icon className="h-5 w-5 shrink-0 max-sm:h-4 max-sm:w-4" strokeWidth={1.8} style={{ color: iconColor }} aria-hidden />
        <span className="min-w-0 truncate text-[13.5px] font-semibold max-sm:text-[12.5px]" style={{ color: textColor }}>
          {family.name}
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenCatalog();
        }}
        aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
        title={t("catalog.openFamilyButton", { familyName: family.name })}
        className="mr-1.5 flex shrink-0 items-center justify-center rounded-lg p-1.5 transition hover:opacity-70"
        style={{ color: iconColor }}
      >
        <BookOpen className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

// Panel de contenido de la familia seleccionada — título + botón "Revista"
// arriba (fácil de encontrar, ver fix-sidebar-panel-scroll.md), y debajo las
// categorías de esa familia como acordeón (una expandida a la vez).
function CategoryPanel({
  family,
  expandedCategoryId,
  onToggleCategory,
  onOpenCategoryInCatalog,
  onOpenFamilyCatalog,
}: {
  family: HierarchyNode;
  expandedCategoryId: string | null;
  onToggleCategory: (id: string) => void;
  onOpenCategoryInCatalog: (categoryId: string) => void;
  onOpenFamilyCatalog: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  const subFamiliesWithCategories = family.children.filter((sf) => sf.children.length > 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: CHIP_BG }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.6} style={{ color: ACCENT }} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[17px] font-semibold sm:text-[19px]" style={{ color: INK }}>
              {family.name}
            </p>
            <p className="text-[12px] font-medium" style={{ color: ACCENT }}>
              {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFamilyCatalog}
          aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
          title={t("catalog.openFamilyButton", { familyName: family.name })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition hover:opacity-80"
          style={{ color: ACCENT, background: CHIP_BG }}
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          {t("catalog.openFamilyButtonShort")}
        </button>
      </div>

      <div className="space-y-3">
        {subFamiliesWithCategories.map((subFamily) => (
          <div key={subFamily.id}>
            {subFamiliesWithCategories.length > 1 && (
              <p
                className="mb-2 mt-2 text-[12px] font-extrabold uppercase"
                style={{ color: INK, letterSpacing: "0.07em" }}
              >
                {subFamily.name}
              </p>
            )}
            <div className="space-y-1">
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
    </div>
  );
}

// Fila de categoría (dentro del panel derecho) — expande para mostrar los
// nombres de producto en texto plano. Solo una categoría expandida a la vez.
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
                  consumir todo el alto disponible del panel. */}
              <div data-lenis-prevent className="max-h-[220px] overflow-y-auto pr-1">
                <div className="columns-1 gap-x-5 sm:columns-2">
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
