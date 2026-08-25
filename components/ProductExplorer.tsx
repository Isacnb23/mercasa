"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown, Package, Search, type LucideIcon } from "lucide-react";
import type { HierarchyNode, ProductSummary } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import { cn, formatProductCount, normalizeSearchText } from "@/lib/utils";
import Reveal from "./Reveal";
import ProductCatalogModal from "./ProductCatalogModal";

// Mismos colores del selector master-detail que ya existía en esta sección
// (distintos del corp-blue #075FD8 que usa el resto del sitio).
const ACCENT = "#185FA5";
const CHIP_BG = "#F0F5FA";

// Mínimo de caracteres para activar la búsqueda: por debajo de esto, sobre
// ~900 productos, el resultado sería demasiado ruidoso para ser útil.
const MIN_SEARCH_LENGTH = 2;

interface SearchIndexEntry extends ProductSummary {
  familyName: string;
  categoryName: string;
  familyIcon: LucideIcon;
}

// Índice plano de productos para la búsqueda, independiente de la
// navegación por familia/sub-familia/categoría. Solo recorre family ->
// sub-familia -> categoría (no hace falta bajar a sub-categoría: `products`
// en cada categoría ya viene aplanado con TODO lo que hay debajo, ver
// buildProductHierarchy en lib/mercasavip-catalog.ts).
function buildSearchIndex(families: HierarchyNode[]): SearchIndexEntry[] {
  const index: SearchIndexEntry[] = [];
  for (const family of families) {
    const familyIcon = FAMILY_ICONS[family.id] ?? Package;
    for (const subFamily of family.children) {
      for (const category of subFamily.children) {
        for (const product of category.products ?? []) {
          index.push({
            ...product,
            familyName: family.name,
            categoryName: category.name,
            familyIcon,
          });
        }
      }
    }
  }
  return index;
}

