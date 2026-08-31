"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image, { type StaticImageData } from "next/image";
import HTMLFlipBook from "react-pageflip";
import { useTranslations } from "next-intl";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  HeartHandshake,
  Info,
  Package,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { HierarchyNode, ProductSummary } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import { formatProductCount } from "@/lib/utils";
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
import alimentosPanaderiaReposteriaGalletas from "@/public/Catalogo/Alimentos/panaderia-reposteria-galletas.png";
import alimentosEnlatados from "@/public/Catalogo/Alimentos/enlatados.png";
import alimentosPastasSalsasSopas from "@/public/Catalogo/Alimentos/pastas-salsas-sopas.png";
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

// 9 por página (3x3) — cada página del libro es solo la mitad de un spread,
// bastante más angosta que una página de pantalla completa suelta.
const PRODUCTS_PER_GRID_PAGE = 9;

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
// propósito no es una función de slugify automática: "Panadería
// Repostería y galletas" y "Pastas Salsas y Sopas" tienen nombre de
// archivo más corto (sin el "y" de en medio) que el slug que generaría
// una conversión automática, así que un diccionario explícito evita ese
// desajuste — mismo motivo por el que "Bebidas en polvo" apunta a un
// archivo con "-v2" en el nombre real, no al que se había propuesto.
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
  | { kind: "portfolio-info" }
  | { kind: "portfolio-visual" }
  | { kind: "subfamily-divider"; subFamily: HierarchyNode; photo: StaticImageData }
  | { kind: "category"; category: HierarchyNode; products: ProductSummary[]; part: number; totalParts: number };

