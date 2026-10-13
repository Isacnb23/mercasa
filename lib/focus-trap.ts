// Foco dentro de un diálogo modal: qué elementos son enfocables y a dónde manda Tab / Shift+Tab para que el foco no
// salga del panel mientras está abierto.
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true"
  );
}

// A qué elemento hay que mover el foco para mantenerlo adentro, o null si el navegador puede seguir su curso normal.
// `container` es el panel: si el foco está fuera de la lista (p. ej. en el propio panel) se lleva al primero/último.
export function trapTarget<T>(focusables: T[], active: T | null, shiftKey: boolean, container: T | null = null): T | null {
  if (focusables.length === 0) return container;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const index = active === null ? -1 : focusables.indexOf(active);
  if (index === -1) return shiftKey ? last : first;
  if (shiftKey && active === first) return last;
  if (!shiftKey && active === last) return first;
  return null;
}
