"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image, { type StaticImageData } from "next/image";
import HTMLFlipBook from "react-pageflip";
import { useLocale, useTranslations } from "next-intl";
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  HeartHandshake,
  Info,
  Lock,
  Package,
  Plus,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { HierarchyNode, ProductAvailability, ProductSummary } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import { formatProductCount } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useCatalogPrices } from "@/lib/hooks/useCatalogPrices";
import { samePrice, type PickupPriceView, type PriceView } from "@/lib/catalog-prices";
import { needsUnitsForPlus, plusDecision } from "@/lib/add-rules";
import { cartPickupSite } from "@/lib/cart-logic";
import { fetchItemUnits } from "@/lib/fetch-units";
import { site } from "@/lib/data";
import PriceTag, { PickupPriceTag } from "./PriceTag";
import { ChannelBadges, ChannelFilterBar } from "./ChannelBadges";
import { collectVisiblePriceIds } from "@/lib/channel-price";
import {
  canAddToCart,
  hasDelivery,
  hasPickup,
  countByChannel,
  filterNodeByChannel,
  filterTreeByChannel,
  type CatalogChannel,
} from "@/lib/catalog-channel";
import { productTitle } from "@/lib/product-display";
import { shouldLoadPageImages } from "@/lib/image-window";
import CategoryMenu from "./CategoryMenu";
import { activeCategoryId as computeActiveCategoryId, planJump, visiblePageIndexes, type MenuSection } from "@/lib/category-nav";
import { createBookNavigator, type BookLike } from "@/lib/book-navigator";
import {
  anchorOf,
  chooseBookLayout,
  COLUMNS,
  DEFAULT_LAYOUT,
  findAnchor,
  pageSize,
  rowsFor,
  sameLayout,
  type BookLayout,
  type PageAnchor,
} from "@/lib/book-density";
import ProductImage from "./ProductImage";
import ProductDetailModal from "./ProductDetailModal";
import mercasaLogo from "@/public/models/mercasa-logo-transparent.png";
import heroWarehouse from "@/public/brand/Hero/hero-warehouse.png";
import heroWarehouse2 from "@/public/brand/Hero/hero-warehouse2.png";
import logisticaImportacion from "@/public/brand/Logistica/importacion-global.png";
import logisticaAlmacenamiento from "@/public/brand/Logistica/almacenamiento-inteligente.png";
import logisticaDistribucion from "@/public/brand/Logistica/distribucion-nacional.png";
import logisticaPuntoDeVenta from "@/public/brand/Logistica/punto-de-venta.png";
// Fotos reales de Mercasa (ver reemplazar-imagenes-portada-indice.md) — fijas
// para portada/portafolio, a diferencia de DECORATIVE_PHOTOS de abajo que
// rota por familia solo en los divisores de sub-familia.
import portadaPhoto from "@/public/Catalogo/portada.png";
import indicePhoto from "@/public/Catalogo/indice.png";
// Portadas por segmento de Customer Class (ver catalogo-portada-por-
// segmento.md) — rutas públicas (no import estático) porque cuál se usa se
// decide en runtime según el segmentId recibido. OJO: la carpeta real en
// disco es "CustumerClass" (sin la "o" de "Customer"), no "CustomerClass".
// Keys = los mismos `key` que ya usa businessSegments en lib/data.ts, no
// slugs nuevos inventados a partir del label.
const SEGMENT_COVER_PHOTOS: Record<string, string> = {
  supermercados: "/Catalogo/CustumerClass/catalogo-portada-supermercados-cadenas.png",
  hoteleria: "/Catalogo/CustumerClass/catalogo-portada-hoteleria-turismo.png",
  restaurantes: "/Catalogo/CustumerClass/catalogo-portada-restaurantes-food-service.png",
  "comercio-local": "/Catalogo/CustumerClass/catalogo-portada-comercio-local-pulperias.png",
  panaderias: "/Catalogo/CustumerClass/catalogo-portada-panaderias.png",
  instituciones: "/Catalogo/CustumerClass/catalogo-portada-sector-publico.png",
  retail: "/Catalogo/CustumerClass/catalogo-portada-retail-conveniencia.png",
};
// Fotos propias por sub-familia (ver conectar-imagenes-subfamilias-
// alimentos.md y conectar-imagenes-subfamilias-bebidas.md) — Cuidado del
// Hogar, Cuidado Personal y Electrónica todavía no tienen las suyas, esas
// siguen con DECORATIVE_PHOTOS rotando.
import alimentosLacteosYSucedaneos from "@/public/Catalogo/Alimentos/lacteos-y-sucedaneos.png";
import alimentosConfiteriaYSnacks from "@/public/Catalogo/Alimentos/confiteria-y-snacks.png";
import alimentosPanaderiaReposteriaGalletas from "@/public/Catalogo/Alimentos/panaderia-reposteria-y-galletas.png";
import alimentosEnlatados from "@/public/Catalogo/Alimentos/enlatados.png";
import alimentosPastasSalsasSopas from "@/public/Catalogo/Alimentos/pastas-salsas-y-sopas.png";
import alimentosGranos from "@/public/Catalogo/Alimentos/granos.png";
import alimentosGrasasYAceites from "@/public/Catalogo/Alimentos/grasas-y-aceites.png";
import alimentosCongelados from "@/public/Catalogo/Alimentos/congelados.png";
import alimentosEmbutidos from "@/public/Catalogo/Alimentos/embutidos.png";
import alimentosCarnes from "@/public/Catalogo/Alimentos/carnes.png";
import alimentosAzucar from "@/public/Catalogo/Alimentos/azucar.png";
import alimentosBaking from "@/public/Catalogo/Alimentos/baking.png";
import alimentosCereales from "@/public/Catalogo/Alimentos/cereales.png";
import alimentosAlimentosInfantiles from "@/public/Catalogo/Alimentos/alimentos-infantiles.png";
import alimentosCondimentosYEspecias from "@/public/Catalogo/Alimentos/condimentos-y-especias.png";
import alimentosTortillas from "@/public/Catalogo/Alimentos/tortillas.png";
import alimentosMermeladaYSpread from "@/public/Catalogo/Alimentos/mermelada-y-spread.png";
import bebidasNoAlcoholicas from "@/public/Catalogo/Bebidas/bebidas-no-alcoholicas.png";
import bebidasAlcoholicas from "@/public/Catalogo/Bebidas/bebidas-alcoholicas.png";
import bebidasEnPolvo from "@/public/Catalogo/Bebidas/bebidas-en-polvo-v2.png";
import hogarDesechables from "@/public/Catalogo/Cuidado-Hogar/desechables.png";
import hogarCuidadoDeLaRopa from "@/public/Catalogo/Cuidado-Hogar/cuidado-de-la-ropa.png";
import hogarFerreteria from "@/public/Catalogo/Cuidado-Hogar/ferreteria.png";
import hogarLimpiezaDelHogar from "@/public/Catalogo/Cuidado-Hogar/limpieza-del-hogar.png";
import hogarToallasYServilletas from "@/public/Catalogo/Cuidado-Hogar/toallas-y-servilletas.png";
import hogarInstitucional from "@/public/Catalogo/Cuidado-Hogar/institucional.png";
import hogarPapelYDispensadores from "@/public/Catalogo/Cuidado-Hogar/papel-y-dispensadores.png";
import hogarAccesoriosDeCocinaYBano from "@/public/Catalogo/Cuidado-Hogar/accesorios-de-cocina-y-bano.png";
// OJO: la carpeta real en disco es "Electrodomesticos", no "Electronica"
// como decía el doc original (ver completar-glosario-y-conectar-hogar-
// electronica.md) — se usa el nombre real.
import electronicaLineaBlanca from "@/public/Catalogo/Electrodomesticos/linea-blanca.png";
import electronicaElectrodomesticos from "@/public/Catalogo/Electrodomesticos/electrodomesticos.png";
import electronicaTelevisores from "@/public/Catalogo/Electrodomesticos/televisores.png";
import "./product-catalog-print.css";
import "./product-catalog-flipbook.css";
import "./product-catalog-flipbook-realism.css";
import "./product-catalog-overlay.css";

// Identidad de marca real de Mercasa. Mismos tokens que el resto del sitio
// (app/globals.css / HeroContent.tsx), no una paleta nueva inventada para
// la revista.
const INK = "#082B5C"; // corp-ink — el "navy" de marca
const ACCENT = "#075FD8"; // corp-blue
const ACCENT_BRIGHT = "#176BEB"; // mismo azul brillante que el acento del Hero
const CHIP_BG = "#E6F1FB";
const MUTED = "#8493A5";
const PAGE_BG = "#FFFFFF";
const RULE = "#E2E8F0";

// Tamaño "nativo" del libro — react-pageflip escala esto (vía `size=
// "stretch"` + bookBox calculado con ResizeObserver, ver más abajo) para
// llenar el espacio real disponible entre la barra superior y el pie, así
// que en la práctica el libro queda mucho más grande que esto en pantalla
// completa; estos números solo fijan la proporción y el punto de partida.
const BOOK_WIDTH = 600;
const BOOK_HEIGHT = 820;
const BOOK_MIN_WIDTH = 220;

// Ancho máximo de una hoja (el `maxWidth` que se le pasa a react-pageflip) y ancho máximo del panel (el
// `max-width` de .catalog-panel en product-catalog-overlay.css): con ellos se calcula el espacio real del libro.
const BOOK_MAX_PAGE_WIDTH = 860;
const PANEL_MAX_WIDTH = 1400;
// Tarjetas por hoja: 9 (3x3) o, como último recurso en hojas muy chicas, 6 (3x2). Lo decide el tamaño REAL de la
// hoja (ver lib/book-density.ts y el efecto de la hoja de prueba en ProductCatalogModal).

// Renglones por página impresa: son compactos, entran muchos más por hoja A4.
const PRINT_PAGE_SIZE = 15;

// Fotos DECORATIVAS/corporativas de los divisores de sub-familia — nunca
// fotos de producto (esas vienen de ProductImage vía el proxy). Portada y
// portafolio ya NO salen de acá (son fijas, ver portadaPhoto/indicePhoto
// arriba); esto solo rota entre sub-familias dentro de una misma revista, y
// el punto de partida de la rotación varía por familia (hash simple del id)
// para que dos revistas de familias distintas tampoco arranquen con la
// misma foto. Se van a reemplazar por fotos propias de cada sub-familia más
// adelante (ver reemplazar-imagenes-portada-indice.md).
const DECORATIVE_PHOTOS: StaticImageData[] = [
  heroWarehouse,
  logisticaDistribucion,
  logisticaAlmacenamiento,
  logisticaImportacion,
  logisticaPuntoDeVenta,
  heroWarehouse2,
];

function photoOffsetFor(familyId: string): number {
  let sum = 0;
  for (let i = 0; i < familyId.length; i++) sum += familyId.charCodeAt(i);
  return sum;
}

function pickPhoto(offset: number, slot: number): StaticImageData {
  return DECORATIVE_PHOTOS[(offset + slot) % DECORATIVE_PHOTOS.length];
}

// Mismo criterio de normalización que lib/mercasavip-catalog.ts
// (normalizeKey): sin tildes, minúsculas — así "Lácteos y Sucedáneos" y
// variantes de capitalización de la API matchean el mismo key.
function normalizeSubFamilyKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Mapa EXPLÍCITO sub-familia -> foto propia, centralizado para todas las
// familias (ver conectar-imagenes-subfamilias-alimentos.md y
// conectar-imagenes-subfamilias-bebidas.md) — con Bebidas confirmado que
// alcanza con agregar entradas acá, sin tocar la lógica de lookup. A
// propósito no es una función de slugify automática: el nombre de
// archivo real no siempre coincide con el slug que generaría una
// conversión automática (ej. "Bebidas en polvo" apunta a un archivo con
// "-v2" en el nombre real, no al que se había propuesto), así que un
// diccionario explícito evita ese desajuste.
const SUBFAMILY_PHOTOS: Record<string, StaticImageData> = {
  [normalizeSubFamilyKey("Lácteos y Sucedáneos")]: alimentosLacteosYSucedaneos,
  [normalizeSubFamilyKey("Confitería y Snacks")]: alimentosConfiteriaYSnacks,
  [normalizeSubFamilyKey("Panadería Repostería y galletas")]: alimentosPanaderiaReposteriaGalletas,
  [normalizeSubFamilyKey("Enlatados")]: alimentosEnlatados,
  [normalizeSubFamilyKey("Pastas Salsas y Sopas")]: alimentosPastasSalsasSopas,
  [normalizeSubFamilyKey("Granos")]: alimentosGranos,
  [normalizeSubFamilyKey("Grasas y Aceites")]: alimentosGrasasYAceites,
  [normalizeSubFamilyKey("Congelados")]: alimentosCongelados,
  [normalizeSubFamilyKey("Embutidos")]: alimentosEmbutidos,
  [normalizeSubFamilyKey("Carnes")]: alimentosCarnes,
  [normalizeSubFamilyKey("Azúcar")]: alimentosAzucar,
  [normalizeSubFamilyKey("Baking")]: alimentosBaking,
  [normalizeSubFamilyKey("Cereales")]: alimentosCereales,
  [normalizeSubFamilyKey("Alimentos Infantiles")]: alimentosAlimentosInfantiles,
  [normalizeSubFamilyKey("Condimentos y especias")]: alimentosCondimentosYEspecias,
  [normalizeSubFamilyKey("Tortillas")]: alimentosTortillas,
  [normalizeSubFamilyKey("Mermelada y Spread")]: alimentosMermeladaYSpread,
  [normalizeSubFamilyKey("Bebidas No Alcohólicas")]: bebidasNoAlcoholicas,
  [normalizeSubFamilyKey("Bebidas Alcohólicas")]: bebidasAlcoholicas,
  [normalizeSubFamilyKey("Bebidas en polvo")]: bebidasEnPolvo,
  [normalizeSubFamilyKey("Desechables")]: hogarDesechables,
  [normalizeSubFamilyKey("Cuidado de la Ropa")]: hogarCuidadoDeLaRopa,
  [normalizeSubFamilyKey("Ferretería")]: hogarFerreteria,
  [normalizeSubFamilyKey("Limpieza del hogar")]: hogarLimpiezaDelHogar,
  [normalizeSubFamilyKey("Toallas y servilletas")]: hogarToallasYServilletas,
  [normalizeSubFamilyKey("Institucional")]: hogarInstitucional,
  [normalizeSubFamilyKey("Papel y Dispensadores")]: hogarPapelYDispensadores,
  [normalizeSubFamilyKey("Accesorios de Cocina y Baño")]: hogarAccesoriosDeCocinaYBano,
  [normalizeSubFamilyKey("Línea Blanca")]: electronicaLineaBlanca,
  [normalizeSubFamilyKey("Electrodomésticos")]: electronicaElectrodomesticos,
  [normalizeSubFamilyKey("Televisores")]: electronicaTelevisores,
};