// react-pageflip muestra las páginas de a pares (spread) después de la
// portada — portfolio-info/portfolio-visual son DOS entradas para que
// formen un spread propio (texto a la izquierda, foto+pilares a la
// derecha) en vez de una sola página que quedaría aplastada a la mitad del
// ancho. El salto "Ir a categoría" y prev/next funcionan igual de bien
// aunque una categoría caiga en índice par (page-flip la muestra como la
// página derecha del spread) — no hace falta rellenar con páginas en
// blanco para forzar paridad, eso solo infla el conteo de páginas.
function buildBookPages(family: HierarchyNode, photoOffset: number): BookPage[] {
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
      const totalParts = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_GRID_PAGE));
      for (let part = 0; part < totalParts; part++) {
        pages.push({
          kind: "category",
          category,
          products: products.slice(part * PRODUCTS_PER_GRID_PAGE, (part + 1) * PRODUCTS_PER_GRID_PAGE),
          part: part + 1,
          totalParts,
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

// Modo "filtrado" (ver customer-class-animacion-filtro.md, punto 2): a
// diferencia de buildBookPages/buildPrintPages (que recorren TODAS las
// sub-familias/categorías de UNA Familia), estas dos arman el libro/PDF a
// partir de una lista puntual de categorías ya resueltas — puede cruzar
// varias Familias distintas a la vez (ej. las 5 categorías de "Supermercados
// y cadenas" en Customer Class viven en 4 Familias distintas). Sin
// divisores de sub-familia: son categorías sueltas elegidas a mano, no un
// recorrido completo de una sub-familia. Reusa el resto del componente
// (portada, header, pie, impresión) sin tocarlo — ver `displayFamily` más
// abajo, que es lo único que cambia para reflejar el segmento en vez de una
// Familia real.
function buildFilteredBookPages(
  filterCategories: { category: HierarchyNode }[]
): BookPage[] {
  const pages: BookPage[] = [{ kind: "cover" }, { kind: "portfolio-info" }, { kind: "portfolio-visual" }];
  for (const { category } of filterCategories) {
    const products = category.products ?? [];
    if (products.length === 0) continue;
    const totalParts = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_GRID_PAGE));
    for (let part = 0; part < totalParts; part++) {
      pages.push({
        kind: "category",
        category,
        products: products.slice(part * PRODUCTS_PER_GRID_PAGE, (part + 1) * PRODUCTS_PER_GRID_PAGE),
        part: part + 1,
        totalParts,
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

// Métodos reales de PageFlip que usamos (el paquete `page-flip` no publica
// tipos, así que se declara acá solo lo que se consume — evita `any` suelto
// sin depender de los tipos internos de un paquete de terceros).
interface PageFlipController {
  flipNext: () => void;
  flipPrev: () => void;
  flip: (page: number) => void;
  getCurrentPageIndex: () => number;
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
  family,
  allFamilies,
  initialCategoryId,
  filterCategories,
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
  const isFiltered = !!filterCategories && filterCategories.length > 0;
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

  const photoOffset = useMemo(() => photoOffsetFor(displayFamily.id), [displayFamily.id]);
  const bookPages = useMemo(
    () => (isFiltered ? buildFilteredBookPages(filterCategories!) : buildBookPages(family, photoOffset)),
    [isFiltered, filterCategories, family, photoOffset]
  );
  const totalPages = bookPages.length;

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

  const initialPageIndex = !isFiltered && initialCategoryId ? (categoryPageIndex.get(initialCategoryId) ?? 0) : 0;
  const [currentPage, setCurrentPage] = useState(initialPageIndex);

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

  useEffect(() => {
    const el = bookAreaRef.current;
    if (!el) return;

    // Mismo umbral que react-pageflip usa internamente (usePortrait) para
    // decidir si muestra una página sola o el spread de dos — si no lo
    // igualamos acá, calculamos la caja con la proporción de dos páginas
    // aunque el libro adentro termine renderizando una sola.
    function fit(availableWidth: number, availableHeight: number) {
      const isPortrait = availableWidth < BOOK_MIN_WIDTH * 2;
      const ratio = isPortrait ? BOOK_WIDTH / BOOK_HEIGHT : (BOOK_WIDTH * 2) / BOOK_HEIGHT;
      let width = availableWidth;
      let height = width / ratio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }
      setBookBox({ width, height });
    }

    fit(el.clientWidth, el.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      fit(width, height);
    });
    observer.observe(el);
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
  const [bookEdges, setBookEdges] = useState({ left: 0, right: 0 });

  useLayoutEffect(() => {
    const containerEl = bookAreaRef.current;
    const shellEl = shellRef.current;
    const bookEl = containerEl?.querySelector<HTMLElement>(".catalog-flipbook");
    if (!containerEl || !shellEl || !bookEl) return;

    function measure() {
      const shellRect = shellEl!.getBoundingClientRect();
      const bookRect = bookEl!.getBoundingClientRect();
      return {
        left: bookRect.left - shellRect.left,
        right: shellRect.right - bookRect.right,
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

  const activeCategoryId = useMemo(() => {
    let found: string | null = null;
    for (const [categoryId, pageIndex] of categoryPageIndex) {
      if (pageIndex <= currentPage) found = categoryId;
    }
    return found;
  }, [categoryPageIndex, currentPage]);

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

  // Detalle ampliado de un producto (ver catalogo-detalle-producto.md) —
  // feature nuevo, independiente del flipbook: no toca `currentPage` al
  // abrir/cerrar, así que cerrar el detalle deja al usuario exactamente en
  // la misma página/categoría de antes. `selectedProduct` null = cerrado.
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);

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
        handleClose();
      } else if (e.key === "ArrowRight") {
        if (isBookReady && !selectedProduct) bookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === "ArrowLeft") {
        if (isBookReady && !selectedProduct) bookRef.current?.pageFlip()?.flipPrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isBookReady, isGlossaryOpen, selectedProduct]);

  return createPortal(
    <>
      <div
        className={`catalog-backdrop${isClosing ? " is-closing" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div className={`catalog-panel${isClosing ? " is-closing" : ""}`} style={{ background: PAGE_BG }}>
          {/* Barra superior: identidad de familia + ir a categoría + PDF + cerrar. */}
          <div
            className="catalog-header flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8"
            style={{ borderBottom: `1px solid ${RULE}` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: CHIP_BG }}>
                <Icon className="h-5 w-5" strokeWidth={1.7} style={{ color: ACCENT }} aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.18em" }}>
                  {t("catalog.eyebrow")}
                </p>
                <p className="font-display" style={{ color: INK, fontSize: "19px", fontWeight: 600, lineHeight: 1.1 }}>
                  {displayFamily.name}
                </p>
              </div>
            </div>

            {/* relative: ancla de posicionamiento del popover del glosario
                de abajo — así queda anclado al borde derecho de TODA esta
                fila de controles (que coincide con el borde derecho del
                header) en vez de al botón "Glosario" en sí, que en mobile
                puede quedar lejos del borde y hacer que el popover se
                corte contra el borde izquierdo de la pantalla. */}
            <div className="relative flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="hidden text-[12px] font-medium sm:inline" style={{ color: MUTED }}>
                  {t("catalog.jumpToCategoryLabel")}
                </span>
                <select
                  value={activeCategoryId ?? ""}
                  onChange={(e) => {
                    const index = categoryPageIndex.get(e.target.value);
                    if (index != null) bookRef.current?.pageFlip()?.flip(index);
                  }}
                  disabled={!isBookReady}
                  aria-label={t("catalog.jumpToCategoryLabel")}
                  className="rounded-none border-0 border-b bg-transparent py-1 text-[13px] font-semibold outline-none disabled:opacity-40"
                  style={{ borderColor: RULE, color: ACCENT }}
                >
                  {categorySections.map(({ subFamily, categories }) => (
                    <optgroup key={subFamily.id} label={subFamily.name}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {/* Glosario de abreviaturas de empaque (ver
                  fix-truncamiento-y-glosario.md) — vive en el header, no en
                  una página del libro, para que sea accesible desde
                  CUALQUIER punto del catálogo. Backdrop invisible a pantalla
                  completa para cerrar con click afuera, además de ESC (ver
                  el handleKeyDown de arriba) y la X propia del popover.
                  Fragment, no un <div> con `relative`: el ancla real es el
                  contenedor de todos los controles de arriba, no este
                  botón puntual (ver comentario ahí). */}
              <>
                <button
                  type="button"
                  onClick={() => setIsGlossaryOpen((current) => !current)}
                  aria-label={t("catalog.glossaryButtonLabel")}
                  title={t("catalog.glossaryButtonLabel")}
                  aria-expanded={isGlossaryOpen}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition hover:opacity-70"
                  style={{ borderColor: RULE, color: ACCENT }}
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  <span className="hidden sm:inline">{t("catalog.glossaryButtonLabel")}</span>
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
                      className="absolute right-0 top-[calc(100%+10px)] z-40 max-h-[70vh] w-[min(340px,90vw)] overflow-y-auto rounded-2xl border bg-white p-4 text-left shadow-[0_16px_44px_rgba(16,37,63,0.18)]"
                      style={{ borderColor: RULE }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-[14px] font-semibold" style={{ color: INK }}>
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
                                <li key={entry.abbr} className="flex items-baseline gap-2 text-[12.5px] leading-snug">
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

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4 transition hover:opacity-70"
                style={{ color: ACCENT, textDecorationColor: RULE }}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                <span className="hidden sm:inline">{t("catalog.downloadPdf")}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label={t("catalog.backToSite")}
                title={t("catalog.backToSite")}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition hover:opacity-70"
                style={{ borderColor: RULE, color: INK }}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                <span className="hidden sm:inline">{t("catalog.backToSite")}</span>
              </button>
            </div>
          </div>

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
          <div className="catalog-shell" ref={shellRef}>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
              disabled={!isBookReady || currentPage <= 0}
              aria-label={t("catalog.prevPage")}
              className="ml-1 mr-2 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70 sm:ml-4 sm:mr-5"
              style={{ borderColor: RULE, color: ACCENT }}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>

            <div
              className="page-stack page-stack-left"
              style={{ left: bookEdges.left - leftStackWidth, width: leftStackWidth }}
              aria-hidden
            />

            {/* Este div (no los botones/franjas de al lado) es lo que mide el
                ResizeObserver: su tamaño es el espacio real disponible para el
                libro, ya descontando flechas y cantos de página. `relative`
                es el ancla del loader de abajo. */}
            <div ref={bookAreaRef} className="flipbook-container relative flex h-full min-w-0 flex-1 items-center justify-center">
              <HTMLFlipBook
                ref={bookRef}
                width={BOOK_WIDTH}
                height={BOOK_HEIGHT}
                size="stretch"
                minWidth={BOOK_MIN_WIDTH}
                maxWidth={860}
                minHeight={300}
                maxHeight={1160}
                startPage={initialPageIndex}
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
              >
                {bookPages.map((page, index) => (
                  <Page key={index}>
                    <BookPageContent
                      page={page}
                      family={displayFamily}
                      allFamilies={allFamilies}
                      icon={Icon}
                      coverPhoto={coverPhoto}
                      onProductClick={setSelectedProduct}
                    />
                  </Page>
                ))}
              </HTMLFlipBook>

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
              className="ml-2 mr-1 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70 sm:ml-5 sm:mr-4"
              style={{ borderColor: RULE, color: ACCENT }}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          {/* Pie único de la revista (no por página — así nunca puede duplicarse
              entre dos páginas visibles a la vez, que era el problema en el
              diseño anterior con spreads de a dos). */}
          <div
            className="catalog-footer flex items-center justify-between gap-3 px-5 py-3 sm:px-8"
            style={{ background: INK }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Image src={mercasaLogo} alt="Mercasa" className="h-3.5 w-auto shrink-0 brightness-0 invert" />
              <span className="hidden truncate text-[10px] font-medium sm:inline" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("catalog.printFooterTagline")}
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
              {t("catalog.bookPageIndicator", { current: currentPage + 1, total: totalPages })}
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
          glossaryGroups={glossaryGroups}
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
    <div
      className="flex flex-1 flex-col items-center gap-1.5 px-1 text-center"
      style={showDivider ? { borderLeft: "1px solid rgba(255,255,255,0.16)" } : undefined}
    >
      <EntryIcon
        className="h-4 w-4 sm:h-5 sm:w-5"
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

function BookPageContent({
  page,
  family,
  allFamilies,
  icon: Icon,
  coverPhoto,
  onProductClick,
}: {
  page: BookPage;
  family: HierarchyNode;
  allFamilies: HierarchyNode[];
  icon: LucideIcon;
  /** Portada genérica o por segmento (ver catalogo-portada-por-segmento.md
   * y SEGMENT_COVER_PHOTOS arriba) — decidida en ProductCatalogModal, este
   * componente solo la pinta. */
  coverPhoto: string | StaticImageData;
  onProductClick: (product: ProductSummary) => void;
}) {
  const t = useTranslations("Products");
  // Portafolio (a diferencia de la portada, arriba) sigue fijo para todas
  // las familias (ver reemplazar-imagenes-portada-indice.md) — no rota ni
  // depende del segmento.
  const portfolioPhoto = indicePhoto;

  if (page.kind === "cover") {
    return (
      <div className="flex min-h-full flex-col p-7 sm:p-9">
        <div className="flex items-center justify-between">
          <Image src={mercasaLogo} alt="Mercasa" className="h-6 w-auto sm:h-7" priority />
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: CHIP_BG }}>
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: ACCENT }} aria-hidden />
            <span className="text-[10.5px] font-bold" style={{ color: ACCENT }}>
              {family.name}
            </span>
          </span>
        </div>

        <div className="relative mt-6 h-[190px] overflow-hidden rounded-2xl sm:h-[240px]">
          <Image src={coverPhoto} alt="" fill priority className="object-cover" sizes="600px" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(8,43,92,0) 55%, rgba(8,43,92,0.55) 100%)" }}
          />
        </div>

        <div className="mt-7">
          <h1
            className="font-display"
            style={{ color: INK, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 650, lineHeight: 1.05 }}
          >
            {t("catalog.coverTitle")}
          </h1>
          <p className="mt-3 text-[14px] font-semibold" style={{ color: ACCENT_BRIGHT }}>
            {t("catalog.printCoverFooterTitle")}
          </p>
          <span aria-hidden className="mt-4 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />
        </div>

        <div className="mt-8 flex-1 rounded-2xl" style={{ background: INK }}>
          <div className="flex items-stretch justify-between px-4 py-4 sm:px-6 sm:py-5">
            {allFamilies.map((entry, index) => (
              <FamilyStripItem key={entry.id} entry={entry} isActive={entry.id === family.id} showDivider={index > 0} />
            ))}
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[9px] font-medium sm:px-6 sm:text-[10px]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.75)" }}
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
      <div className="flex min-h-full flex-col p-7 sm:p-9">
        <p className="text-[10px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.18em" }}>
          {t("catalog.printEyebrow")}
        </p>
        <h2
          className="mt-2 font-display"
          style={{ color: INK, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 650, lineHeight: 1.1 }}
        >
          {t("catalog.portfolioTitle")}
        </h2>
        <span aria-hidden className="mt-3 block h-[3px] w-[42px] rounded-full bg-corp-yellow" />
        <p className="mt-4 text-[12px] leading-[1.7]" style={{ color: "#5C6B7D" }}>
          {t("catalog.portfolioIntro")}
        </p>

        <div className="mt-5 flex-1 overflow-hidden">
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
      <div className="flex min-h-full flex-col" style={{ background: PAGE_BG }}>
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
      <div className="flex min-h-full flex-col items-center justify-center p-7 text-center sm:p-9">
        <div className="relative h-[300px] w-full overflow-hidden rounded-2xl sm:h-[420px]">
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
              style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 650, lineHeight: 1.08 }}
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

  // page.kind === "category": header con identidad de familia/categoría +
  // línea de acento, grilla de tarjetas de producto con foto real (fallback
  // a ícono de familia).
  return (
    <div className="flex min-h-full flex-col p-7 sm:p-9">
      <div className="flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${RULE}`, paddingBottom: "14px" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: CHIP_BG }}>
            <Icon className="h-4.5 w-4.5" strokeWidth={1.7} style={{ color: ACCENT }} aria-hidden />
          </span>
          <div>
            <p className="text-[9.5px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.14em" }}>
              {family.name}
            </p>
            <h3 className="font-display" style={{ color: INK, fontSize: "19px", fontWeight: 650, lineHeight: 1.15 }}>
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
      <span aria-hidden className="mt-4 block h-[3px] w-[42px] shrink-0 rounded-full bg-corp-yellow" />

      {/* items-start: sin esto, CSS grid estira todas las tarjetas de una
          fila a la altura de la más alta (stretch es el default) — con
          nombres de largo variable (ver fix-truncamiento-y-glosario.md)
          eso dejaría hueco vacío abajo de las tarjetas con nombre corto.
          Cada tarjeta conserva su alto natural en vez de estirarse. */}
      <div className="mt-5 grid flex-1 grid-cols-3 content-start items-start gap-3">
        {page.products.map((product) => (
          <ProductCard key={product.id} product={product} icon={Icon} onClick={() => onProductClick(product)} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  icon,
  onClick,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const t = useTranslations("Products");
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
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      aria-label={t("catalog.productDetailAriaLabel", { name: product.name })}
      className="flex w-full flex-col items-center gap-1.5 rounded-xl border bg-white p-2 text-center transition hover:-translate-y-0.5"
      style={{ borderColor: RULE, boxShadow: "0 2px 8px rgba(8,43,92,0.06)" }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-16 sm:w-16"
        style={{ background: CHIP_BG }}
      >
        <ProductImage
          itemId={product.id}
          name={product.name}
          familyIcon={icon}
          size="s"
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      {/* Sin line-clamp/truncamiento a propósito (ver
          fix-truncamiento-y-glosario.md): este catálogo es estático, no
          hay forma de ver el nombre completo si se corta con "...", así
          que el nombre SIEMPRE tiene que verse entero, sin importar
          cuántas líneas necesite. */}
      <p className="text-[9.5px] font-semibold leading-snug" style={{ color: INK }}>
        {product.name}
      </p>
      {product.packSize && (
        <p className="text-[8.5px] font-medium" style={{ color: MUTED }}>
          {product.packSize}
        </p>
      )}
    </button>
  );
}
