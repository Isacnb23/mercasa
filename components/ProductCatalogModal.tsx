"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import HTMLFlipBook from "react-pageflip";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Package, X, type LucideIcon } from "lucide-react";
import type { HierarchyNode, ProductSummary } from "@/lib/product-types";
import { FAMILY_ICONS } from "@/lib/product-family-icons";
import { formatProductCount } from "@/lib/utils";
import mercasaLogo from "@/public/models/mercasa-logo-transparent.png";
import "./product-catalog-print.css";
import "./product-catalog-flipbook.css";

// Diseño Mercasa real (feedback explícito: nada de estética "papel"
// inventada) — mismos tokens de marca que el resto del sitio
// (app/globals.css: --color-corp-*), hoja BLANCA, y el logo real en la
// portada. El giro de página es un libro de verdad (react-pageflip:
// arrastre de esquina, sombra de pliegue real), no una simulación CSS.
const INK = "#082B5C"; // corp-ink
const ACCENT = "#075FD8"; // corp-blue — el mismo azul que usa el resto del sitio
const CHIP_BG = "#E6F1FB"; // mismo tono que los chips de ícono en ProductsHeader
const MUTED = "#8493A5";
const PAGE_BG = "#FFFFFF"; // la hoja del libro: blanca
const BACKDROP_BG = "#F8F9FB"; // corp-offwhite — fondo del overlay, detrás del libro
const RULE = "#E2E8F0"; // mismo gris de borde que el resto del sitio

const BOOK_WIDTH = 520;
const BOOK_HEIGHT = 720;
const BOOK_MIN_WIDTH = 200;

// Productos por página del libro (renglones de texto, no tarjetas): más de
// esto y el nombre más largo del catálogo real ("EZBAGS BOLSA BASURA...")
// puede desbordar la página a la altura fijada por el libro.
const LISTING_ROWS_PER_PAGE = 12;

// Renglones por página impresa: son compactos, entran muchos más por hoja A4.
const PRINT_PAGE_SIZE = 24;

type BookPage =
  | { kind: "cover" }
  | { kind: "divider"; category: HierarchyNode }
  | { kind: "listing"; category: HierarchyNode; products: ProductSummary[]; part: number; totalParts: number }
  | { kind: "blank" };