export default function ProductExplorer({ families }: { families: HierarchyNode[] }) {
  const t = useTranslations("Products");
  const [query, setQuery] = useState("");
  // El catálogo interactivo es independiente por familia: cada una se abre
  // directo desde su propio botón "Revista" (ver FamilyListItem) como un
  // overlay de pantalla completa (ProductCatalogModal, portal a
  // document.body) — nunca hay una pantalla compartida listando las 5
  // familias juntas (feedback explícito: eso se sentía como un selector de
  // dashboard, no como revistas independientes).
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;
  const [activeFamilyId, setActiveFamilyId] = useState(families[0].id);
  const [activeSubFamilyId, setActiveSubFamilyId] = useState(families[0].children[0]?.id ?? "");
  // Vive acá (no dentro de CategoryAccordion) para poder resetearla al
  // mismo tiempo que la familia/sub-familia activa cambian, en vez de
  // depender del remount del acordeón: el acordeón siempre arranca cerrado
  // cuando se cambia de contexto, como pide el diseño.
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? families[0];
  const resolvedSubFamilyId = activeFamily.children.some((sf) => sf.id === activeSubFamilyId)
    ? activeSubFamilyId
    : (activeFamily.children[0]?.id ?? "");
  const activeSubFamily = activeFamily.children.find((sf) => sf.id === resolvedSubFamilyId) ?? null;

  const handleSelectFamily = (id: string) => {
    setActiveFamilyId(id);
    const family = families.find((f) => f.id === id);
    setActiveSubFamilyId(family?.children[0]?.id ?? "");
    setExpandedCategoryId(null);
  };

  const handleSelectSubFamily = (id: string) => {
    setActiveSubFamilyId(id);
    setExpandedCategoryId(null);
  };

  const searchIndex = useMemo(() => buildSearchIndex(families), [families]);
  const normalizedQuery = normalizeSearchText(query.trim());
  const searchResults =
    normalizedQuery.length >= MIN_SEARCH_LENGTH
      ? searchIndex.filter((entry) => normalizeSearchText(entry.name).includes(normalizedQuery))
      : null;

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

      <Reveal delay={0.03} className="mx-auto mt-6 max-w-[480px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "#8493A5" }}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="w-full rounded-full border bg-white py-3 pl-11 pr-4 text-[14px] text-corp-ink outline-none transition focus:border-[#185FA5]"
            style={{ borderColor: "#E2E8F0" }}
          />
        </div>
      </Reveal>

      {catalogFamily && (
        <ProductCatalogModal family={catalogFamily} onClose={() => setCatalogFamilyId(null)} />
      )}

      {searchResults ? (
        <SearchResults results={searchResults} />
      ) : (
        <Reveal delay={0.05} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-8">
        {/* Familias: fila de chips con scroll horizontal en mobile, columna en desktop */}
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {families.map((family) => (
            <FamilyListItem
              key={family.id}
              family={family}
              isActive={activeFamily.id === family.id}
              onSelect={() => handleSelectFamily(family.id)}
              onOpenCatalog={() => setCatalogFamilyId(family.id)}
            />
          ))}
        </div>

        {/* Panel de detalle: el alto lo termina fijando el contenedor de
            categorías de más abajo (ver CategoryAccordion, h-[280px]) — acá
            solo queda el `layout` para que cualquier cambio de alto restante
            (ej. header de dos líneas en nombres de familia largos) anime
            suave en vez de saltar. */}
        <motion.div
          layout
          className="relative overflow-hidden rounded-[28px] border bg-white"
          style={{ borderColor: "#E2E8F0", boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeFamily.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 sm:p-8"
            >
              <FamilyDetailHeader family={activeFamily} />

              {activeFamily.children.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
                    {t("subfamiliesLabel")}
                  </p>
                  <div className="mt-2.5 flex gap-3 overflow-x-auto pb-2">
                    {activeFamily.children.map((subFamily) => (
                      <SubFamilyCard
                        key={subFamily.id}
                        subFamily={subFamily}
                        isActive={activeSubFamily?.id === subFamily.id}
                        onSelect={() => handleSelectSubFamily(subFamily.id)}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    {activeSubFamily && (
                      <motion.div
                        key={activeSubFamily.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-5"
                      >
                        <CategoryAccordion
                          categories={activeSubFamily.children}
                          subFamilyName={activeSubFamily.name}
                          familyIcon={FAMILY_ICONS[activeFamily.id] ?? Package}
                          expandedId={expandedCategoryId}
                          onToggle={setExpandedCategoryId}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        </Reveal>
      )}
    </div>
  );
}

// Chip circular con el ícono de familia, reutilizado en las filas de
// producto (dentro de una categoría) y en los resultados de búsqueda —
// mismo tratamiento visual, más chico que el de FamilyDetailHeader.
function ProductIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: CHIP_BG }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} style={{ color: ACCENT }} aria-hidden />
    </span>
  );
}

// Panel de resultados de búsqueda: reemplaza la navegación por familia/
// categoría por completo (independiente de ella, como pide el diseño). Cada
// resultado muestra a qué familia/categoría pertenece, porque acá no hay
// contexto de navegación que ya lo indique.
function SearchResults({ results }: { results: SearchIndexEntry[] }) {
  const t = useTranslations("Products");

  if (results.length === 0) {
    return (
      <Reveal delay={0.05} className="mt-6 rounded-[28px] border bg-white px-6 py-14 text-center" style={{ borderColor: "#E2E8F0" }}>
        <p className="text-[14px]" style={{ color: "#5C6B7D" }}>
          {t("search.noResults")}
        </p>
      </Reveal>
    );
  }

  return (
    <Reveal
      delay={0.05}
      className="mt-6 rounded-[28px] border bg-white p-4 sm:p-6"
      style={{ borderColor: "#E2E8F0", boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
    >
      <p className="px-2 text-[11px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
        {t("search.resultsCount", { count: results.length })}
      </p>
      <div className="mt-2 max-h-[440px] space-y-1 overflow-y-auto pr-1">
        {results.map((result) => (
          <div key={result.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#F8F9FB]">
            <ProductIcon Icon={result.familyIcon} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-corp-ink">{result.name}</p>
              <p className="truncate text-[11.5px]" style={{ color: "#8493A5" }}>
                {result.familyName} · {result.categoryName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function FamilyDetailHeader({ family }: { family: HierarchyNode }) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: CHIP_BG }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
      </span>
      <div>
        <h3
          className="font-display text-corp-ink"
          style={{ fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 600, lineHeight: 1.15 }}
        >
          {family.name}
        </h3>
        <p className="mt-1 text-[13px] font-medium" style={{ color: ACCENT }}>
          {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
        </p>
      </div>
    </div>
  );
}

function FamilyListItem({
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

  return (
    <div
      className={cn(
        "flex min-h-[52px] shrink-0 items-center gap-1 rounded-2xl transition duration-300 lg:min-h-[64px] lg:w-full",
        isActive ? "shadow-[0_10px_26px_rgba(24,95,165,0.28)]" : "border border-[#E2E8F0] bg-white hover:border-[#185FA5]/30"
      )}
      style={{ background: isActive ? ACCENT : undefined }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
          style={{
            background: isActive ? "rgba(255,255,255,0.18)" : CHIP_BG,
            color: isActive ? "#ffffff" : ACCENT,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className="whitespace-nowrap text-[14.5px] font-semibold"
            style={{ color: isActive ? "#ffffff" : "#0c1a26" }}
          >
            {family.name}
          </span>
          <span
            className="whitespace-nowrap text-[12px] font-medium"
            style={{ color: isActive ? "rgba(255,255,255,0.85)" : "#5C6B7D" }}
          >
            {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
          </span>
        </span>
      </button>

      {/* Abre DIRECTO la revista de esta familia — independiente, sin pasar
          por una pantalla que liste las familias juntas. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenCatalog();
        }}
        aria-label={t("catalog.openFamilyButton", { familyName: family.name })}
        title={t("catalog.openFamilyButton", { familyName: family.name })}
        className="mr-2 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition"
        style={{
          color: isActive ? "#ffffff" : ACCENT,
          background: isActive ? "rgba(255,255,255,0.16)" : CHIP_BG,
        }}
      >
        <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        <span className="hidden lg:inline">{t("catalog.openFamilyButtonShort")}</span>
      </button>
    </div>
  );
}

// Mini-tarjeta de sub-familia: nombre + cantidad en dos líneas, siempre en
// fila con scroll horizontal (desktop y mobile), a diferencia de la columna
// de familias que sí cambia de layout por breakpoint.
function SubFamilyCard({
  subFamily,
  isActive,
  onSelect,
}: {
  subFamily: HierarchyNode;
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("Products");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "flex min-w-[136px] shrink-0 flex-col gap-1 rounded-2xl px-4 py-3 text-left transition duration-300",
        isActive ? "shadow-[0_10px_26px_rgba(24,95,165,0.28)]" : "border border-[#E2E8F0] bg-white hover:border-[#185FA5]/30"
      )}
      style={{ background: isActive ? ACCENT : undefined }}
    >
      <span
        className="whitespace-nowrap text-[13.5px] font-semibold"
        style={{ color: isActive ? "#ffffff" : "#0c1a26" }}
      >
        {subFamily.name}
      </span>
      <span
        className="whitespace-nowrap text-[11.5px] font-medium"
        style={{ color: isActive ? "rgba(255,255,255,0.85)" : "#5C6B7D" }}
      >
        {t("productsCount", { count: subFamily.itemCount })}
      </span>
    </button>
  );
}

// Acordeón de categorías: todas las filas tienen el mismo tratamiento
// (nombre + cantidad + borde). El chevron solo aparece cuando hay algo real
// para expandir (sub-categorías, o en el futuro tamaños de empaque).
//
// El estado de expansión vive en ProductExplorer (no acá adentro): así el
// padre puede cerrarlo explícitamente ANTES de cambiar de familia/sub-familia
// (ver handleSelectFamily/handleSelectSubFamily), cumpliendo el requisito de
// que el acordeón siempre arranque colapsado al cambiar de contexto.
function CategoryAccordion({
  categories,
  subFamilyName,
  familyIcon,
  expandedId,
  onToggle,
}: {
  categories: HierarchyNode[];
  subFamilyName: string;
  familyIcon: LucideIcon;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const t = useTranslations("Products");

  return (
    <div>
      <p className="text-[11px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
        {t("categoriesInLabel", { subFamilyName })}
      </p>
      {/* Alto FIJO (no solo un tope): antes esto era max-h-420, así que
          familias con pocas categorías (ej. Cuidado Personal, 1 categoría)
          dejaban un panel mucho más bajo que familias con muchas (ej.
          Alimentos, 14 → llenaba el tope de 420px), y el panel entero
          saltaba de tamaño al cambiar de familia. Calibrado con Bebidas (5
          categorías en su primera sub-familia) como caso típico/mediano —
          ni el extremo más chico (Cuidado Personal, 1) ni el más grande
          (Alimentos, 14). Categorías de más siguen scrolleando adentro,
          categorías de menos dejan espacio vacío abajo — en ambos casos el
          panel completo (ver `layout` en el contenedor de arriba) mantiene
          el mismo alto. */}
      <div className="mt-2.5 h-[280px] space-y-2 overflow-y-auto pr-1">
        {categories.map((category) => (
          <CategoryAccordionRow
            key={category.id}
            category={category}
            familyIcon={familyIcon}
            isExpanded={expandedId === category.id}
            onToggle={() => onToggle(expandedId === category.id ? null : category.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryAccordionRow({
  category,
  familyIcon,
  isExpanded,
  onToggle,
}: {
  category: HierarchyNode;
  familyIcon: LucideIcon;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Products");
  // Cuando la categoría tiene una sola sub-categoría con el mismo nombre
  // (Hierarchy3 == Hierarchy4, ej. "Helados" -> "Helados"), no suma
  // información — es puro ruido repetido en la vista.
  const isRedundantSingleChild =
    category.children.length === 1 &&
    category.children[0].name.toLowerCase() === category.name.toLowerCase();
  const subCategories = isRedundantSingleChild ? [] : category.children;
  const hasPackSizes = (category.packSizes?.length ?? 0) > 0;
  const hasProducts = (category.products?.length ?? 0) > 0;
  const isExpandable = subCategories.length > 0 || hasPackSizes || hasProducts;

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#E2E8F0" }}>
      <button
        type="button"
        onClick={isExpandable ? onToggle : undefined}
        aria-expanded={isExpandable ? isExpanded : undefined}
        disabled={!isExpandable}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span className="text-[14px] font-semibold text-corp-ink">{category.name}</span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="text-[12px] font-medium" style={{ color: "#5C6B7D" }}>
            {t("productsCount", { count: category.itemCount })}
          </span>
          {isExpandable && (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")}
              style={{ color: ACCENT }}
              aria-hidden
            />
          )}
        </span>
      </button>

      {/* Sin AnimatePresence acá a propósito: el contenido queda siempre
          montado y solo se anima su `height`/`opacity` vía `animate`. Evita
          anidar un AnimatePresence propio de esta fila dentro del panel que
          arriba se reemplaza por completo (mode="wait" en ProductExplorer
          al cambiar de familia/sub-familia) — más simple y sin depender de
          que la animación de esta fila termine para que el panel de arriba
          pueda completar la suya. */}
      {isExpandable && (
        <motion.div
          initial={false}
          animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden" }}
        >
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
              {subCategories.map((subCategory) => (
                <span
                  key={subCategory.id}
                  className="rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{ background: CHIP_BG, color: ACCENT }}
                >
                  {subCategory.name}
                </span>
              ))}
            </div>
          )}

          {hasPackSizes && (
            <p className="px-4 pb-3 text-[11.5px] font-medium" style={{ color: ACCENT }}>
              {t("packSizesLabel")}: {category.packSizes!.join(" · ")}
            </p>
          )}

          {hasProducts && <ProductList products={category.products!} familyIcon={familyIcon} />}
        </motion.div>
      )}
    </div>
  );
}

// Cuántos productos se muestran antes de necesitar "Mostrar más". La
// mayoría de las categorías tienen pocos ítems (mediana ~3 en el catálogo
// real), pero algunas superan 70 — de ahí la paginación en vez de listarlos
// todos de una. Sin fotos por producto (no disponibles en la API, ver
// prompt-verificar-imagenes-api.md): mismo ícono genérico de familia para
// todas las filas, nunca uno distinto por producto.
const PRODUCTS_PAGE_SIZE = 8;

function ProductList({
  products,
  familyIcon,
}: {
  products: ProductSummary[];
  familyIcon: LucideIcon;
}) {
  const t = useTranslations("Products");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PAGE_SIZE);
  const visibleProducts = products.slice(0, visibleCount);
  const remaining = products.length - visibleProducts.length;

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: "#E2E8F0" }}>
      <p className="text-[10.5px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
        {t("productsLabel")}
      </p>
      <div className="mt-2 space-y-1">
        {visibleProducts.map((product) => (
          <div key={product.id} className="flex items-center gap-2.5 py-1">
            <ProductIcon Icon={familyIcon} />
            <span className="min-w-0 truncate text-[13px] font-medium text-corp-ink">{product.name}</span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PRODUCTS_PAGE_SIZE)}
          className="mt-1.5 text-[12.5px] font-semibold transition hover:opacity-80"
          style={{ color: ACCENT }}
        >
          {t("showMore", { count: remaining })}
        </button>
      )}
    </div>
  );
}
