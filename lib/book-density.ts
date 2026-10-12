// Densidad de las hojas del libro del catálogo: cuántas tarjetas lleva cada hoja y qué tan compactas son.
// La decisión sale del espacio REAL de la hoja (ver ProductCatalogModal: se prueba una hoja "peor caso" oculta y
// del mismo tamaño que las reales), no de umbrales de alto o ancho de la ventana. Aquí viven las reglas puras.

export const COLUMNS = 3;

export interface BookLayout {
  /** Tarjetas por hoja (9 = 3×3, 6 = 3×2). ÚNICA fuente de verdad: reparto en páginas, menú, contadores. */
  perPage: 9 | 6;
  /** 1 = nombre 3 líneas y etiqueta normal; 2 = nombre 2 líneas; 3 = además etiqueta compacta y menos relleno. */
  level: 1 | 2 | 3;
}

// De más a menos holgado: primero se compacta el contenido y solo como último recurso se pasa a 6 tarjetas por hoja
// (con 6 cada fila es 1,5 veces más alta, así que vuelve a empezar por el nivel más holgado).
export const LAYOUT_CANDIDATES: readonly BookLayout[] = [
  { perPage: 9, level: 1 },
  { perPage: 9, level: 2 },
  { perPage: 9, level: 3 },
  { perPage: 6, level: 1 },
  { perPage: 6, level: 2 },
  { perPage: 6, level: 3 },
];

export const DEFAULT_LAYOUT: BookLayout = LAYOUT_CANDIDATES[0];

export const rowsFor = (perPage: number) => Math.ceil(perPage / COLUMNS);

/** El nivel más holgado que quepa; si ninguno cabe, el más compacto (6 tarjetas, nivel 3). */
export function chooseBookLayout(fits: (layout: BookLayout) => boolean): BookLayout {
  return LAYOUT_CANDIDATES.find(fits) ?? LAYOUT_CANDIDATES[LAYOUT_CANDIDATES.length - 1];
}

export const sameLayout = (a: BookLayout, b: BookLayout) => a.perPage === b.perPage && a.level === b.level;

// Tamaño de cada hoja a partir de la caja del libro: misma cuenta que react-pageflip en modo "stretch" (ancho de
// la hoja = mitad del libro, o todo en vertical; tope de ancho; alto según la proporción nominal del libro).
export function pageSize(
  box: { width: number; height: number },
  portrait: boolean,
  nominal: { width: number; height: number },
  maxPageWidth: number
): { width: number; height: number } {
  let width = Math.min(portrait ? box.width : box.width / 2, maxPageWidth);
  let height = width / (nominal.width / nominal.height);
  if (height > box.height) {
    height = box.height;
    width = height * (nominal.width / nominal.height);
  }
  return { width, height };
}

// ---- Conservar la página al cambiar las tarjetas por hoja ----
// Al pasar de 9 a 6 tarjetas el libro tiene otras páginas. Se guarda DÓNDE estaba el lector (qué página lógica y,
// en una categoría, qué producto abría la hoja) y se vuelve a ubicar en el libro nuevo.

export interface PageLike {
  kind: string;
  category?: { id: string };
  subFamily?: { id: string };
  part?: number;
}

export type PageAnchor = { key: string; firstProduct?: number };

const keyOf = (page: PageLike) =>
  page.kind === "category"
    ? `category:${page.category?.id}`
    : page.kind === "subfamily-divider"
      ? `divider:${page.subFamily?.id}`
      : page.kind;

export function anchorOf(page: PageLike | undefined, perPage: number): PageAnchor | null {
  if (!page) return null;
  return page.kind === "category"
    ? { key: keyOf(page), firstProduct: ((page.part ?? 1) - 1) * perPage }
    : { key: keyOf(page) };
}

/** Índice de la página que contiene el ancla en el libro nuevo (0 si no se encuentra). */
export function findAnchor(pages: readonly PageLike[], anchor: PageAnchor, perPage: number): number {
  if (anchor.firstProduct === undefined) {
    const index = pages.findIndex((p) => keyOf(p) === anchor.key);
    return index < 0 ? (anchor.key === "back" ? pages.length - 1 : 0) : index;
  }
  const part = Math.floor(anchor.firstProduct / perPage) + 1;
  const index = pages.findIndex((p) => keyOf(p) === anchor.key && p.part === part);
  return index < 0 ? 0 : index;
}
