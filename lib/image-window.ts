// Qué páginas del libro piden sus fotos (sin React, probado con `npm test`). react-pageflip monta TODAS las
// páginas a la vez: con un catálogo de cientos de productos eso eran cientos de fotos juntas contra mercasa-api
// (límite de peticiones). Solo piden foto las páginas del spread visible y las vecinas; las demás esperan con su
// marcador de posición y piden al acercarse. Lo ya descargado queda en la caché del navegador.
export const IMAGE_PAGES_BEHIND = 2;
export const IMAGE_PAGES_AHEAD = 3;

export function shouldLoadPageImages(pageIndex: number, currentPage: number): boolean {
  return pageIndex >= currentPage - IMAGE_PAGES_BEHIND && pageIndex <= currentPage + IMAGE_PAGES_AHEAD;
}

// Cuántas páginas con productos piden foto con el libro en `currentPage` (para medir antes/después).
export function pagesLoadingImages(totalPages: number, currentPage: number): number {
  let count = 0;
  for (let i = 0; i < totalPages; i++) if (shouldLoadPageImages(i, currentPage)) count++;
  return count;
}
