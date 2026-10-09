// Navegación del menú "Ir a categoría" del catálogo (sin React; se prueba con `npm test`). El libro
// (react-pageflip) reporta como página actual la del lado IZQUIERDO del spread, y con `showCover` la portada
// (índice 0) va sola: los spreads son [0], [1,2], [3,4]... (y la última página sola si el total es par). Una
// categoría que empieza en una página par queda en el lado DERECHO de su spread, así que tomar solo la página
// actual hacía que el menú marcara la categoría anterior.

// Páginas visibles para la página actual que reporta el libro. En portrait (móvil) es una sola.
export function visiblePageIndexes(currentPage: number, totalPages: number, portrait: boolean): number[] {
  if (portrait || currentPage <= 0) return [Math.max(0, currentPage)];
  return currentPage + 1 < totalPages ? [currentPage, currentPage + 1] : [currentPage];
}

export interface ActiveCategoryInput {
  currentPage: number;
  totalPages: number;
  portrait: boolean;
  // Categoría de cada página del libro (null en portada, portafolio y divisores).
  pageCategory: ReadonlyArray<string | null>;
  // Primera página de cada categoría.
  categoryStart: ReadonlyMap<string, number>;
  // Categoría elegida en el menú: manda mientras su primera página siga a la vista.
  jumpTarget: string | null;
}

// Categoría "actual": la elegida en el menú si su primera página está a la vista; si no, la que EMPIEZA en la
// página derecha del spread; si no, la de la primera página visible con categoría; si no hay (portada,
// portafolio, divisor), la última categoría anterior. Null si todavía no se llegó a ninguna.
export function activeCategoryId(input: ActiveCategoryInput): string | null {
  const visible = visiblePageIndexes(input.currentPage, input.totalPages, input.portrait);

  if (input.jumpTarget) {
    const start = input.categoryStart.get(input.jumpTarget);
    if (start !== undefined && visible.includes(start)) return input.jumpTarget;
  }

  if (visible.length === 2) {
    const right = input.pageCategory[visible[1]];
    if (right && input.categoryStart.get(right) === visible[1]) return right;
  }

  for (const index of visible) {
    const category = input.pageCategory[index];
    if (category) return category;
  }

  for (let index = visible[0] - 1; index >= 0; index--) {
    const category = input.pageCategory[index];
    if (category) return category;
  }

  return null;
}

// Qué hacer al elegir una categoría: si su primera página ya está a la vista no hay que pasar página (solo se
// marca como actual); si no, se pasa a esa página.
export function planJump(
  targetPage: number,
  currentPage: number,
  totalPages: number,
  portrait: boolean
): { kind: "stay" } | { kind: "flip"; page: number } {
  return visiblePageIndexes(currentPage, totalPages, portrait).includes(targetPage)
    ? { kind: "stay" }
    : { kind: "flip", page: targetPage };
}

export interface MenuCategory {
  id: string;
  name: string;
  itemCount: number;
}

export interface MenuSection {
  id: string;
  name: string;
  categories: MenuCategory[];
}

// Minúsculas y sin acentos, para buscar "electronica" y encontrar "Electrónica".
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
}

// Búsqueda del menú (cuando pasa de 10 categorías): filtra por nombre de categoría o de sub-familia y descarta
// las secciones que quedan vacías.
export function filterMenuSections(sections: ReadonlyArray<MenuSection>, query: string): MenuSection[] {
  const q = normalizeSearch(query);
  if (q === "") return sections.map((s) => ({ ...s }));
  return sections
    .map((section) => {
      const sectionMatches = normalizeSearch(section.name).includes(q);
      return {
        ...section,
        categories: sectionMatches ? section.categories : section.categories.filter((c) => normalizeSearch(c.name).includes(q)),
      };
    })
    .filter((section) => section.categories.length > 0);
}

export const MENU_SEARCH_THRESHOLD = 10;

export function countMenuCategories(sections: ReadonlyArray<MenuSection>): number {
  return sections.reduce((sum, s) => sum + s.categories.length, 0);
}