// react-pageflip muestra las páginas de a pares (spread), empezando en un
// índice IMPAR justo después de la portada (1,2 · 3,4 · 5,6...) — saltar a
// una página con `.flip(index)` solo la deja como la IZQUIERDA visible del
// spread si `index` es impar; si cae en una posición par, el libro la
// "salta" y muestra el par siguiente en su lugar. Como cada categoría
// aporta un número de páginas VARIABLE (1 portada de sección + N de
// listado), una categoría con total impar de páginas corre a todas las
// que siguen — el salto "Ir a categoría" terminaba mostrando la categoría
// equivocada. Por eso se agrega una página en blanco de relleno cuando el
// bloque de una categoría queda impar, para que la siguiente arranque
// siempre alineada (mismo truco que usan las revistas/libros reales para
// que cada capítulo empiece en una página del lado correcto).
function buildBookPages(categorySections: HierarchyNode[]): BookPage[] {
  const pages: BookPage[] = [{ kind: "cover" }];
  for (const category of categorySections) {
    const startLength = pages.length;
    pages.push({ kind: "divider", category });
    const products = category.products ?? [];
    const totalParts = Math.max(1, Math.ceil(products.length / LISTING_ROWS_PER_PAGE));
    for (let part = 0; part < totalParts; part++) {
      pages.push({
        kind: "listing",
        category,
        products: products.slice(part * LISTING_ROWS_PER_PAGE, (part + 1) * LISTING_ROWS_PER_PAGE),
        part: part + 1,
        totalParts,
      });
    }
    if ((pages.length - startLength) % 2 !== 0) {
      pages.push({ kind: "blank" });
    }
  }
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

// El motor de react-pageflip clona cada hijo directo agregándole un `ref`
// para tomar el nodo DOM real — tiene que ser forwardRef, si no el libro no
// puede medir/posicionar la página.
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Page({ children }, ref) {
  return (
    <div ref={ref} className="h-full w-full overflow-hidden" style={{ background: PAGE_BG }}>
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
// compartida que liste las familias; cada una se abre directo desde su
// propio botón "Revista" en ProductExplorer). Portal a document.body,
// pantalla completa, se cierra con X o ESC.
export default function ProductCatalogModal({
  family,
  onClose,
}: {
  family: HierarchyNode;
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  const bookRef = useRef<{ pageFlip: () => PageFlipController } | null>(null);

  const categorySections = useMemo(
    () =>
      family.children.flatMap((subFamily) =>
        subFamily.children.filter((category) => (category.products?.length ?? 0) > 0)
      ),
    [family]
  );

  const bookPages = useMemo(() => buildBookPages(categorySections), [categorySections]);
  const printPages = useMemo(() => buildPrintPages(family), [family]);
  const totalPages = bookPages.length;

  // Página donde empieza cada categoría, para el salto directo del <select>.
  const categoryPageIndex = useMemo(() => {
    const map = new Map<string, number>();
    bookPages.forEach((page, index) => {
      if (page.kind === "divider" && !map.has(page.category.id)) map.set(page.category.id, index);
    });
    return map;
  }, [bookPages]);

  const [currentPage, setCurrentPage] = useState(0);

  // Tamaño real del libro en píxeles, recalculado con ResizeObserver contra
  // el espacio disponible (ancho Y alto) del hueco entre las flechas — así
  // el libro SIEMPRE entra en la ventana sin recortarse ni necesitar scroll,
  // en vez de fijar el alto a partir del ancho vía aspect-ratio (lo que
  // rompía el layout en viewports bajos: el libro se pasaba de la pantalla
  // y el resto del contenido quedaba inalcanzable).
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const [bookBox, setBookBox] = useState({ width: BOOK_WIDTH * 2, height: BOOK_HEIGHT });

  useEffect(() => {
    const el = bookAreaRef.current;
    if (!el) return;

    // Mismo umbral que react-pageflip usa internamente (usePortrait) para
    // decidir si muestra una página sola o el spread de dos — si no lo
    // igualamos acá, calculamos la caja con la proporción de dos páginas
    // aunque el libro adentro termine renderizando una sola, dejando un
    // hueco vacío al costado en vez de que la página quede centrada.
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

  const activeCategoryId = useMemo(() => {
    let found: string | null = null;
    for (const [categoryId, pageIndex] of categoryPageIndex) {
      if (pageIndex <= currentPage) found = categoryId;
    }
    return found;
  }, [categoryPageIndex, currentPage]);

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
  // TAMBIÉN el catálogo completo detrás (se veía como que "descargar PDF no
  // funciona": el usuario cancelaba/cerraba el diálogo de impresión y el
  // catálogo desaparecía con él). `afterprint` se dispara tanto al imprimir
  // como al cancelar, así que alcanza para levantar la guarda de nuevo.
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
    // Red de seguridad: si por lo que sea `afterprint` no llegara a
    // disparar en algún navegador, la guarda no se queda trabada para
    // siempre bloqueando el ESC del catálogo.
    setTimeout(() => {
      isPrintingRef.current = false;
    }, 60_000);
  };

  // ESC cierra, flechas del teclado hojean el libro de verdad.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isPrintingRef.current) return;
        onClose();
      } else if (e.key === "ArrowRight") bookRef.current?.pageFlip()?.flipNext();
      else if (e.key === "ArrowLeft") bookRef.current?.pageFlip()?.flipPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: BACKDROP_BG }}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("catalog.close")}
        className="fixed right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white transition hover:opacity-70 sm:right-8 sm:top-8"
        style={{ borderColor: RULE, color: ACCENT }}
      >
        <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>

      <div className="relative mx-auto flex h-full max-w-[1100px] flex-col items-center px-4 py-6 sm:py-8">
        {/* Encabezado: identidad de familia + ir a categoría + descargar PDF */}
        <div
          className="flex w-full max-w-[920px] shrink-0 flex-wrap items-center justify-between gap-4 pb-5"
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
                {family.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
                aria-label={t("catalog.jumpToCategoryLabel")}
                className="rounded-none border-0 border-b bg-transparent py-1 text-[13px] font-semibold outline-none"
                style={{ borderColor: RULE, color: ACCENT }}
              >
                {categorySections.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4 transition hover:opacity-70"
              style={{ color: ACCENT, textDecorationColor: RULE }}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t("catalog.downloadPdf")}
            </button>
          </div>
        </div>

        {/* El libro: tamaño en píxeles calculado a mano (bookBox) contra el
            espacio realmente disponible — NO se usa `autoSize` de
            react-pageflip porque ese modo deriva el alto a partir del ancho
            (un truco de padding-bottom%), ignorando por completo cuánta
            altura de pantalla queda libre. Eso era la causa de que la
            revista se pasara del alto de la ventana y el resto del
            contenido (indicador de página, etc.) quedara inalcanzable sin
            scroll. Con `autoSize={false}` + width/height explícitos acá, el
            libro SIEMPRE entra completo en la pantalla. */}
        <div className="mt-6 flex min-h-0 w-full flex-1 items-center justify-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
            disabled={currentPage <= 0}
            aria-label={t("catalog.prevPage")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70"
            style={{ borderColor: RULE, color: ACCENT }}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Este div (no el que envuelve los botones) es lo que mide el
              ResizeObserver: su tamaño es el espacio real disponible para el
              libro, ya descontando las flechas laterales. */}
          <div ref={bookAreaRef} className="flex h-full min-w-0 flex-1 items-center justify-center">
            <HTMLFlipBook
              ref={bookRef}
              width={BOOK_WIDTH}
              height={BOOK_HEIGHT}
              size="stretch"
              minWidth={BOOK_MIN_WIDTH}
              maxWidth={640}
              minHeight={280}
              maxHeight={900}
              startPage={0}
              drawShadow
              flippingTime={600}
              usePortrait
              startZIndex={10}
              autoSize={false}
              maxShadowOpacity={0.6}
              showCover
              mobileScrollSupport
              clickEventForward
              useMouseEvents
              swipeDistance={30}
              showPageCorners
              disableFlipByClick={false}
              className="catalog-flipbook shadow-[0_30px_80px_rgba(8,43,92,0.22)]"
              style={{ width: bookBox.width, height: bookBox.height }}
              onFlip={(e) => setCurrentPage(e.data as number)}
            >
              {bookPages.map((page, index) => (
                <Page key={index}>
                  <BookPageContent page={page} family={family} icon={Icon} />
                </Page>
              ))}
            </HTMLFlipBook>
          </div>

          <button
            type="button"
            onClick={() => bookRef.current?.pageFlip()?.flipNext()}
            disabled={currentPage >= totalPages - 1}
            aria-label={t("catalog.nextPage")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white transition disabled:opacity-25 enabled:hover:opacity-70"
            style={{ borderColor: RULE, color: ACCENT }}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p className="mt-6 text-[12px] font-medium" style={{ color: MUTED }}>
          {t("catalog.bookPageIndicator", { current: currentPage + 1, total: totalPages })}
        </p>
      </div>

      {/* Hoja de impresión (oculta en pantalla, ver product-catalog-print.css) */}
      <div id="catalog-print-sheet" aria-hidden>
        <section className="cp-page cp-cover">
          <div>
            <Image src={mercasaLogo} alt="Mercasa" className="cp-cover-logo" />
            <Icon className="cp-cover-icon" size={36} strokeWidth={1.4} />
            <div className="cp-eyebrow">{t("catalog.printEyebrow")}</div>
            <h1>
              {t("catalog.printCoverTitle")}
              <br />
              {family.name}
            </h1>
            <span aria-hidden className="cp-cover-rule" />
            <p className="cp-cover-description">{t("catalog.sectionDescription")}</p>
          </div>
          <div className="cp-cover-footer">
            <span>MERCASA · 2026</span>
            <span>{t("productsCountApprox", { count: formatProductCount(family.itemCount) })}</span>
          </div>
        </section>

        {printPages.map((page, index) => (
          <section className="cp-page cp-content-page" key={index}>
            <header className="cp-page-header">
              <span>MERCASA</span>
              <span className="cp-page-number">{t("catalog.printPageLabel", { page: index + 2 })}</span>
            </header>

            <div className="cp-category-header">
              <span className="cp-category-label">{family.name}</span>
              <h2>{page.categoryName}</h2>
              <span className="cp-rule" />
            </div>

            <div className="cp-products">
              {page.products.map((product) => (
                <div className="cp-product-row" key={product.id}>
                  <p className="cp-product-name">{product.name}</p>
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
    </div>,
    document.body
  );
}

function BookPageContent({
  page,
  family,
  icon: Icon,
}: {
  page: BookPage;
  family: HierarchyNode;
  icon: LucideIcon;
}) {
  const t = useTranslations("Products");

  if (page.kind === "blank") {
    return <div className="h-full w-full" style={{ background: PAGE_BG }} />;
  }

  if (page.kind === "cover") {
    return (
      <div className="flex h-full flex-col justify-between p-8 sm:p-10">
        <div>
          <Image src={mercasaLogo} alt="Mercasa" className="h-7 w-auto" priority />

          <div className="mt-9 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: CHIP_BG }}>
              <Icon className="h-7 w-7" strokeWidth={1.6} style={{ color: ACCENT }} aria-hidden />
            </span>
            <p className="text-[11px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.2em" }}>
              {t("catalog.eyebrow")}
            </p>
          </div>

          <h1
            className="mt-5 font-display"
            style={{ color: INK, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 600, lineHeight: 1.05 }}
          >
            {family.name}
          </h1>
          <span aria-hidden className="mt-4 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />
          <p className="mt-4 text-[13px] font-semibold" style={{ color: ACCENT }}>
            {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
          </p>
        </div>
        <p className="text-[11.5px] leading-snug" style={{ color: MUTED }}>
          {t("catalog.coverHint")}
        </p>
      </div>
    );
  }

  if (page.kind === "divider") {
    return (
      <div className="relative flex h-full flex-col justify-center overflow-hidden p-8 sm:p-10">
        <Icon
          className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44"
          strokeWidth={1}
          style={{ color: ACCENT, opacity: 0.08 }}
          aria-hidden
        />
        <p className="text-[10px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.2em" }}>
          {t("catalog.sectionEyebrow")}
        </p>
        <h3
          className="mt-2 font-display"
          style={{ color: INK, fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 600, lineHeight: 1.1 }}
        >
          {page.category.name}
        </h3>
        <span aria-hidden className="mt-4 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />
        <p className="relative mt-4 max-w-[240px] text-[12.5px] leading-[1.7]" style={{ color: "#5C6B7D" }}>
          {t("catalog.sectionDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-7 sm:p-9">
      <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: `2px solid ${ACCENT}` }}>
        <p className="text-[11px] font-bold uppercase" style={{ color: ACCENT, letterSpacing: "0.1em" }}>
          {page.category.name}
        </p>
        {page.totalParts > 1 && (
          <p className="text-[10px] font-medium" style={{ color: MUTED }}>
            {page.part}/{page.totalParts}
          </p>
        )}
      </div>

      <div className="mt-2 flex-1 overflow-hidden">
        {page.products.map((product) => (
          <div key={product.id} className="py-[7px]" style={{ borderBottom: `1px dotted ${RULE}` }}>
            <span className="text-[11.5px] leading-snug" style={{ color: INK }}>
              {product.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