// Foto propia si la sub-familia está en SUBFAMILY_PHOTOS; si no (Cuidado
// Personal — la única familia que todavía no tiene fotos propias), cae al
// pool genérico que ya rotaba antes.
function photoForSubFamily(subFamilyName: string, offset: number, slot: number): StaticImageData {
  const specific = SUBFAMILY_PHOTOS[normalizeSubFamilyKey(subFamilyName)];
  return specific ?? pickPhoto(offset, slot);
}

// Mismos 3 pilares de marca que ya usa la sección Productos (Products.pillars
// en messages/*.json) — no se inventa copy nuevo.
const PILLAR_ICONS: Record<string, LucideIcon> = {
  catalogo: Boxes,
  disponibilidad: ShieldCheck,
  compromiso: HeartHandshake,
};
const PILLAR_KEYS = ["catalogo", "disponibilidad", "compromiso"] as const;

type BookPage =
  | { kind: "cover" }
  // Contraportada: cierra el libro cuando el total sería par (sin ella la última página quedaría sola y la
  // hoja derecha en blanco).
  | { kind: "back" }
  | { kind: "portfolio-info" }
  | { kind: "portfolio-visual" }
  | { kind: "subfamily-divider"; subFamily: HierarchyNode; photo: StaticImageData }
  | { kind: "category"; category: HierarchyNode; products: ProductSummary[]; part: number; totalParts: number; perPage: number };

// react-pageflip muestra las páginas de a pares (spread) después de la
// portada — portfolio-info/portfolio-visual son DOS entradas para que
// formen un spread propio (texto a la izquierda, foto+pilares a la
// derecha) en vez de una sola página que quedaría aplastada a la mitad del
// ancho. El salto "Ir a categoría" y prev/next funcionan igual de bien
// aunque una categoría caiga en índice par (page-flip la muestra como la
// página derecha del spread) — no hace falta rellenar con páginas en
// blanco para forzar paridad, eso solo infla el conteo de páginas.
function buildBookPages(family: HierarchyNode, photoOffset: number, perPage: number): BookPage[] {
  const pages: BookPage[] = [{ kind: "cover" }, { kind: "portfolio-info" }, { kind: "portfolio-visual" }];

  const subFamilies = family.children
    .map((subFamily) => ({
      subFamily,
      categories: subFamily.children.filter((category) => (category.products?.length ?? 0) > 0),
    }))
    .filter(({ categories }) => categories.length > 0);

  // El divisor de sub-familia solo suma variedad visual cuando hay más de
  // una — con una sola, sería una página extra sin nada que "dividir".
  const showDividers = subFamilies.length > 1;

  subFamilies.forEach(({ subFamily, categories }, subFamilyIndex) => {
    if (showDividers) {
      pages.push({
        kind: "subfamily-divider",
        subFamily,
        photo: photoForSubFamily(subFamily.name, photoOffset, 2 + subFamilyIndex),
      });
    }
    for (const category of categories) {
      const products = category.products ?? [];
      const totalParts = Math.max(1, Math.ceil(products.length / perPage));
      for (let part = 0; part < totalParts; part++) {
        pages.push({
          kind: "category",
          category,
          products: products.slice(part * perPage, (part + 1) * perPage),
          part: part + 1,
          totalParts,
          perPage,
        });
      }
    }
  });

  return pages;
}

interface PrintPage {
  categoryName: string;
  products: ProductSummary[];
}

function buildPrintPages(family: HierarchyNode): PrintPage[] {
  const pages: PrintPage[] = [];
  for (const subFamily of family.children) {
    for (const category of subFamily.children) {
      const products = category.products ?? [];
      if (products.length === 0) continue;
      for (let i = 0; i < products.length; i += PRINT_PAGE_SIZE) {
        pages.push({ categoryName: category.name, products: products.slice(i, i + PRINT_PAGE_SIZE) });
      }
    }
  }
  return pages;
}

// Busca la sub-familia real (con su `name` para SUBFAMILY_PHOTOS/foto
// genérica) que contiene esta categoría, recorriendo el árbol COMPLETO
// (allFamilies) — filterCategories solo trae la categoría suelta, sin el
// padre, así que hay que volver a subir el árbol para encontrarlo.
function findSubFamilyForCategory(allFamilies: HierarchyNode[], categoryId: string): HierarchyNode | null {
  for (const family of allFamilies) {
    for (const subFamily of family.children) {
      if (subFamily.children.some((category) => category.id === categoryId)) return subFamily;
    }
  }
  return null;
}

// Modo "filtrado" (ver customer-class-animacion-filtro.md, punto 2): a
// diferencia de buildBookPages/buildPrintPages (que recorren TODAS las
// sub-familias/categorías de UNA Familia), estas dos arman el libro/PDF a
// partir de una lista puntual de categorías ya resueltas — puede cruzar
// varias Familias distintas a la vez (ej. las 5 categorías de "Supermercados
// y cadenas" en Customer Class viven en 4 Familias distintas). SÍ lleva
// divisores de sub-familia (con la misma foto real que el modo normal, ver
// catalogo-custumer-sin-portadas.md) — se insertan cada vez que la
// sub-familia real de la categoría (encontrada con findSubFamilyForCategory)
// cambia respecto a la anterior, aunque las categorías del segmento salten
// entre Familias distintas. Reusa el resto del componente (portada, header,
// pie, impresión) sin tocarlo — ver `displayFamily` más abajo, que es lo
// único que cambia para reflejar el segmento en vez de una Familia real.
function buildFilteredBookPages(
  filterCategories: { category: HierarchyNode }[],
  allFamilies: HierarchyNode[],
  photoOffset: number,
  perPage: number
): BookPage[] {
  const pages: BookPage[] = [{ kind: "cover" }, { kind: "portfolio-info" }, { kind: "portfolio-visual" }];
  let lastSubFamilyId: string | null = null;
  let dividerSlot = 0;
  for (const { category } of filterCategories) {
    const products = category.products ?? [];
    if (products.length === 0) continue;
    const subFamily = findSubFamilyForCategory(allFamilies, category.id);
    if (subFamily && subFamily.id !== lastSubFamilyId) {
      pages.push({
        kind: "subfamily-divider",
        subFamily,
        photo: photoForSubFamily(subFamily.name, photoOffset, dividerSlot++),
      });
      lastSubFamilyId = subFamily.id;
    }
    const totalParts = Math.max(1, Math.ceil(products.length / perPage));
    for (let part = 0; part < totalParts; part++) {
      pages.push({
        kind: "category",
        category,
        products: products.slice(part * perPage, (part + 1) * perPage),
        part: part + 1,
        totalParts,
        perPage,
      });
    }
  }
  return pages;
}

function buildFilteredPrintPages(filterCategories: { category: HierarchyNode }[]): PrintPage[] {
  const pages: PrintPage[] = [];
  for (const { category } of filterCategories) {
    const products = category.products ?? [];
    if (products.length === 0) continue;
    for (let i = 0; i < products.length; i += PRINT_PAGE_SIZE) {
      pages.push({ categoryName: category.name, products: products.slice(i, i + PRINT_PAGE_SIZE) });
    }
  }
  return pages;
}

// El motor de react-pageflip clona cada hijo directo agregándole un `ref`
// para tomar el nodo DOM real — tiene que ser forwardRef, si no el libro no
// puede medir/posicionar la página.
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Page({ children }, ref) {
  return (
    <div ref={ref} className="page-content h-full w-full overflow-hidden">
      {children}
    </div>
  );
});

// Motivo geométrico muy sutil para el panel decorativo del hueco de spread
// simple (ver catalogo-portada-espacio-y-mobile.md) — mismo lenguaje visual
// (círculos concéntricos + hexágono en trazo fino, blanco a baja opacidad)
// que ya usa la franja navy de ProductExplorer.tsx, para que se sienta la
// misma mano de diseño en vez de inventar un patrón nuevo.
function SpreadGutterPattern({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={`absolute bottom-[-15%] h-[70%] w-[70%] opacity-[0.08] ${flip ? "right-[-25%]" : "left-[-25%]"}`}
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden
    >
      <g stroke="#ffffff" strokeWidth="1.5" transform={flip ? "translate(320,0) scale(-1,1)" : undefined}>
        <circle cx="90" cy="230" r="140" />
        <circle cx="90" cy="230" r="95" />
        <polygon points="90,120 180,168 180,264 90,312 0,264 0,168" />
      </g>
    </svg>
  );
}

// Métodos reales de PageFlip que usamos (el paquete `page-flip` no publica
// tipos, así que se declara acá solo lo que se consume — evita `any` suelto
// sin depender de los tipos internos de un paquete de terceros).
interface PageFlipController {
  flipNext: () => void;
  flipPrev: () => void;
  flip: (page: number) => void;
  getCurrentPageIndex: () => number;
  /** Vuelve a medir el área del libro y a dimensionar las hojas. */
  update: () => void;
}

