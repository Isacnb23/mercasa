"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HierarchyNode } from "@/lib/product-types";
import { businessSegments } from "@/lib/data";
import CustomerClassSection, { resolveChipTarget } from "./CustomerClassSection";
import BrandsSection from "../brands/BrandsSection";
import ProductCatalogModal from "../../modals/product-catalog/ProductCatalogModal";
import { useActiveSegment } from "./ActiveSegmentContext";

// Busca el nodo real de categoría (sub-familia -> categoría) dentro de una
// Familia, a partir del id resuelto por `resolveChipTarget` — necesario para
// el modo filtrado de "Explorar productos" (ver
// customer-class-animacion-filtro.md, punto 2), que necesita el nodo
// HierarchyNode completo (con `.products`), no solo el id.
function findCategoryById(family: HierarchyNode, categoryId: string): HierarchyNode | null {
  for (const subFamily of family.children) {
    for (const category of subFamily.children) {
      if (category.id === categoryId) return category;
    }
  }
  return null;
}

/**
 * "Segmento de Mercado" + "Marcas" (ver reestructuracion-orden-secciones.md):
 * antes vivían dentro de ContactSection.tsx, justo antes de "Hablemos de
 * negocios" — feedback del equipo fue que la sección quedaba "muy abajo" en
 * la página. Se extrajeron a su propio componente para poder ubicarlas
 * justo después del Hero, mientras "Hablemos de negocios" se queda donde
 * estaba (después de Colaboradores). Lo único que las dos partes siguen
 * compartiendo es el segmento activo (para que el WhatsApp de cierre del
 * formulario siga contextualizado) — eso vive ahora en ActiveSegmentContext,
 * no acá. Todo lo demás (estado del catálogo/modal, handlers de chips) es
 * puramente local a este componente, igual que antes.
 */
export default function MarketSegmentSection({ families = [] }: { families?: HierarchyNode[] }) {
  const t = useTranslations("Contact");
  const { activeSegmentKey, setActiveSegmentKey } = useActiveSegment();
  const activeSegment = businessSegments.find((seg) => seg.key === activeSegmentKey) ?? businessSegments[0];

  // Catálogo abierto desde un chip de "categorías" o el botón "Explorar
  // productos" de Customer Class (ver customer-class-chips-reales.md y
  // rediseno-customer-class-spec-completo.md) — mismo patrón de
  // ProductExplorer (family+categoryId en vez de un booleano "open"):
  // `catalogFamily` es null cuando no hay ninguna abierta, así que
  // ProductCatalogModal se desmonta por completo al cerrar en vez de solo
  // ocultarse.
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const [catalogCategoryId, setCatalogCategoryId] = useState<string | undefined>(undefined);
  // Modo filtrado de "Explorar productos" (ver
  // customer-class-animacion-filtro.md, punto 2) — lista de categorías
  // reales (con su propia Familia, que puede ser distinta por entrada) a
  // mostrar TODAS juntas en el catálogo, además del modo de una sola
  // categoría de arriba que ya usan los chips individuales (sin tocar ese
  // camino). Vacío/null = no está en modo filtrado.
  const [catalogFilter, setCatalogFilter] = useState<{ category: HierarchyNode }[] | null>(null);
  const [catalogFilterTitle, setCatalogFilterTitle] = useState<string | undefined>(undefined);
  // `key` del segmento activo cuando el catálogo se abrió desde "Explorar
  // productos" (ver catalogo-portada-por-segmento.md) — decide la portada
  // del flipbook (ver SEGMENT_COVER_PHOTOS en ProductCatalogModal). null en
  // cualquier otro camino de apertura (chips individuales, ProductExplorer)
  // para que esos sigan mostrando la portada genérica de siempre.
  const [catalogSegmentId, setCatalogSegmentId] = useState<string | null>(null);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;
  const closeCatalog = () => {
    setCatalogFamilyId(null);
    setCatalogCategoryId(undefined);
    setCatalogFilter(null);
    setCatalogFilterTitle(undefined);
    setCatalogSegmentId(null);
  };

  // Resuelve el chip/categoría clickeado (ver resolveChipTarget en
  // CustomerClassSection.tsx) contra los datos reales de MercasaVIP y abre
  // el catálogo posicionado ahí. Si `families` todavía no llegó (fetch en
  // curso o falló) o el slug no matchea nada real, no hace nada — el chip
  // queda igual de clickeable, solo que esta vez no encuentra destino (no
  // vale la pena un estado de error visible para un caso tan puntual). Modo
  // de una sola categoría — SIN cambios (ver customer-class-animacion-
  // filtro.md: el filtro multi-Familia de abajo es exclusivo de "Explorar
  // productos", este camino se queda intacto).
  const handleSelectCategory = (categoryKey: string) => {
    const resolved = resolveChipTarget(families, categoryKey);
    if (!resolved) return;
    setCatalogFilter(null);
    setCatalogFilterTitle(undefined);
    setCatalogSegmentId(null);
    setCatalogFamilyId(resolved.familyId);
    setCatalogCategoryId(resolved.categoryId);
  };

  // Botón "Explorar productos" del panel de Customer Class (ver
  // customer-class-animacion-filtro.md, punto 2): antes abría solo la
  // PRIMERA categoría del segmento (vía handleSelectCategory) — ahora abre
  // el catálogo ya filtrado a TODAS las categorías disponibles de ese
  // segmento, que en la práctica cruzan varias Familias distintas (ej. las
  // 5 de "Supermercados y cadenas" viven en 4 Familias). Usa el nuevo modo
  // filtrado de ProductCatalogModal (aditivo — no toca el modo de una sola
  // categoría que siguen usando los chips y ProductExplorer).
  const handleExploreProducts = () => {
    const resolved = activeSegment.categories
      .map((categoryKey) => {
        const target = resolveChipTarget(families, categoryKey);
        if (!target || !target.categoryId) return null;
        const family = families.find((f) => f.id === target.familyId);
        if (!family) return null;
        const category = findCategoryById(family, target.categoryId);
        if (!category) return null;
        return { family, category };
      })
      .filter((entry): entry is { family: HierarchyNode; category: HierarchyNode } => entry !== null);

    if (resolved.length === 0) return;

    setCatalogCategoryId(undefined);
    setCatalogFamilyId(resolved[0].family.id);
    setCatalogFilter(resolved.map(({ category }) => ({ category })));
    setCatalogFilterTitle(t(`segments.${activeSegment.key}.label`));
    setCatalogSegmentId(activeSegment.key);
  };

  return (
    <>
      <CustomerClassSection
        activeKey={activeSegmentKey}
        onSelect={setActiveSegmentKey}
        onSelectCategory={handleSelectCategory}
        onExploreProducts={handleExploreProducts}
        families={families}
      />

      {/* Mural de marcas justo después de "Segmento de Mercado" (ver
          marcas-orden-y-catalogo-general-banner.md, cambio 1) — se mueve
          junto con ella (ver reestructuracion-orden-secciones.md: el
          equipo pidió subir "Segmento de Mercado", y Marcas ya se
          consideraba parte de esa misma sección). */}
      <BrandsSection />

      {catalogFamily && (
        <ProductCatalogModal
          family={catalogFamily}
          allFamilies={families}
          initialCategoryId={catalogCategoryId}
          filterCategories={catalogFilter ?? undefined}
          filterTitle={catalogFilterTitle}
          segmentId={catalogSegmentId ?? undefined}
          onClose={closeCatalog}
        />
      )}
    </>
  );
}