// Catálogo interactivo de UNA familia (independiente — no hay pantalla
// compartida que liste las familias como punto de entrada; cada una se abre
// directo desde su propio botón "Revista" en ProductExplorer). `allFamilies`
// solo alimenta la página de portafolio (contenido de marca, no navegación).
// Panel flotante con backdrop difuminado (portal a document.body, ver
// product-catalog-overlay.css) — se cierra con la X/"Volver al sitio", ESC,
// o un click en el backdrop fuera del panel, siempre con fade-out simétrico
// antes de desmontar (ver `handleClose`).
export default function ProductCatalogModal({
  family: familyProp,
  allFamilies: allFamiliesProp,
  initialCategoryId,
  filterCategories: filterCategoriesProp,
  filterTitle,
  filterIcon,
  segmentId,
  onClose,
}: {
  family: HierarchyNode;
  allFamilies: HierarchyNode[];
  /** Categoría donde abrir el libro (ver ProductExplorer, CTA "Ver en el
   * catálogo" por categoría) — reusa el mismo `categoryPageIndex` que
   * alimenta el <select> "Ir a categoría" interno, así que si un id no
   * matchea ninguna página (categoría sin productos) simplemente abre en
   * la portada como siempre. Se ignora si `filterCategories` viene con al
   * menos una entrada (el modo filtrado abre siempre en la portada). */
  initialCategoryId?: string;
  /** Modo filtrado (ver customer-class-animacion-filtro.md, punto 2) —
   * ADITIVO: cuando viene con al menos una entrada, el libro/PDF se arma
   * SOLO con estas categorías puntuales (pueden cruzar varias Familias
   * distintas), en vez de recorrer `family.children` completo. `family` y
   * `initialCategoryId` se siguen recibiendo pero se ignoran para armar
   * contenido en este modo (family solo importa como fallback de
   * `filterTitle`/`filterIcon` si no se pasan). El modo de una sola
   * Familia (sin este prop, como ya usaban los chips individuales y
   * ProductExplorer) sigue exactamente igual que antes. */
  filterCategories?: { category: HierarchyNode }[];
  /** Nombre a mostrar (header, portada, pie de impresión) en modo filtrado
   * — normalmente el label del segmento de Customer Class ("Supermercados
   * y cadenas"), no el nombre de ninguna Familia real puntual. */
  filterTitle?: string;
  /** Ícono a mostrar en modo filtrado — normalmente el ícono del segmento
   * de Customer Class. Si no se pasa, cae al ícono de `family`. */
  filterIcon?: LucideIcon;
  /** `key` del segmento de Customer Class (ver businessSegments en
   * lib/data.ts) cuando el catálogo se abrió desde "Explorar productos" de
   * ese segmento (ver catalogo-portada-por-segmento.md) — decide qué
   * portada mostrar (SEGMENT_COVER_PHOTOS de arriba). Si no matchea ninguna
   * key del mapeo (o no se pasa, ej. chips individuales/ProductExplorer),
   * cae a la portada genérica `portada.png` sin romper nada — no hay forma
   * correcta de adivinar un segmento a partir de una categoría suelta, así
   * que ni se intenta. */
  segmentId?: string;
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  // Solo las abreviaturas CONFIRMADAS por Isaac (ver
  // fix-truncamiento-y-glosario.md y
  // completar-glosario-y-conectar-hogar-electronica.md) — agrupadas por
  // denominador ("por Caja", "por Bulto", "por Tarima") para que se lean
  // como un patrón general en vez de una lista plana. Variantes de
  // formato del mismo concepto (U/C con UND/CAJA, D/C con DISPL/CAJA) se
  // muestran juntas en una sola fila. UND/CM y otros patrones minoritarios
  // quedan pendientes de confirmar, no están acá.
  const glossaryGroups = t.raw("catalog.glossaryGroups") as {
    title: string;
    entries: { abbr: string; meaning: string }[];
  }[];
  // Canal elegido en los chips "Todos / A domicilio / Retiro en tienda". El libro, el menú "Ir a categoría" y el
  // PDF se arman SIEMPRE desde el árbol ya filtrado (family / allFamilies / filterCategories de aquí abajo),
  // así sus páginas y conteos coinciden con lo que se ve.
  const [channel, setChannel] = useState<CatalogChannel>("all");
  const [channelChanged, setChannelChanged] = useState(false);
  // El modo filtrado de Customer Class se decide con lo que VINO por props: un canal sin productos no lo
  // convierte en el modo de una sola familia.
  const isFiltered = !!filterCategoriesProp && filterCategoriesProp.length > 0;
  const family = useMemo(
    () => filterNodeByChannel(familyProp, channel) ?? { ...familyProp, itemCount: 0, children: [] },
    [familyProp, channel]
  );
  const allFamilies = useMemo(() => filterTreeByChannel(allFamiliesProp, channel), [allFamiliesProp, channel]);
  const filterCategories = useMemo(
    () =>
      channel === "all" || !filterCategoriesProp
        ? filterCategoriesProp
        : filterCategoriesProp.flatMap(({ category }) => {
            const filtered = filterNodeByChannel(category, channel);
            return filtered ? [{ category: filtered }] : [];
          }),
    [filterCategoriesProp, channel]
  );
  const channelCounts = useMemo(
    () => countByChannel(isFiltered ? filterCategoriesProp!.map(({ category }) => category) : [familyProp]),
    [isFiltered, filterCategoriesProp, familyProp]
  );
  // Portada por segmento (ver catalogo-portada-por-segmento.md) — solo
  // cuando `segmentId` matchea una key real del mapeo; cualquier otro caso
  // (sin segmentId, o uno que no matchea) cae a la portada genérica de
  // siempre, sin romper el comportamiento existente.
  const coverPhoto: string | StaticImageData = (segmentId && SEGMENT_COVER_PHOTOS[segmentId]) || portadaPhoto;
  // Identidad a mostrar (header/portada/pie de impresión): la Familia real
  // en modo normal, o un nodo sintético con el nombre del segmento en modo
  // filtrado — así el resto del componente (BookPageContent, portada de
  // impresión) no necesita saber que existe un modo filtrado, ver arriba.
  const displayFamily: HierarchyNode = useMemo(() => {
    if (!isFiltered || !filterTitle) return family;
    return {
      ...family,
      name: filterTitle,
      itemCount: filterCategories!.reduce((sum, { category }) => sum + (category.products?.length ?? 0), 0),
    };
  }, [isFiltered, filterTitle, filterCategories, family]);
  const Icon = filterIcon ?? FAMILY_ICONS[displayFamily.id] ?? Package;
  const bookRef = useRef<{ pageFlip: () => PageFlipController } | null>(null);

  // react-pageflip tarda un momento en terminar de montar TODAS las páginas
  // (clona cada <Page> hijo, junta sus refs del DOM real, y recién ahí crea
  // la instancia interna de PageFlip — con revistas grandes como Alimentos,
  // 116 páginas, esto tarda unos cientos de ms). Dos síntomas distintos de
  // la MISMA causa, confirmados reproduciendo ambos reportes de Isaac:
  //   1. Cualquier `.flip()`/`.flipNext()` llamado ANTES de que termine
  //      (`bookRef.current?.pageFlip()` todavía `undefined`) se pierde en
  //      silencio — el <select> "Ir a categoría" cambiaba de valor mientras
  //      el libro se quedaba en la portada (fix-portada-duplicada-
  //      confirmado.md). Se arregla deshabilitando esos controles hasta
  //      `isBookReady`.
  //   2. `startPage` SÍ se aplica correctamente desde el arranque (no hace
  //      falta ningún `.flip()` imperativo para "Revista"/CTA) — pero
  //      mientras react-pageflip todavía está montando, el DOM real
  //      muestra la portada sin su estilo de "página dura" (density hard),
  //      así que se ve estirada ocupando las dos mitades del spread en vez
  //      de una sola página — confirmado con capturas frame-a-frame
  //      (fix-salto-automatico-race-condition.md). No es un problema de
  //      navegación (el índice de página ya es el correcto desde el
  //      inicio) sino de que le mostramos al usuario un frame de render a
  //      medio terminar. Se arregla tapando el libro con un loader hasta
  //      `isBookReady`, en vez de dejar ver ese estado intermedio.
  // `onInit` es el evento real de la librería que marca cuándo terminó.
  const [isBookReady, setIsBookReady] = useState(false);

  // Densidad de las hojas (tarjetas por hoja y nivel de compactación): se elige según el tamaño real de la hoja.
  // Al cambiar las tarjetas por hoja el libro tiene otras páginas: `anchor` recuerda dónde estaba el lector.
  const [layout, setLayout] = useState<BookLayout>(DEFAULT_LAYOUT);
  const [anchor, setAnchor] = useState<PageAnchor | null>(null);
  const perPage = layout.perPage;

  const photoOffset = useMemo(() => photoOffsetFor(displayFamily.id), [displayFamily.id]);
  const bookPages = useMemo(() => {
    const content = isFiltered
      ? buildFilteredBookPages(filterCategories!, allFamilies, photoOffset, perPage)
      : buildBookPages(family, photoOffset, perPage);
    // Con showCover la portada va sola y el resto en pares: si el total es par, la última página quedaría sola
    // con la hoja derecha vacía. Se cierra con una contraportada intencional para que todo spread esté completo.
    return content.length % 2 === 0 ? [...content, { kind: "back" } as BookPage] : content;
  }, [isFiltered, filterCategories, family, photoOffset, allFamilies, perPage]);
  const totalPages = bookPages.length;
  // Páginas de contenido (sin la contraportada): lo que cuenta el indicador "Página n de total".
  const contentPageCount = bookPages.filter((page) => page.kind !== "back").length;

  // Agrupado por sub-familia para el <select> "Ir a categoría" (ver
  // fix-dropdown-agrupado-y-apertura-pagina.md) — mismo criterio que
  // buildBookPages/ProductExplorer.CategoryPanel: solo sub-familias con al
  // menos una categoría con productos. En modo filtrado no hay sub-familia
  // real que agrupe (las categorías cruzan Familias distintas a propósito)
  // — se listan sueltas, sin optgroup.
  const categorySections = useMemo(() => {
    if (isFiltered) {
      return [
        {
          subFamily: displayFamily,
          categories: filterCategories!.map(({ category }) => category).filter((c) => (c.products?.length ?? 0) > 0),
        },
      ];
    }
    return family.children
      .map((subFamily) => ({
        subFamily,
        categories: subFamily.children.filter((category) => (category.products?.length ?? 0) > 0),
      }))
      .filter(({ categories }) => categories.length > 0);
  }, [isFiltered, filterCategories, displayFamily, family]);

  // Página donde empieza cada categoría (su primera parte), para el salto
  // directo del <select> — un índice llano, sin ajustes de paridad.
  const categoryPageIndex = useMemo(() => {
    const map = new Map<string, number>();
    bookPages.forEach((page, index) => {
      if (page.kind === "category" && page.part === 1 && !map.has(page.category.id)) {
        map.set(page.category.id, index);
      }
    });
    return map;
  }, [bookPages]);

  const initialPageIndex = !isFiltered && !channelChanged && initialCategoryId ? (categoryPageIndex.get(initialCategoryId) ?? 0) : 0;
  // Tras cambiar las tarjetas por hoja el libro se vuelve a montar en la página que contiene el mismo producto.
  const startPage = anchor ? findAnchor(bookPages, anchor, perPage) : initialPageIndex;
  const [currentPage, setCurrentPage] = useState(initialPageIndex);
  // Al cambiar las tarjetas por hoja la página actual se recalcula en el mismo render (estado derivado), no en un efecto.
  const [seenPerPage, setSeenPerPage] = useState(perPage);
  if (seenPerPage !== perPage) {
    setSeenPerPage(perPage);
    setCurrentPage(startPage);
  }

  // Precios (solo con sesión): de las páginas del spread actual y las vecinas (precarga de la siguiente).
  const { openProfile } = useAuth();
  // Piden precio los de A domicilio Y los de Retiro en tienda (cada canal con su precio); el "+" y el carrito
  // siguen siendo solo para domicilio.
  const visiblePriceIds = useMemo(() => collectVisiblePriceIds(bookPages, currentPage), [bookPages, currentPage]);
  const { status: pricesStatus, priceFor, pickupPriceFor } = useCatalogPrices(visiblePriceIds);

  // Canto de páginas apiladas a los costados del panel (ver
  // canto-paginas-flipbook.md): el ancho de cada franja representa la
  // proporción de páginas ya pasadas (izquierda) vs. restantes (derecha),
  // así que se recalcula en cada flip a partir del mismo `currentPage` que
  // ya alimenta el indicador "Página X de Y" del pie.
  const PAGE_STACK_MAX_WIDTH = 14;
  const leftStackWidth = Math.max(2, (currentPage / totalPages) * PAGE_STACK_MAX_WIDTH);
  const rightStackWidth = Math.max(2, ((totalPages - currentPage) / totalPages) * PAGE_STACK_MAX_WIDTH);

  // Tamaño real del libro en píxeles, recalculado con ResizeObserver contra
  // el espacio disponible (ancho Y alto) entre la barra superior y el pie —
  // así el libro SIEMPRE entra en la ventana sin recortarse ni necesitar
  // scroll. `autoSize` de react-pageflip no sirve acá porque deriva el alto
  // a partir del ancho (un truco de padding-bottom%), ignorando cuánta
  // altura de pantalla completa queda realmente libre.
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const [bookBox, setBookBox] = useState({ width: BOOK_WIDTH * 2, height: BOOK_HEIGHT });
  // Expuesto para el panel decorativo del "hueco" de spread simple (ver
  // catalogo-portada-espacio-y-mobile.md, más abajo) — en mobile/portrait
  // react-pageflip nunca reserva un spread de dos páginas (ver Render.ts,
  // calculateBoundsRect: pageWidth = blockWidth completo en PORTRAIT), así
  // que ese panel no aplica ahí.
  const [isPortraitBook, setIsPortraitBook] = useState(false);

  useEffect(() => {
    const el = bookAreaRef.current;
    if (!el) return;

    // Mismo umbral que react-pageflip usa internamente (usePortrait) para
    // decidir si muestra una página sola o el spread de dos — si no lo
    // igualamos acá, calculamos la caja con la proporción de dos páginas
    // aunque el libro adentro termine renderizando una sola.
    // El alto disponible es el del área (entre encabezado y pie). El ANCHO posible NO es el ancho actual del área:
    // el panel se acota al ancho del libro que ya se calculó (ver panelMaxWidth), y si el alto crece después (el
    // aviso de precios desaparece, la ventana se agranda) un libro limitado por ese ancho viejo no podría crecer
    // nunca. Se usa el ancho que el área tendría con el panel libre: lo que cabe en la ventana (con el tope del
    // panel) menos las flechas.
    const panel = el.closest<HTMLElement>(".catalog-panel");
    const backdrop = panel?.parentElement ?? null;

    function freeWidth() {
      const current = el!.clientWidth;
      if (!panel || !backdrop) return current;
      const style = getComputedStyle(backdrop);
      const room = backdrop.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const chrome = (el!.parentElement?.clientWidth ?? current) - current; // flechas prev/next y sus márgenes
      return Math.max(current, Math.min(room, PANEL_MAX_WIDTH) - chrome);
    }

    function fit() {
      const availableWidth = freeWidth();
      const availableHeight = el!.clientHeight;
      const isPortrait = availableWidth < BOOK_MIN_WIDTH * 2;
      setIsPortraitBook(isPortrait);
      const ratio = isPortrait ? BOOK_WIDTH / BOOK_HEIGHT : (BOOK_WIDTH * 2) / BOOK_HEIGHT;
      let width = availableWidth;
      let height = width / ratio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }
      // Sin cambios reales no se vuelve a renderizar (evita ciclos con el ancho del panel).
      setBookBox((prev) => (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5 ? prev : { width, height }));
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    if (backdrop) observer.observe(backdrop);
    return () => observer.disconnect();
  }, []);

  // Canto de páginas (ver fix-canto-paginas-medicion-real.md): `bookBox` de
  // arriba es lo que LE PEDIMOS a react-pageflip que renderice, pero el
  // elemento real (`.catalog-flipbook`, centrado por `.flipbook-container`
  // vía `justify-content: center`) puede terminar más angosto que eso —
  // react-pageflip aplica sus propios clamps de aspect-ratio/maxWidth
  // internamente, así que asumir que el borde del contenedor coincide con
  // el borde del libro deja un hueco invisible entre las franjas y las
  // hojas reales. Se mide con ResizeObserver sobre el elemento real (no
  // sobre `bookBox`, que es solo lo que pedimos) para que las franjas
  // (position:absolute dentro de `.catalog-shell`, ver CSS) se peguen al
  // libro tal como se ve en pantalla, no como lo calculamos.
  const shellRef = useRef<HTMLDivElement>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bookEdges, setBookEdges] = useState({ left: 0, right: 0, bookWidth: 0, chromeWidth: 0 });

  useLayoutEffect(() => {
    const containerEl = bookAreaRef.current;
    const shellEl = shellRef.current;
    const bookEl = containerEl?.querySelector<HTMLElement>(".catalog-flipbook");
    if (!containerEl || !shellEl || !bookEl) return;

    function measure() {
      const shellRect = shellEl!.getBoundingClientRect();
      const containerRect = containerEl!.getBoundingClientRect();
      const bookRect = bookEl!.getBoundingClientRect();
      return {
        left: bookRect.left - shellRect.left,
        right: shellRect.right - bookRect.right,
        // Ancho real del `.catalog-flipbook` (la caja de spread completa
        // que pide react-pageflip, no solo la página visible) — lo usa el
        // panel decorativo del hueco de spread simple más abajo, para
        // cubrir exactamente su mitad izquierda.
        bookWidth: bookRect.width,
        // Todo lo que NO es `.flipbook-container` dentro de `.catalog-
        // shell` (las flechas prev/next + sus márgenes) — medido, no
        // adivinado con constantes, para que el ajuste del ancho del panel
        // más abajo (ver catalogo-encuadre-y-zoom-divisoras.md, Problema 1)
        // le deje exactamente el espacio que las flechas necesitan.
        chromeWidth: shellRect.width - containerRect.width,
      };
    }

    // El asentamiento final del libro llega tarde y por causas variadas —
    // la animación de entrada del panel (`transform: scale`, que no
    // dispara ResizeObserver porque un transform no cambia el tamaño de
    // layout), la carga async de la foto de portada, o la propia
    // inicialización interna de react-pageflip (corre en un setTimeout,
    // ver page-flip/src/PageFlip.ts) — así que en vez de adivinar CUÁNTO
    // tarda cada una, se remide en un intervalo corto hasta que el
    // resultado se repite varias veces seguidas (o se llega a un tope de
    // seguridad), lo cual cubre cualquiera de esas causas por igual.
    // Nota: usa `setTimeout`, no `requestAnimationFrame` — rAF queda
    // completamente pausado si el documento está oculto/en background
    // (`document.hidden`), y este mismo componente puede montarse así en
    // ciertos entornos (confirmado en pruebas automatizadas); setTimeout
    // sigue disparando (aunque throttleado) en esas condiciones.
    let lastLeft: number | null = null;
    let lastRight: number | null = null;
    let stableReadings = 0;
    let tickCount = 0;

    function settleTick() {
      const next = measure();
      setBookEdges(next);
      stableReadings = next.left === lastLeft && next.right === lastRight ? stableReadings + 1 : 0;
      lastLeft = next.left;
      lastRight = next.right;
      tickCount++;
      if (stableReadings < 3 && tickCount < 60) {
        settleTimeoutRef.current = setTimeout(settleTick, 50);
      } else {
        settleTimeoutRef.current = null;
      }
    }

    function restartSettleLoop() {
      if (settleTimeoutRef.current != null) clearTimeout(settleTimeoutRef.current);
      lastLeft = null;
      lastRight = null;
      stableReadings = 0;
      tickCount = 0;
      settleTick();
    }

    restartSettleLoop();
    // Un resize real DESPUÉS de que el asentamiento inicial ya terminó
    // (ej. cambiar el tamaño de la ventana) reinicia el mismo mecanismo.
    const observer = new ResizeObserver(restartSettleLoop);
    observer.observe(bookEl);
    observer.observe(containerEl);
    observer.observe(shellEl);

    return () => {
      observer.disconnect();
      if (settleTimeoutRef.current != null) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  // Misma cuenta que page-flip usa internamente para armar sus spreads en
  // landscape (ver PageCollection.ts createSpread): con `showCover`, la
  // portada (índice 0) siempre queda sola; si el total de páginas es PAR,
  // la última también queda sola (impar restante después de sacar la
  // portada). Sirve para saber cuándo mostrar el panel decorativo del
  // hueco de spread simple (ver catalogo-portada-espacio-y-mobile.md, más
  // arriba en el JSX del libro).
  const isSingleSpread = currentPage === 0; // el total es siempre impar (contraportada): solo la portada va sola
  const showSpreadGutter = isSingleSpread && !isPortraitBook;
  // La portada (índice 0, "página 1" 1-indexed, impar) siempre se dibuja a
  // la DERECHA (misma convención de libro físico: impar = derecha, par =
  // izquierda) → el hueco va a la izquierda. La última página suelta con
  // total par (índice totalPages-1, siempre impar en 0-indexed = par
  // 1-indexed) cae del lado contrario — confirmado en vivo con una familia
  // de 26 páginas, la 26 se dibuja a la izquierda con el hueco a la
  // derecha, no al revés (ver comentario junto al JSX del panel).
  const gutterOnLeft = currentPage === 0;

  // Piso mínimo del ancho del panel = lo que el header necesita para NO
  // envolver a una segunda línea (ver catalogo-fix-regresion-barra-
  // espacio.md, Problema 1 — regresión del ajuste de ancho de abajo). El
  // header usa `flex-wrap`: si el panel se angosta más de la cuenta,
  // envuelve y se vuelve más ALTO, lo que le resta alto disponible al
  // libro DESPUÉS de que `bookBox` ya se había calculado con el alto
  // "de antes" — el libro terminaba más grande de lo que el hueco real
  // entre header y footer permitía, empujándose sobre la barra inferior.
  // No hay forma de medir "cuánto ancho necesita en una sola línea" una
  // vez que ya envolvió (scrollWidth de un contenedor envuelto da el
  // ancho de la línea más ancha, no el total sin envolver) — en vez de
  // adivinar un número fijo, se detecta el envolvido comparando el alto
  // actual contra el alto de una sola línea (medido la primera vez, con
  // el panel todavía sin `maxWidth` propio) y, si envolvió, se sube el
  // piso en pasos hasta que se desarma solo.
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerMinWidth, setHeaderMinWidth] = useState<number | null>(null);
  const singleLineHeaderHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    function checkWrap() {
      const rect = headerEl!.getBoundingClientRect();
      if (singleLineHeaderHeightRef.current == null) {
        singleLineHeaderHeightRef.current = rect.height;
        return;
      }
      if (rect.height > singleLineHeaderHeightRef.current + 4) {
        setHeaderMinWidth((w) => (w ?? rect.width) + 100);
      }
    }

    checkWrap();
    const observer = new ResizeObserver(checkWrap);
    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  // Ancho del panel del modal (ver catalogo-encuadre-y-zoom-divisoras.md,
  // Problema 1): `.catalog-panel` traía un `max-width: 1400px` fijo,
  // pensado para el ANCHO disponible — pero en la mayoría de pantallas
  // (más anchas que altas) el libro termina limitado por el ALTO del panel
  // (`height: 90vh`), no por su ancho, porque la proporción de página
  // (600×820, cercana a A4) es angosta. El resultado: el libro renderizado
  // (`bookBox.width`) queda bastante más chico que el ancho que
  // `.flipbook-container` tiene reservado, y ese ancho de sobra se ve como
  // espacio en blanco a los lados del panel completo (flechas incluidas).
  // En vez de adivinar un `max-width` fijo distinto (que solo sería
  // correcto para una altura de pantalla puntual), se mide en vivo cuánto
  // ocupan las flechas prev/next (`bookEdges.chromeWidth`, lo único del
  // panel que NO es el libro) y se le pide al panel exactamente ese ancho
  // más el del libro real — nunca menos de lo que el header necesita para
  // no envolver (`headerMinWidth`, ver arriba). Antes de la primera
  // medición (chromeWidth === 0) se deja sin `maxWidth` inline para que
  // rija el 1400px de CSS como valor inicial sensato.
  const measuredPanelWidth =
    bookEdges.chromeWidth > 0 ? bookEdges.chromeWidth + bookBox.width : null;
  const panelMaxWidth =
    measuredPanelWidth != null ? Math.max(640, headerMinWidth ?? 0, measuredPanelWidth) : undefined;

  // Densidad de las hojas según su tamaño REAL (no según umbrales de la ventana). Se monta, oculta, una hoja de
  // categoría "peor caso" (título de dos líneas; nombres y empaques largos; precios, etiquetas de los dos canales y
  // "Desde ₡X IVA incluido") del tamaño que tendrán las hojas reales, y se queda con el nivel más holgado en el que
  // su rejilla no desborda (ver lib/book-density.ts). Es el mismo componente que pinta las hojas reales, así que
  // lo que mide es lo que se verá.
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const probeRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const layoutRef = useRef({ layout, bookPages, currentPage });
  useLayoutEffect(() => {
    layoutRef.current = { layout, bookPages, currentPage };
  });

  useLayoutEffect(() => {
    const root = probeRef.current;
    if (!root) return;

    function measureLayout() {
      const size = pageSize(bookBox, isPortraitBook, { width: BOOK_WIDTH, height: BOOK_HEIGHT }, BOOK_MAX_PAGE_WIDTH);
      // Un poco menos que la hoja real: margen para el redondeo de la librería del libro.
      const width = Math.max(1, Math.floor(size.width) - 1);
      const height = Math.max(1, Math.floor(size.height) - 2);
      const fits = (candidate: BookLayout) => {
        const sheet = root!.querySelector<HTMLElement>(`[data-probe="${candidate.perPage}"]`);
        const grid = sheet?.querySelector<HTMLElement>("[data-probe-grid]");
        if (!sheet || !grid) return true;
        sheet.style.width = `${width}px`;
        sheet.style.height = `${height}px`;
        sheet.setAttribute("data-density", String(candidate.level));
        if (grid.scrollHeight > grid.clientHeight) return false;
        return Array.from(grid.children).every((card) => card.scrollHeight <= card.clientHeight && card.scrollWidth <= card.clientWidth);
      };
      const next = chooseBookLayout(fits);
      const current = layoutRef.current;
      if (sameLayout(current.layout, next)) return;
      if (next.perPage !== current.layout.perPage) {
        // Otras páginas: el libro se vuelve a montar (key) en la página que contiene el mismo producto.
        setAnchor(anchorOf(current.bookPages[current.currentPage], current.layout.perPage));
        setIsBookReady(false);
        setJumpTarget(null);
        setIsNavigating(false);
        setIsFading(false);
      }
      setLayout(next);
    }

    measureLayout();
    // Las fuentes del sitio cargan después: cambian el ancho de los textos y con él el alto de las tarjetas.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measureLayout();
    });
    return () => {
      cancelled = true;
    };
  }, [bookBox, isPortraitBook, locale]);

  // react-pageflip mide el área del libro en su propio evento `resize` de la ventana, ANTES de que React aplique el
  // tamaño nuevo: las hojas quedaban un paso atrás del libro (con otro tamaño que el de la hoja de prueba de
  // arriba). Tras aplicar cada tamaño nuevo se le pide que vuelva a medir.
  useLayoutEffect(() => {
    if (isBookReady) bookRef.current?.pageFlip()?.update();
  }, [bookBox.width, bookBox.height, isPortraitBook, isBookReady]);

  // Menú "Ir a categoría": categoría elegida (manda mientras su primera página siga a la vista), categoría
  // actual según las páginas VISIBLES del spread (la página derecha también cuenta: una categoría que empieza en
  // una página par queda a la derecha y antes se marcaba la anterior) y secciones para el menú.
  const pageCategory = useMemo(
    () => bookPages.map((page) => (page.kind === "category" ? page.category.id : null)),
    [bookPages]
  );
  const activeCategoryId = useMemo(
    () =>
      computeActiveCategoryId({
        currentPage,
        totalPages,
        portrait: isPortraitBook,
        pageCategory,
        categoryStart: categoryPageIndex,
        jumpTarget,
      }),
    [currentPage, totalPages, isPortraitBook, pageCategory, categoryPageIndex, jumpTarget]
  );
  const menuSections = useMemo<MenuSection[]>(
    () =>
      categorySections.map(({ subFamily, categories }) => ({
        id: subFamily.id,
        name: subFamily.name,
        categories: categories.map((category) => ({ id: category.id, name: category.name, itemCount: category.itemCount })),
      })),
    [categorySections]
  );

  const printPages = useMemo(
    () => (isFiltered ? buildFilteredPrintPages(filterCategories!) : buildPrintPages(family)),
    [isFiltered, filterCategories, family]
  );

  // Cierre con fade-out simétrico al de apertura (ver `.is-closing` en
  // product-catalog-overlay.css) — el desmontaje real (onClose) se retrasa
  // lo que dura esa animación en vez de cortar el panel de golpe.
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(onClose, 200);
  }, [isClosing, onClose]);
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Bloquea el scroll del sitio detrás del overlay mientras está abierto.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // El diálogo nativo de impresión (window.print) se cierra típicamente con
  // ESC — sin esta guarda, ese mismo ESC llega al listener de abajo y cierra
  // TAMBIÉN el catálogo completo detrás. `afterprint` se dispara tanto al
  // imprimir como al cancelar, así que alcanza para levantar la guarda.
  const isPrintingRef = useRef(false);
  useEffect(() => {
    function handleAfterPrint() {
      isPrintingRef.current = false;
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleDownloadPdf = () => {
    isPrintingRef.current = true;
    window.print();
    setTimeout(() => {
      isPrintingRef.current = false;
    }, 60_000);
  };

  // Glosario de abreviaturas de empaque (ver fix-truncamiento-y-glosario.md)
  // — accesible desde el header en cualquier página del catálogo, no solo
  // desde la portada.
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  // Menú "Ir a categoría" (ver mejora-dropdown-categoria.md) — reemplaza el
  // <select> nativo (cuya lista desplegada la dibuja el sistema operativo,
  // fuera del alcance de cualquier CSS) por un popover propio con el mismo
  // control total de estilo que ya tiene el del Glosario. Mutuamente
  // excluyente con el glosario (abrir uno cierra el otro) para no apilar dos
  // popovers a la vez en el mismo header angosto.
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Detalle ampliado de un producto (ver catalogo-detalle-producto.md) —
  // feature nuevo, independiente del flipbook: no toca `currentPage` al
  // abrir/cerrar, así que cerrar el detalle deja al usuario exactamente en
  // la misma página/categoría de antes. `selectedProduct` null = cerrado.
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  // "pickup" = el detalle se abrió desde el "+" de la tarjeta y empieza en el paso de retiro.
  const [selectedStep, setSelectedStep] = useState<"pickup" | null>(null);
  const openProduct = useCallback((product: ProductSummary, step?: "pickup" | null) => {
    setSelectedStep(step === "pickup" ? "pickup" : null);
    setSelectedProduct(product);
  }, [setSelectedProduct, setSelectedStep]);

  // Lo que cambia con el tiempo y necesitan las páginas (precios, abrir el detalle de un producto): por contexto.
  const liveBook = useMemo(
    () => ({ priceFor, pickupPriceFor, onProductClick: openProduct, currentPage }),
    [priceFor, pickupPriceFor, openProduct, currentPage]
  );

  // Hijos del libro con identidad ESTABLE (ver el comentario junto al <HTMLFlipBook>).
  const bookChildren = useMemo(
    () =>
      bookPages.map((page, index) => (
        <Page key={index}>
          <BookPageContent page={page} pageIndex={index} family={displayFamily} allFamilies={allFamiliesProp} icon={Icon} coverPhoto={coverPhoto} />
        </Page>
      )),
    [bookPages, displayFamily, allFamiliesProp, Icon, coverPhoto]
  );

  // Navegación del menú "Ir a categoría" (ver lib/book-navigator): UNA sola navegación a la vez. Si el libro está
  // animando se espera a que vuelva a reposo; un spread de distancia se anima, más lejos se va directo con
  // turnToPage tras un fundido breve (sin fundido con prefers-reduced-motion). Mientras navega se ignoran las
  // flechas, la rueda y los clics en la esquina.
  const viewRef = useRef({ currentPage, totalPages, portrait: isPortraitBook });
  useEffect(() => {
    viewRef.current = { currentPage, totalPages, portrait: isPortraitBook };
  });
  const fadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = fadeTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  // Se crea al primer uso (en un evento o efecto, nunca durante el render) porque lee refs del libro.
  const navigatorRef = useRef<ReturnType<typeof createBookNavigator> | null>(null);
  const getNavigator = useCallback(() => {
    if (!navigatorRef.current) {
      navigatorRef.current = createBookNavigator({
        plan: planJump,
        getBook: () => (bookRef.current?.pageFlip() as unknown as BookLike | undefined) ?? null,
        getView: () => viewRef.current,
        reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        turn: (_page, apply) => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            apply();
            return;
          }
          setIsFading(true);
          fadeTimersRef.current.push(
            setTimeout(() => {
              apply();
              fadeTimersRef.current.push(setTimeout(() => setIsFading(false), 40));
            }, 130)
          );
        },
        onBusyChange: setIsNavigating,
      });
    }
    return navigatorRef.current;
  }, []);

  // Cambiar de canal rearma el libro (otras páginas): se vuelve a la portada y se vuelve a inicializar el
  // libro (key en el <HTMLFlipBook>), sin dejar un salto o una navegación a medias del menú de categorías.
  const handleChannelChange = (next: CatalogChannel) => {
    if (next === channel) return;
    setChannel(next);
    setChannelChanged(true);
    setAnchor(null);
    setCurrentPage(0);
    setIsBookReady(false);
    setJumpTarget(null);
    setIsNavigating(false);
    setIsFading(false);
  };

  // Rueda del mouse pasa de página (ver catalogo-scroll-no-funciona.md,
  // parte 2): react-pageflip solo entiende click/arrastre/swipe táctil —
  // nunca `wheel` — así que sobre el libro, scrollear con el mouse no hacía
  // NADA (se sentía "roto" en desktop, donde es el gesto más natural para
  // pasar de página). `closest(".overflow-y-auto")` deja pasar el scroll
  // SIN pasar de página mientras ese contenedor interno (la grilla de
  // productos, o la lista de familias de "Nuestro Portafolio") todavía
  // tenga a dónde scrollear en esa dirección — recién al llegar a su tope
  // un scroll más pasa la página, como se esperaría de una revista real.
  // Cooldown de 650ms (un poco menos que `flippingTime={700}` del libro,
  // ver más abajo) evita que una sola rueda de mouse/trackpad (que dispara
  // muchos eventos `wheel` seguidos) dispare varios flips de un tirón;
  // `Math.abs(deltaY) < 12` ignora el ruido de eventos wheel minúsculos que
  // algunos trackpads emiten en reposo.
  const lastWheelFlipRef = useRef(0);
  const handleBookWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!isBookReady || selectedProduct || isCategoryMenuOpen || isGlossaryOpen || getNavigator().isBusy()) return;
      const scrollable = (e.target as HTMLElement).closest?.(".overflow-y-auto") as HTMLElement | null;
      if (scrollable) {
        const scrollingDown = e.deltaY > 0;
        const atTop = scrollable.scrollTop <= 0;
        const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
        if ((scrollingDown && !atBottom) || (!scrollingDown && !atTop)) return;
      }
      if (Math.abs(e.deltaY) < 12) return;
      const now = Date.now();
      if (now - lastWheelFlipRef.current < 650) return;
      lastWheelFlipRef.current = now;
      if (e.deltaY > 0) bookRef.current?.pageFlip()?.flipNext();
      else bookRef.current?.pageFlip()?.flipPrev();
    },
    [isBookReady, selectedProduct, isCategoryMenuOpen, isGlossaryOpen, getNavigator]
  );

  // ESC cierra el detalle de producto si está abierto (máxima prioridad —
  // está ENCIMA de todo lo demás); si no, el glosario si está abierto; si
  // no, cierra el catálogo. Flechas del teclado hojean el libro de verdad
  // (solo cuando no hay detalle de producto abierto encima, para no hojear
  // "a ciegas" detrás del lightbox).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isPrintingRef.current) return;
        if (selectedProduct) {
          setSelectedProduct(null);
          return;
        }
        if (isGlossaryOpen) {
          setIsGlossaryOpen(false);
          return;
        }
        if (isCategoryMenuOpen) {
          setIsCategoryMenuOpen(false);
          return;
        }
        handleClose();
      } else if (e.key === "ArrowRight") {
        if (isBookReady && !selectedProduct && !isCategoryMenuOpen && !isGlossaryOpen && !getNavigator().isBusy()) bookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === "ArrowLeft") {
        if (isBookReady && !selectedProduct && !isCategoryMenuOpen && !isGlossaryOpen && !getNavigator().isBusy()) bookRef.current?.pageFlip()?.flipPrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isBookReady, isGlossaryOpen, isCategoryMenuOpen, selectedProduct, getNavigator]);

  // Elegir una categoría: queda a la vista su PRIMERA página; la categoría actual se sincroniza con la página
  // real que muestra el libro (onFlip actualiza currentPage al llegar).
  const handleSelectCategory = (categoryId: string) => {
    const target = categoryPageIndex.get(categoryId);
    if (target === undefined) return;
    setJumpTarget(categoryId);
    getNavigator().go(target);
  };

  return createPortal(
    <>
      <div
        className={`catalog-backdrop${isClosing ? " is-closing" : ""}`}
        data-lenis-prevent
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className={`catalog-panel${isClosing ? " is-closing" : ""}`}
          data-density={layout.level}
          style={{ background: PAGE_BG, ...(panelMaxWidth != null ? { maxWidth: panelMaxWidth } : {}) }}
        >
          {/* Barra superior: identidad de familia + ir a categoría + PDF +
              cerrar. `z-20` (no solo `relative`, ver mejora-dropdown-
              categoria.md): sin un z-index EXPLÍCITO acá, este header no
              forma su propio contexto de apilamiento — sus popovers
              absolutos (el menú de categoría, el glosario) terminaban
              compitiendo cada uno por su cuenta contra las páginas del
              libro de abajo (que react-pageflip sí les pone z-index propio
              mientras pasan/asientan), así que un clic sobre una opción del
              menú a veces le llegaba al libro de atrás en vez de al popover
              (confirmado: el libro avanzaba una página en vez de saltar a
              la categoría elegida). Con z-index explícito en el header, TODO
              lo que cuelga de él (incluida esta barra y sus popovers) se
              compara como un solo bloque contra `.catalog-shell` — gana
              siempre, sin importar el z-index interno de las páginas. */}
          <div
            ref={headerRef}
            className="catalog-header relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8"
            style={{ borderBottom: `1px solid ${RULE}` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: CHIP_BG }}>
                <Icon className="h-5 w-5" strokeWidth={1.7} style={{ color: ACCENT }} aria-hidden />
              </span>
              <div>
                <p className="font-display" style={{ color: INK, fontSize: "19px", fontWeight: 600, lineHeight: 1.1 }}>
                  {displayFamily.name}
                </p>
                {/* Los chips viven en el encabezado (no en una barra propia): una barra aparte le quitaba ~40 px
                    de alto a la hoja del libro y con ellos la rejilla 3×3 ya no cabía. */}
                <div className="mt-1.5">
                  <ChannelFilterBar inline value={channel} counts={channelCounts} onChange={handleChannelChange} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CategoryMenu
                sections={menuSections}
                activeCategoryId={activeCategoryId}
                open={isCategoryMenuOpen}
                onOpenChange={(open) => {
                  setIsCategoryMenuOpen(open);
                  if (open) setIsGlossaryOpen(false);
                }}
                onSelect={handleSelectCategory}
                disabled={!isBookReady}
                labels={{
                  button: t("catalog.jumpToCategoryLabel"),
                  title: t("catalog.categoryMenuTitle"),
                  searchPlaceholder: t("catalog.categorySearchPlaceholder"),
                  searchEmpty: t("catalog.categorySearchEmpty"),
                  current: t("catalog.categoryCurrent"),
                  products: (count) => t("productsCount", { count }),
                }}
              />

              {/* Glosario de abreviaturas de empaque (ver
                  fix-truncamiento-y-glosario.md) — vive en el header, no en
                  una página del libro, para que sea accesible desde
                  CUALQUIER punto del catálogo. Backdrop invisible a pantalla
                  completa para cerrar con click afuera, además de ESC (ver
                  el handleKeyDown de arriba) y la X propia del popover.
                  Fragment, no un <div> con `relative`: el ancla real es
                  `.catalog-header` (ver `relative` agregado ahí arriba) —
                  ese sí siempre coincide con el ancho completo del panel,
                  a diferencia de esta fila de controles, que en mobile
                  puede quedar envuelta a una segunda línea más angosta que
                  el panel (ver catalogo-contenido-cortado-y-mobile.md,
                  Problema 2) y antes hacía que `right-0` anclara al borde
                  derecho de ESA fila corta, no al del panel — el popover
                  (340px fijos) se salía por la izquierda de la pantalla en
                  mobile en vez de quedar dentro. */}
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsGlossaryOpen((current) => !current);
                    setIsCategoryMenuOpen(false);
                  }}
                  aria-label={t("catalog.glossaryButtonLabel")}
                  title={t("catalog.glossaryButtonLabel")}
                  aria-expanded={isGlossaryOpen}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] font-semibold transition hover:shadow-[0_1px_6px_rgba(16,37,63,0.08)]"
                  style={{ borderColor: RULE, background: "#F7FAFD", color: ACCENT }}
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  <span className="hidden xl:inline">{t("catalog.glossaryButtonLabel")}</span>
                </button>

                {isGlossaryOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsGlossaryOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="dialog"
                      aria-label={t("catalog.glossaryTitle")}
                      data-lenis-prevent
                      className="absolute right-0 top-[calc(100%+10px)] z-40 max-h-[70dvh] w-[min(340px,90vw)] overflow-y-auto rounded-2xl border bg-white p-4 text-left shadow-[0_16px_44px_rgba(16,37,63,0.18)]"
                      style={{ borderColor: RULE }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-[15px] font-semibold" style={{ color: INK }}>
                          {t("catalog.glossaryTitle")}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsGlossaryOpen(false)}
                          aria-label={t("catalog.close")}
                          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 transition hover:opacity-60"
                          style={{ color: MUTED }}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </button>
                      </div>
                      <span aria-hidden className="mt-2 block h-[2px] w-[32px] rounded-full bg-corp-yellow" />
                      <div className="mt-3 space-y-3">
                        {glossaryGroups.map((group) => (
                          <div key={group.title}>
                            <p
                              className="mb-1 text-[10px] font-bold uppercase"
                              style={{ color: MUTED, letterSpacing: "0.08em" }}
                            >
                              {group.title}
                            </p>
                            <ul className="space-y-1.5">
                              {group.entries.map((entry) => (
                                <li key={entry.abbr} className="flex items-baseline gap-2 text-[13.5px] leading-snug">
                                  <span className="shrink-0 font-semibold" style={{ color: ACCENT }}>
                                    {entry.abbr}
                                  </span>
                                  <span style={{ color: "#3E4C5C" }}>{entry.meaning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>

              {/* Acción primaria del header — antes un link subrayado que se
                  perdía entre el resto de controles; ahora un botón sólido
                  (mismo azul de marca) para que se lea como LA acción que
                  hace algo, distinta de los chips de navegación/info de al
                  lado (ver mejora-header-catalogo.md). */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-white shadow-[0_2px_10px_rgba(7,95,216,0.28)] transition hover:brightness-110 active:brightness-95"
                style={{ background: `linear-gradient(135deg, ${ACCENT_BRIGHT}, ${ACCENT})` }}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                <span className="hidden xl:inline">{t("catalog.downloadPdf")}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label={t("catalog.backToSite")}
                title={t("catalog.backToSite")}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] font-semibold transition hover:opacity-70"
                style={{ borderColor: RULE, color: INK }}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                <span className="hidden xl:inline">{t("catalog.backToSite")}</span>
              </button>
            </div>
          </div>

          {/* Aviso ÚNICO de precios (no uno por producto): sin sesión invita a ingresar; con la cuenta sin lista
              de precios explica y enlaza a WhatsApp; si el servicio de precios falla lo dice una sola vez. */}
          {pricesStatus !== "ready" && (
            <div
              role="status"
              className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-1.5 text-center text-[12px] font-medium sm:px-8"
              style={{ background: CHIP_BG, color: INK, borderBottom: `1px solid ${RULE}` }}
            >
              {pricesStatus === "no-session" && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    openProfile();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#075FD8]"
                  style={{ color: ACCENT }}
                >
                  <Lock className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                  {t("catalog.loginForPrices")}
                </button>
              )}
              {pricesStatus === "price-list-missing" && (
                <>
                  <span>{t("catalog.priceListMissingNotice")}</span>
                  <a
                    href={site.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8]"
                    style={{ color: ACCENT }}
                  >
                    {t("catalog.priceListMissingCta")}
                  </a>
                </>
              )}
              {pricesStatus === "unavailable" && <span>{t("catalog.pricesUnavailable")}</span>}
            </div>
          )}

          {/* Área del libro: canto de páginas (.page-stack) a los costados,
              SOLO alrededor de esto — no del header/footer (ver
              fix-canto-paginas-scope.md). Las franjas se posicionan con
              position:absolute usando `bookEdges` (medido contra el
              elemento REAL que renderiza react-pageflip, no contra
              `.flipbook-container` — ver fix-canto-paginas-medicion-real.md),
              así quedan pegadas al canto real de las hojas sin importar
              cuánto espacio de centrado quede alrededor. Las flechas quedan
              afuera de las franjas (ver fix-canto-paginas-flotando.md).
              El libro en sí: tamaño en píxeles calculado a mano (bookBox)
              contra el espacio disponible entre la barra superior y el pie —
              así siempre entra completo en la pantalla, sin recortarse.
              `showPageCorners={false}` es lo que apaga el "peek"/doblez al
              simple hover (page-flip solo dispara ese efecto cuando ese flag
              está en true y el usuario NO está arrastrando — ver PageFlip.ts
              `userMove`); clickear una flecha o arrastrar la esquina siguen
              pasando la página con el efecto de libro real (drawShadow,
              flippingTime) como antes. */}
          <div className="catalog-shell" ref={shellRef} onWheel={handleBookWheel}>
            <DensityProbe icon={Icon} probeRef={probeRef} />
            {/* Ocultas debajo de `sm` (ver mobile-fixes-ronda2.md, punto 2):
                cada flecha son 40px + márgenes (~52px por lado, ~104px las
                dos) — en un panel mobile angosto (~370px) eso le comía
                ~28% del ancho real a `.flipbook-container` (confirmado
                midiendo en vivo: 268px de libro contra 372px de panel). Como
                el libro mantiene proporción de página fija, ese ancho
                reducido también le tope aba el alto muy por debajo del
                espacio vertical disponible — la causa real de la "tarjeta
                chica flotando con espacio vacío" reportada. El swipe táctil
                (`mobileScrollSupport`/`swipeDistance` en el <HTMLFlipBook>
                de abajo) ya cubre la navegación en mobile sin estas flechas;
                el <select> "Ir a categoría" del header también sigue
                funcionando. `bookEdges.chromeWidth` (usado para
                `panelMaxWidth` más arriba) se remide solo vía el mismo
                ResizeObserver de siempre al ocultarlas, sin tocar nada más. */}
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
              disabled={!isBookReady || currentPage <= 0}
              aria-label={t("catalog.prevPage")}
              className="ml-4 mr-5 hidden h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70 sm:flex"
              style={{ borderColor: RULE, color: ACCENT }}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>

            <div
              className="page-stack page-stack-left"
              style={{ left: bookEdges.left - leftStackWidth, width: leftStackWidth }}
              aria-hidden
            />

            {/* Panel decorativo del hueco de spread simple (ver
                catalogo-portada-espacio-y-mobile.md, Problema 1): react-
                pageflip SIEMPRE reserva el ancho de un spread de DOS
                páginas en modo landscape (Render.ts, calculateBoundsRect:
                `width: pageWidth * 2` sin importar cuántas páginas tenga
                el spread actual) — con `showCover` la portada (y, si el
                total de páginas es par, también la última) se dibuja SOLA,
                dejando la otra mitad de esa caja completamente vacía; no
                es un bug de nuestro tamaño de imagen/contenedor, es el
                comportamiento propio de la librería. En vez de intentar
                angostar la caja que le pedimos a react-pageflip (arriesga
                cruzar su propio umbral interno de `usePortrait` y cambiar
                el tipo de animación de vuelta de página a mitad de
                sesión), se cubre ese hueco con un panel a propósito —
                mismo navy que el bloque de sellos de la portada (INK) —
                para que se lea como el interior de la tapa del libro, no
                como espacio en blanco sin llenar.
                QUÉ LADO: no es siempre el mismo — depende de la paridad
                del índice de la página suelta (misma convención que un
                libro físico: página 1-indexed impar = derecha, par =
                izquierda). La portada (índice 0, 1-indexed "página 1",
                impar) siempre cae a la DERECHA → el hueco va a la
                izquierda (confirmado visualmente). La última página suelta
                cuando el total es par (índice = totalPages-1, siempre
                impar en 0-indexed = 1-indexed par) cae a la IZQUIERDA →
                el hueco va a la derecha (confirmado con Cuidado Personal,
                26 páginas: la página 26 se dibuja a la izquierda con el
                hueco en blanco a la derecha, no al revés). */}
            {showSpreadGutter && (
              <div
                aria-hidden
                className="absolute overflow-hidden"
                style={
                  gutterOnLeft
                    ? {
                        left: bookEdges.left,
                        top: 0,
                        bottom: 0,
                        width: bookEdges.bookWidth / 2,
                        background: INK,
                        borderRadius: "16px 0 0 16px",
                      }
                    : {
                        right: bookEdges.right,
                        top: 0,
                        bottom: 0,
                        width: bookEdges.bookWidth / 2,
                        background: INK,
                        borderRadius: "0 16px 16px 0",
                      }
                }
              >
                <SpreadGutterPattern flip={!gutterOnLeft} />
              </div>
            )}

            {/* Este div (no los botones/franjas de al lado) es lo que mide el
                ResizeObserver: su tamaño es el espacio real disponible para el
                libro, ya descontando flechas y cantos de página. `relative`
                es el ancla del loader de abajo. */}
            <div
              ref={bookAreaRef}
              className="flipbook-container relative flex h-full min-w-0 flex-1 items-center justify-center"
              style={{
                pointerEvents: isNavigating ? "none" : undefined,
                opacity: isFading ? 0 : 1,
                transition: "opacity 130ms ease",
              }}
            >
              {/* IMPORTANTE (libro que se descuadraba al saltar de categoría): react-pageflip llama `updateFromHtml`
                  — destruye y reconstruye TODAS las páginas — cada vez que cambia la identidad de `children`,
                  o sea en cada render de este componente si los hijos se crean en línea (cerrar el menú, llegar
                  los precios, mover el foco...). En medio de una vuelta de página eso reinicia el libro y la
                  animación termina en otro spread. Por eso `bookChildren` está memoizado: misma identidad en
                  todos los renders, solo cambia si cambian las páginas. NO usar `renderOnlyPageLengthChange`:
                  en cada render el primer efecto de la librería vacía su lista de nodos (`childRef`) y con esa
                  opción no vuelve a llenarla, así que si un render del padre coincide con el montaje el libro
                  nunca se inicializa (spinner eterno y páginas sin pintar). Lo que cambia con el tiempo
                  (precios, clic en un producto) llega a las páginas por contexto, no por props. */}
              <BookLiveContext.Provider value={liveBook}>
              <HTMLFlipBook
                key={`${channel}-${perPage}`}
                ref={bookRef}
                width={BOOK_WIDTH}
                height={BOOK_HEIGHT}
                size="stretch"
                minWidth={BOOK_MIN_WIDTH}
                maxWidth={860}
                minHeight={300}
                maxHeight={1160}
                startPage={startPage}
                drawShadow
                flippingTime={700}
                usePortrait
                startZIndex={10}
                autoSize={false}
                maxShadowOpacity={0.7}
                showCover
                mobileScrollSupport
                clickEventForward
                useMouseEvents
                swipeDistance={30}
                showPageCorners={false}
                disableFlipByClick={false}
                className="catalog-flipbook"
                style={{ width: bookBox.width, height: bookBox.height }}
                onFlip={(e) => setCurrentPage(e.data as number)}
                onInit={() => setIsBookReady(true)}
                onChangeState={(e) => {
                  if (e.data === "read") getNavigator().onIdle();
                }}
              >
                {bookChildren}
              </HTMLFlipBook>
              </BookLiveContext.Provider>

              {/* Mientras react-pageflip termina de montar, el DOM real
                  muestra la portada sin su estilo de página dura (se ve
                  estirada ocupando las dos mitades del spread) — no es un
                  problema de a qué página apuntamos (`startPage` ya es el
                  correcto desde el arranque), es que ese frame intermedio
                  de render no está listo para mostrarse. Taparlo con este
                  loader hasta `isBookReady` en vez de dejarlo ver (ver
                  fix-salto-automatico-race-condition.md). */}
              {!isBookReady && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center"
                  style={{ background: PAGE_BG }}
                  aria-hidden
                >
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-2"
                    style={{ borderColor: RULE, borderTopColor: ACCENT }}
                  />
                </div>
              )}
            </div>

            <div
              className="page-stack page-stack-right"
              style={{ right: bookEdges.right - rightStackWidth, width: rightStackWidth }}
              aria-hidden
            />

            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip()?.flipNext()}
              disabled={!isBookReady || currentPage >= totalPages - 1}
              aria-label={t("catalog.nextPage")}
              className="ml-5 mr-4 hidden h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70 sm:flex"
              style={{ borderColor: RULE, color: ACCENT }}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          {/* Pie único de la revista (no por página — así nunca puede duplicarse
              entre dos páginas visibles a la vez, que era el problema en el
              diseño anterior con spreads de a dos). */}
          <div
            className="catalog-footer flex items-center justify-between gap-3 px-5 py-2 sm:px-8"
            style={{ background: INK }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Image src={mercasaLogo} alt="Mercasa" className="h-3.5 w-auto shrink-0 brightness-0 invert" />
              <span className="hidden truncate text-[10px] font-medium sm:inline" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("catalog.printFooterTagline")}
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
              {(() => {
                // Páginas visibles de contenido (sin la contraportada): "Página 5 de 26" o "Páginas 5–6 de 26".
                const shown = visiblePageIndexes(currentPage, totalPages, isPortraitBook).filter((i) => i < contentPageCount);
                if (shown.length > 1) return t("catalog.bookPageRangeIndicator", { from: shown[0] + 1, to: shown[shown.length - 1] + 1, total: contentPageCount });
                return t("catalog.bookPageIndicator", { current: (shown[0] ?? contentPageCount - 1) + 1, total: contentPageCount });
              })()}
            </span>
            <span className="hidden shrink-0 text-[10px] font-medium sm:inline" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("catalog.printFooterLocation")}
            </span>
          </div>
        </div>
      </div>

      {/* Hoja de impresión (oculta en pantalla, ver product-catalog-print.css) —
          vive fuera de .catalog-panel: ese contenedor tiene overflow:hidden +
          max-height:90vh para el look de panel flotante, lo que recortaría
          esta hoja al imprimir (position:absolute; inset:0 sobre TODO el
          documento, ver product-catalog-print.css). */}
      <div id="catalog-print-sheet" aria-hidden>
        <section className="cp-page cp-cover">
          <div>
            <Image src={mercasaLogo} alt="Mercasa" className="cp-cover-logo" />
            <Icon className="cp-cover-icon" size={36} strokeWidth={1.4} />
            <div className="cp-eyebrow">{t("catalog.printEyebrow")}</div>
            <h1>
              {t("catalog.printCoverTitle")}
              <br />
              {displayFamily.name}
            </h1>
            <span aria-hidden className="cp-cover-rule" />
            <p className="cp-cover-description">{t("catalog.sectionDescription")}</p>
          </div>
          <div className="cp-cover-footer">
            <span>MERCASA · 2026</span>
            <span>{t("productsCountApprox", { count: formatProductCount(displayFamily.itemCount) })}</span>
          </div>
        </section>

        {printPages.map((page, index) => (
          <section className="cp-page cp-content-page" key={index}>
            <header className="cp-page-header">
              <span>MERCASA</span>
              <span className="cp-page-number">{t("catalog.printPageLabel", { page: index + 2 })}</span>
            </header>

            <div className="cp-category-header">
              <span className="cp-category-label">{displayFamily.name}</span>
              <h2>{page.categoryName}</h2>
              <span className="cp-rule" />
            </div>

            <div className="cp-products">
              {page.products.map((product) => (
                <div className="cp-product-card" key={product.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- hoja de impresión: no puede depender del optimizador de next/image */}
                  <img className="cp-product-image" src={`/api/product-images/${product.id}?size=s`} alt="" />
                  <p className="cp-product-name">{product.name}</p>
                  {product.packSize && <p className="cp-product-pack">{product.packSize}</p>}
                </div>
              ))}
            </div>

            <footer className="cp-footer">
              <span>
                <strong>MERCASA</strong> · {t("catalog.printFooterTagline")}
              </span>
              <span>{t("catalog.printFooterLocation")}</span>
            </footer>
          </section>
        ))}
      </div>

      {/* Detalle ampliado de producto (ver catalogo-detalle-producto.md) —
          ENCIMA del catálogo, no lo reemplaza. z-[70] queda por encima del
          panel del catálogo y del popover del glosario (ambos con z más
          bajo dentro de este mismo portal), así siempre se ve al frente sin
          importar desde qué página del libro se haya abierto. */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          icon={Icon}
          price={hasDelivery(selectedProduct) ? priceFor(selectedProduct.id) : { kind: "hidden" }}
          startAtPickup={selectedStep === "pickup"}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>,
    document.body
  );
}

function FamilyStripItem({
  entry,
  isActive,
  showDivider,
}: {
  entry: HierarchyNode;
  isActive: boolean;
  showDivider: boolean;
}) {
  const EntryIcon = FAMILY_ICONS[entry.id] ?? Package;
  return (
    // min-w-0: sin esto un flex-1 nunca se achica más allá del contenido
    // (min-width:auto por default) — "Electrónica" como palabra única no
    // podía envolver y se desbordaba/cortaba en páginas angostas (mobile
    // portrait, ver catalogo-contenido-cortado-y-mobile.md, Problema 2).
    // break-words fuerza el corte si aun así no entra en una línea.
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5 break-words px-1 text-center"
      style={showDivider ? { borderLeft: "1px solid rgba(255,255,255,0.16)" } : undefined}
    >
      <EntryIcon
        className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
        strokeWidth={1.7}
        style={{ color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}
        aria-hidden
      />
      <span
        className="text-[9px] font-semibold leading-tight sm:text-[10.5px]"
        style={{ color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}
      >
        {entry.name}
      </span>
    </div>
  );
}

// Datos que cambian con el tiempo y que las páginas del libro necesitan (ver el comentario sobre
// renderOnlyPageLengthChange junto al <HTMLFlipBook>): llegan por contexto para no re-crear las páginas.
interface BookLive {
  priceFor: (itemId: string) => PriceView;
  pickupPriceFor: (itemId: string) => PickupPriceView;
  onProductClick: (product: ProductSummary, step?: "pickup" | null) => void;
  // Página visible del libro: decide qué páginas piden sus fotos (ver lib/image-window.ts).
  currentPage: number;
}
const BookLiveContext = createContext<BookLive>({ priceFor: () => ({ kind: "hidden" }), pickupPriceFor: () => ({ kind: "hidden" }), onProductClick: () => {}, currentPage: 0 });

function BookPageContent({
  page,
  pageIndex,
  family,
  allFamilies,
  icon: Icon,
  coverPhoto,
}: {
  page: BookPage;
  /** Posición de la página en el libro (decide cuándo pide sus fotos). */
  pageIndex: number;
  family: HierarchyNode;
  allFamilies: HierarchyNode[];
  icon: LucideIcon;
  /** Portada genérica o por segmento (ver catalogo-portada-por-segmento.md
   * y SEGMENT_COVER_PHOTOS arriba) — decidida en ProductCatalogModal, este
   * componente solo la pinta. */
  coverPhoto: string | StaticImageData;
}) {
  const t = useTranslations("Products");
  const { priceFor, pickupPriceFor, onProductClick, currentPage } = useContext(BookLiveContext);
  const loadImages = shouldLoadPageImages(pageIndex, currentPage);
  // Portafolio (a diferencia de la portada, arriba) sigue fijo para todas
  // las familias (ver reemplazar-imagenes-portada-indice.md) — no rota ni
  // depende del segmento.
  const portfolioPhoto = indicePhoto;

  if (page.kind === "back") {
    // Contraportada intencional (cierra el libro con spreads completos).
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: INK }}>
        <Image src={mercasaLogo} alt="Mercasa" className="h-8 w-auto brightness-0 invert" />
        <span aria-hidden className="block h-[3px] w-[42px] rounded-full bg-corp-yellow" />
        <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
          {t("catalog.printFooterTagline")}
        </p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("catalog.printFooterLocation")}
        </p>
      </div>
    );
  }

  if (page.kind === "cover") {
    return (
      <div className="flex h-full flex-col" style={{ padding: "clamp(12px, 5cqh, 36px)" }}>
        <div className="flex items-center justify-between">
          <Image src={mercasaLogo} alt="Mercasa" className="h-6 w-auto sm:h-7" priority />
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: CHIP_BG }}>
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: ACCENT }} aria-hidden />
            <span className="text-[10.5px] font-bold" style={{ color: ACCENT }}>
              {family.name}
            </span>
          </span>
        </div>

        {/* Alto en `cqh` (% del alto REAL de `.page-content`, ver
            container-type:size en product-catalog-flipbook-realism.css) en
            vez de px fijo — así se achica junto con `bookBox.height` en
            pantallas de poca altura en vez de desbordar la página (ver
            catalogo-contenido-cortado-y-mobile.md, Problema 1). */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ marginTop: "clamp(6px, 3cqh, 24px)", height: "clamp(84px, 27cqh, 240px)" }}
        >
          <Image src={coverPhoto} alt="" fill priority className="object-cover" sizes="600px" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(8,43,92,0) 55%, rgba(8,43,92,0.55) 100%)" }}
          />
        </div>

        <div style={{ marginTop: "clamp(10px, 3.4cqh, 28px)" }}>
          {/* `vw` (ancho de VENTANA) en vez de `cqh` (alto REAL de la
              página) era el culpable real de que la portada siguiera
              cortándose después del primer fix — en una ventana ancha pero
              de poca altura, 5vw se queda pegado cerca del techo (40px, 2
              líneas ≈ 84px de alto) sin importar cuán chica sea la página
              (ver catalogo-portada-sigue-cortada.md). Con `cqh` el título
              se achica junto con el resto cuando la página es baja. */}
          <h1
            className="font-display"
            style={{ color: INK, fontSize: "clamp(18px, 7.5cqh, 40px)", fontWeight: 650, lineHeight: 1.05 }}
          >
            {t("catalog.coverTitle")}
          </h1>
          <p
            className="font-semibold"
            style={{ color: ACCENT_BRIGHT, marginTop: "clamp(4px, 1.2cqh, 12px)", fontSize: "clamp(11px, 3cqh, 14px)" }}
          >
            {t("catalog.printCoverFooterTitle")}
          </p>
          <span
            aria-hidden
            className="block h-[3px] w-[46px] rounded-full bg-corp-yellow"
            style={{ marginTop: "clamp(6px, 1.6cqh, 16px)" }}
          />
        </div>

        {/* A propósito SIN `min-h-0` acá: con `min-h-0` esta caja se dejaba
            achicar por flexbox por DEBAJO de la altura que su propio
            contenido necesita (el strip de familias + la línea de cierre,
            que en columnas angostas envuelve a 2-3 líneas) — el resultado
            no era un corte sino algo peor: la parte que no entraba se
            pintaba AFUERA del rectángulo navy, sobre blanco, con texto
            blanco = invisible (ver catalogo-portada-sigue-cortada.md,
            iteración 2). Dejar el flex-item con su altura de contenido
            natural (default min-height:auto) y en cambio bajar los PISOS
            del resto de la portada (foto, padding) le deja sitio de sobra
            sin necesitar encogerse. El padding interno pasa a `cqh` —
            antes quedaba fijo y no se achicaba con el resto del fix de
            catalogo-contenido-cortado-y-mobile.md. */}
        <div
          className="flex flex-1 flex-col rounded-2xl"
          style={{ background: INK, marginTop: "clamp(6px, 3.4cqh, 32px)" }}
        >
          <div
            className="flex items-stretch justify-between px-4 sm:px-6"
            style={{ paddingTop: "clamp(6px, 1.8cqh, 20px)", paddingBottom: "clamp(6px, 1.8cqh, 20px)" }}
          >
            {allFamilies.map((entry, index) => (
              <FamilyStripItem key={entry.id} entry={entry} isActive={entry.id === family.id} showDivider={index > 0} />
            ))}
          </div>
          {/* En páginas angostas (spread portrait) esta fila envuelve a DOS
              líneas — `gap-2` fijo (8px) asumía una sola línea y no se
              achicaba con el resto, dejando ~4-5px de desborde residual
              incluso después de escalar el padding (ver
              catalogo-portada-sigue-cortada.md). El gap entre líneas
              también pasa a `cqh`. */}
          <div
            className="flex flex-wrap items-center justify-between px-4 text-[9px] font-medium sm:px-6 sm:text-[10px]"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.16)",
              color: "rgba(255,255,255,0.75)",
              paddingTop: "clamp(4px, 1.4cqh, 12px)",
              paddingBottom: "clamp(4px, 1.4cqh, 12px)",
              gap: "clamp(2px, 0.8cqh, 8px)",
            }}
          >
            <span>{t("catalog.coverClosingLine")}</span>
            <span>{t("catalog.coverClosingLocation")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (page.kind === "portfolio-info") {
    return (
      <div className="flex h-full flex-col" style={{ padding: "clamp(16px, 5cqh, 36px)" }}>
        <p className="text-[10px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.18em" }}>
          {t("catalog.printEyebrow")}
        </p>
        <h2
          className="mt-2 font-display"
          style={{ color: INK, fontSize: "clamp(18px, 4.2cqh, 28px)", fontWeight: 650, lineHeight: 1.1 }}
        >
          {t("catalog.portfolioTitle")}
        </h2>
        <span aria-hidden className="mt-3 block h-[3px] w-[42px] rounded-full bg-corp-yellow" />
        <p className="mt-4 text-[12px] leading-[1.7]" style={{ color: "#5C6B7D" }}>
          {t("catalog.portfolioIntro")}
        </p>

        {/* min-h-0 + overflow-y-auto (no solo overflow-hidden, ver
            catalogo-scroll-no-funciona.md): en un flex column, un hijo
            `flex-1` no se achica bajo el alto de su contenido por default
            (min-height:auto) — con `overflow-hidden` a secas eso dejaba a
            Electrónica (la última de las 5 familias) cortada a la mitad SIN
            forma de llegar a verla, porque el div nunca se encogía para que
            el scroll interno tuviera sentido. `min-h-0` fuerza ese
            encogimiento así el overflow real cae dentro de ESTE div (que sí
            scrollea), no fuera de la página. */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          {allFamilies.map((entry) => {
            const EntryIcon = FAMILY_ICONS[entry.id] ?? Package;
            return (
              <div key={entry.id} className="flex items-start gap-3" style={{ borderBottom: `1px solid ${RULE}`, padding: "12px 0" }}>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: CHIP_BG }}
                >
                  <EntryIcon className="h-4 w-4" strokeWidth={1.8} style={{ color: ACCENT }} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold" style={{ color: INK }}>
                    {entry.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: MUTED }}>
                    {t(`catalog.familyDescriptions.${entry.id}`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (page.kind === "portfolio-visual") {
    return (
      <div className="flex h-full flex-col" style={{ background: PAGE_BG }}>
        <div className="relative flex-1 overflow-hidden">
          <Image src={portfolioPhoto} alt="" fill className="object-cover" sizes="560px" />
        </div>
        <div className="px-6 py-6 sm:px-7" style={{ background: INK }}>
          <div className="flex items-stretch justify-between gap-2">
            {PILLAR_KEYS.map((key, index) => {
              const PillarIcon = PILLAR_ICONS[key];
              return (
                <div
                  key={key}
                  className="flex flex-1 flex-col items-center gap-2 px-1 text-center"
                  style={index > 0 ? { borderLeft: "1px solid rgba(255,255,255,0.16)" } : undefined}
                >
                  <PillarIcon className="h-5 w-5" strokeWidth={1.6} style={{ color: "#FFFFFF" }} aria-hidden />
                  <span className="text-[10px] font-semibold leading-tight sm:text-[11px]" style={{ color: "#FFFFFF" }}>
                    {t(`pillars.${key}.title`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (page.kind === "subfamily-divider") {
    const SubFamilyIcon = Icon;
    return (
      <div
        className="flex h-full flex-col items-center justify-center text-center"
        style={{ padding: "clamp(16px, 5cqh, 36px)" }}
      >
        {/* Alto reducido (ver catalogo-encuadre-y-zoom-divisoras.md,
            Problema 2): las 37 fotos divisoras reales son panorámicas
            (1536×1024 ≈ 1.5:1, o 1672×941 ≈ 1.78:1) — con el alto fijo
            anterior (420px sobre un ancho de página bastante más angosto,
            ratio ≈1.25:1) `object-cover` recortaba mucho de los costados
            para llenar un contenedor mucho más vertical que la foto
            original. 300px acerca la proporción del contenedor a la de
            las fotos reales (queda entre 1.5:1 y 1.78:1), así se recorta
            bastante menos composición. Alto en `cqh` (ver comentario en
            "cover" arriba) para no desbordar en páginas de poca altura real
            (catalogo-contenido-cortado-y-mobile.md, Problema 1). */}
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ height: "clamp(160px, 36cqh, 300px)" }}
        >
          <Image src={page.photo} alt="" fill className="object-cover" sizes="600px" />
          <div className="absolute inset-0" style={{ background: "rgba(8,43,92,0.38)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.14)" }}>
              <SubFamilyIcon className="h-7 w-7" strokeWidth={1.5} style={{ color: "#FFFFFF" }} aria-hidden />
            </span>
            <p className="mt-5 text-[11px] font-bold uppercase text-white/75" style={{ letterSpacing: "0.2em" }}>
              {family.name}
            </p>
            <h2
              className="mt-2 font-display text-white"
              style={{ fontSize: "clamp(22px, 5.5cqh, 44px)", fontWeight: 650, lineHeight: 1.08 }}
            >
              {page.subFamily.name}
            </h2>
          </div>
        </div>
        <p className="mt-6 text-[13px] font-medium" style={{ color: MUTED }}>
          {t("productsCount", { count: page.subFamily.itemCount })}
        </p>
      </div>
    );
  }

  return (
    <CategorySheet
      family={family}
      page={page}
      icon={Icon}
      loadImages={loadImages}
      priceFor={priceFor}
      pickupPriceFor={pickupPriceFor}
      onProductClick={onProductClick}
    />
  );
}

// Hoja de categoría: encabezado con identidad de familia/categoría + línea de acento + rejilla de tarjetas de
// producto. La usan las hojas reales del libro y la hoja de prueba oculta que decide la densidad (probe).
function CategorySheet({
  family,
  page,
  icon: Icon,
  loadImages,
  priceFor,
  pickupPriceFor,
  onProductClick,
  probe = false,
}: {
  family: HierarchyNode;
  page: Extract<BookPage, { kind: "category" }>;
  icon: LucideIcon;
  loadImages: boolean;
  priceFor: (id: string) => PriceView;
  pickupPriceFor: (id: string) => PickupPriceView;
  onProductClick: (product: ProductSummary, step?: "pickup" | null) => void;
  probe?: boolean;
}) {
  const t = useTranslations("Products");
  const perPage = page.perPage;
  // Rama "category" de BookPageContent: header con identidad de familia/categoría +
  // línea de acento, grilla de tarjetas de producto con foto real (fallback
  // a ícono de familia).
  return (
    <div className="flex h-full flex-col" style={{ padding: "clamp(10px, 3.4cqh, 28px)" }}>
      <div className="flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${RULE}`, paddingBottom: "clamp(4px, 1.2cqh, 12px)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: CHIP_BG }}>
            <Icon className="h-4.5 w-4.5" strokeWidth={1.7} style={{ color: ACCENT }} aria-hidden />
          </span>
          <div>
            <p className="text-[9.5px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.14em" }}>
              {family.name}
            </p>
            <h3 className="font-display" style={{ color: INK, fontSize: "clamp(15px, 2.6cqh, 19px)", fontWeight: 650, lineHeight: 1.15 }}>
              {page.category.name}
            </h3>
          </div>
        </div>
        {page.totalParts > 1 && (
          <span className="shrink-0 pt-1 text-[11px] font-medium" style={{ color: MUTED }}>
            {page.part}/{page.totalParts}
          </span>
        )}
      </div>
      <span
        aria-hidden
        className="block h-[3px] w-[42px] shrink-0 rounded-full bg-corp-yellow"
        style={{ marginTop: "clamp(4px, 1.2cqh, 12px)" }}
      />

      {/* items-start: sin esto, CSS grid estira todas las tarjetas de una
          fila a la altura de la más alta (stretch es el default) — con
          nombres de largo variable (ver fix-truncamiento-y-glosario.md)
          eso dejaría hueco vacío abajo de las tarjetas con nombre corto.
          Cada tarjeta conserva su alto natural en vez de estirarse. Gap y
          margen superior en `cqh` (ver comentario junto a "cover" arriba)
          para que una grilla densa (9 productos, varias filas) no desborde
          en páginas de poca altura real. Red de seguridad adicional
          (catalogo-contenido-cortado-y-mobile.md, Problema 1): en mobile
          portrait la página es mucho más angosta (una sola página, no
          media hoja de spread) así que 3 columnas dejan poco ancho por
          tarjeta — con nombres de producto largos (sin truncar a
          propósito, ver ProductCard) el texto envuelve a varias líneas y
          la grilla completa puede seguir sin entrar aunque ya esté
          reducida al piso de los clamp de arriba. `min-h-0` (los flex
          children no se achican bajo su alto de contenido por default) +
          `overflow-y-auto` SOLO en esta grilla (no en toda la página) para
          que ese caso límite haga scroll interno en vez de cortar
          productos en silencio — el resto de la página (header/línea de
          acento) se queda fijo arriba. */}
      <div
        className="grid min-h-0 flex-1 grid-cols-3 items-stretch overflow-y-auto overscroll-contain"
        data-lenis-prevent
        data-per-page={perPage}
        data-probe-grid={probe ? "" : undefined}
        style={{
          marginTop: "clamp(4px, 1.4cqh, 14px)",
          gap: "var(--pc-gap, clamp(4px, 1cqh, 12px))",
          // Filas iguales (3 con 9 tarjetas, 2 con 6) que se reparten el alto de la hoja (cada una al menos lo que
          // mide su contenido): las tarjetas de una misma fila y de todas las filas tienen la misma altura, con o
          // sin etiquetas.
          gridTemplateRows: `repeat(${rowsFor(perPage)}, minmax(min-content, 1fr))`,
        }}
      >
        {page.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            icon={Icon}
            loadImage={loadImages}
            price={hasDelivery(product) ? priceFor(product.id) : { kind: "hidden" }}
            pickupPrice={hasPickup(product) ? pickupPriceFor(product.id) : { kind: "hidden" }}
            onClick={(step) => onProductClick(product, step)}
          />
        ))}
        {/* Última página de la categoría con una fila vacía como mínimo: no es un error, la categoría terminó. */}
        {page.part === page.totalParts && page.products.length <= perPage - COLUMNS && (
          <p
            className="col-span-3 self-center text-center text-[11px] font-medium"
            style={{ gridRow: rowsFor(perPage), color: "#5C6B7D" }}
          >
            {t("catalog.categoryEnd")}
          </p>
        )}
      </div>
    </div>
  );
}

// Hoja de prueba (peor caso) para elegir la densidad; ver el efecto de ProductCatalogModal. Nunca se ve ni se
// enfoca: invisible, inerte y fuera del árbol de accesibilidad.
const PROBE_BOTH: ProductAvailability = { delivery: { available: true }, pickup: { available: true, sites: [] } };
const PROBE_PICKUP_ONLY: ProductAvailability = { delivery: { available: false }, pickup: { available: true, sites: [] } };
const PROBE_NAME = "Helado Premium Cremoso Sabor Vainilla con Trozos de Chocolate Belga y Galleta Familiar Extra Grande";
// Por columna: (0) los dos canales con precio en ambos, (1) los dos canales con precio de domicilio y retiro por
// consultar (las dos etiquetas), (2) solo retiro con precio variable ("Desde ₡X IVA incluido").
const PROBE_PRODUCTS: ProductSummary[] = Array.from({ length: 9 }, (_, i) => ({
  id: `probe-${i}`,
  name: PROBE_NAME,
  packSize: "CAJA 24 x 355 ML",
  availability: i % 3 === 2 ? PROBE_PICKUP_ONLY : PROBE_BOTH,
}));
const PROBE_PRICE: PriceView = { kind: "price", total: 899990, unit: "DISPLAY" };
const PROBE_PICKUP_PRICE: PickupPriceView = { kind: "price", total: 899990, unit: "DISPLAY", varies: true, bySite: [] };
const probePriceFor = (id: string): PriceView => (id.endsWith("2") || id.endsWith("5") || id.endsWith("8") ? { kind: "hidden" } : PROBE_PRICE);
const probePickupPriceFor = (id: string): PickupPriceView => {
  const column = Number(id.slice(-1)) % 3;
  return column === 1 ? { kind: "consult" } : PROBE_PICKUP_PRICE;
};

function DensityProbe({ icon, probeRef }: { icon: LucideIcon; probeRef: React.RefObject<HTMLDivElement | null> }) {
  const family: HierarchyNode = { id: "probe", name: "Alimentos", itemCount: 9, children: [] };
  return (
    <div
      ref={probeRef}
      aria-hidden
      inert
      className="pointer-events-none absolute left-0 top-0"
      style={{ visibility: "hidden", zIndex: -1 }}
    >
      {([9, 6] as const).map((per) => (
        <div key={per} data-probe={per} className="book-probe absolute left-0 top-0 overflow-hidden">
          <CategorySheet
            probe
            family={family}
            page={{
              kind: "category",
              category: { id: "probe-category", name: "Helados, Postres y Cremas Congeladas Premium", itemCount: 30, children: [] },
              products: PROBE_PRODUCTS.slice(0, per),
              part: 12,
              totalParts: 12,
              perPage: per,
            }}
            icon={icon}
            loadImages={false}
            priceFor={probePriceFor}
            pickupPriceFor={probePickupPriceFor}
            onProductClick={() => {}}
          />
        </div>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  icon,
  price,
  pickupPrice,
  onClick,
  loadImage,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  /** Precio de Retiro en tienda; por separado del de domicilio (nunca se mezclan). */
  pickupPrice: PickupPriceView;
  /** false = la página está lejos de la vista: la foto espera (ver lib/image-window.ts). */
  loadImage: boolean;
  price: PriceView;
  // step "pickup": abre el detalle en el paso de retiro (lo usa el "+" cuando no puede agregar directo al retiro).
  onClick: (step?: "pickup" | null) => void;
}) {
  const t = useTranslations("Products");
  const tCart = useTranslations("Cart");
  const { addItem, items: cartItems, pickupSiteId } = useCart();
  const { user } = useAuth();
  // Mientras se averigua cuántas presentaciones tiene el producto al tocar el "+" (solo con sesión y un solo canal).
  const [checkingUnits, setCheckingUnits] = useState(false);
  // Feedback al agregar desde la grilla (ver catalogo-feedback-agregar-
  // producto.md): antes el producto se agregaba en silencio, sin ninguna
  // confirmación visual acá (a diferencia del detalle, que ya mostraba
  // "¡Agregado!" en el botón — ver justAdded en ProductDetailModal.tsx,
  // mismo patrón). El pulso del contador del ícono del carrito en la barra
  // (CartButton.tsx) ya viene gratis: su badge se remonta con `key=
  // {totalCount}` en cada cambio, así que cualquier addItem (acá o en el
  // detalle) ya lo dispara sin tocar ese componente.
  const [justAdded, setJustAdded] = useState(false);
  // Cortar la propagación en fase de CAPTURA, no alcanza con
  // stopPropagation en el onClick normal (ver catalogo-detalle-fix-imagen-
  // click.md, punto 2): react-pageflip (la librería `page-flip`) engancha
  // su propio `mousedown`/`touchstart` con `addEventListener` NATIVO
  // directo sobre su propio contenedor (`distElement`, un ancestro real de
  // este botón), no a través del sistema de eventos sintéticos de React —
  // confirmado leyendo page-flip.module.js (`setHandlers()`). Ese listener
  // corre en fase de bubbling ANTES de que React llegue a despachar
  // `onClick` (React delega en la raíz de la app), así que para cuando el
  // click "normal" intentaría cortar la propagación ya es tarde: page-flip
  // ya decidió el cambio de página en su propio mousedown. Frenarlo en
  // captura (que corre primero, de la raíz hacia el botón, antes de que
  // bubbling le dé la vuelta a page-flip) sí lo evita — sin esto, page-flip
  // nunca se entera del mousedown/touchstart. El click del propio botón
  // (mismo nodo) sigue disparando normal, stopPropagation en captura solo
  // bloquea que el evento SIGA hacia otros nodos.
  //
  // Raíz: era un <button> pero necesita anidar el botón de agregado rápido
  // al carrito (ver montar-carrito-en-base-al-catalogo.md) — un <button>
  // dentro de otro <button> es HTML inválido, así que pasa a ser un
  // "botón" semántico con role/tabIndex/onKeyDown propios.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      aria-label={t("catalog.productDetailAriaLabel", { name: product.name })}
      className="relative flex h-full w-full cursor-pointer flex-col items-center overflow-hidden rounded-xl border bg-white text-center transition hover:-translate-y-0.5"
      style={{
        borderColor: RULE,
        boxShadow: "0 2px 8px rgba(8,43,92,0.06)",
        padding: "var(--pc-card-pad, clamp(4px, 1.1cqh, 8px))",
        gap: "var(--pc-card-gap, clamp(2px, 0.6cqh, 5px))",
      }}
    >
      {canAddToCart(product) && (
      <button
        type="button"
        disabled={checkingUnits}
        aria-busy={checkingUnits}
        onClick={async (e) => {
          e.stopPropagation();
          // Regla del "+" (ver plusDecision en lib/add-rules.ts): solo domicilio, igual que siempre (una sola presentación -> agrega
          // directo; varias -> abre el detalle). Domicilio Y retiro: abre el detalle sin canal preelegido (el cliente elige). SOLO retiro:
          // si el carrito ya tiene tienda de retiro y el producto tiene existencia allí en su presentación por defecto, se agrega directo
          // al retiro de esa tienda; si no hay tienda o no hay existencia, se abre el detalle en el paso de retiro (nunca se agrega al
          // retiro sin tienda). Con sesión se consultan las presentaciones (con un solo canal); sin ellas (sin sesión o si falla) se
          // decide con lo que ya trae el producto.
          const cartSite = cartPickupSite(cartItems, pickupSiteId);
          let units: Awaited<ReturnType<typeof fetchItemUnits>> = null;
          if (user && needsUnitsForPlus(product)) {
            setCheckingUnits(true);
            units = await fetchItemUnits(product.id);
            setCheckingUnits(false);
          }
          const decision = plusDecision(product, units, cartSite);
          if (decision.action === "open-detail") {
            onClick(decision.step);
            return;
          }
          addItem(product, 1, undefined, decision.action === "add-pickup" ? "pickup" : "delivery");
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1400);
        }}
        aria-label={
          hasDelivery(product) && hasPickup(product)
            ? tCart("chooseOptionsAria", { name: product.name })
            : tCart("quickAddAria", { name: product.name })
        }
        title={
          justAdded
            ? tCart("addedConfirmation")
            : hasDelivery(product) && hasPickup(product)
              ? tCart("chooseOptionsCta")
              : tCart("addToCartCta")
        }
        className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-all duration-300 hover:opacity-85"
        style={{ background: justAdded ? INK : ACCENT, transform: justAdded ? "scale(1.18)" : "scale(1)" }}
      >
        {justAdded ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        ) : (
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        )}
      </button>
      )}
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{ background: CHIP_BG, height: "clamp(24px, var(--pc-img, 7cqh), 64px)", width: "clamp(24px, var(--pc-img, 7cqh), 64px)" }}
      >
        <ProductImage
          itemId={product.id}
          name={product.name}
          familyIcon={icon}
          size="s"
          defer={!loadImage}
          className="h-full w-full object-contain p-1.5"
          // Mismo cuadro que una foto, pero el ícono de reemplazo ocupa menos y en un tono suave: no le gana
          // protagonismo a las fotos reales de las tarjetas vecinas.
          errorIconClassName="h-[58%] w-[58%] text-[#9AB0C8]"
        />
      </div>
      {/* Nombre: hasta 3 líneas (con el nombre completo en el tooltip y, al hacer clic, en el detalle del
          producto). Antes se mostraba siempre entero (fix-truncamiento-y-glosario.md, cuando no existía el
          detalle); con las etiquetas de canal y el precio de retiro, un nombre de 5 líneas ya no deja entrar la
          rejilla 3×3 en la hoja. */}
      <p
        className="text-[10px] font-semibold leading-[1.2]"
        title={productTitle(product.name).title}
        style={{
          color: INK,
          textWrap: "balance",
          overflowWrap: "anywhere",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          // 3 líneas; 2 en pantallas bajas o angostas (ver --pc-name-lines en product-catalog-overlay.css).
          WebkitLineClamp: "var(--pc-name-lines, 3)" as unknown as number,
          overflow: "hidden",
        }}
      >
        {productTitle(product.name).title}
      </p>
      {product.packSize && (
        <p className="text-[9.5px] font-medium" style={{ color: MUTED }}>
          {product.packSize}
        </p>
      )}
      {hasDelivery(product) ? (
        <>
          <PriceTag view={price} />
          {/* Con el precio de cmer el de retiro es el mismo: un solo precio por presentación y las dos etiquetas. */}
          {hasPickup(product) && !samePrice(price, pickupPrice) && <PickupPriceTag view={pickupPrice} role="secondary" />}
        </>
      ) : (
        <PickupPriceTag view={pickupPrice} role="primary" />
      )}
      <span className="mt-auto" />
      <ChannelBadges
        product={product}
        omitPickup={hasDelivery(product) && hasPickup(product) && pickupPrice.kind === "price" && !samePrice(price, pickupPrice)}
      />
    </div>
  );
}
