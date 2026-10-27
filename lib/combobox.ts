import { normalizeSearch } from "@/lib/category-nav";

// Lógica pura del desplegable propio (components/ui/Combobox.tsx): filtro de búsqueda, qué hace cada tecla y dónde se
// coloca la lista flotante. Sin React ni DOM para probarla con el test runner de Node.

export interface ComboboxOption {
  id: string;
  name: string;
}

// Con más opciones que esto se suma la búsqueda por texto (cantones y distritos); provincias y ciudades cortas no la llevan.
export const COMBOBOX_SEARCH_THRESHOLD = 8;

export const isSearchable = (optionCount: number): boolean => optionCount > COMBOBOX_SEARCH_THRESHOLD;

// Búsqueda sin tildes ni mayúsculas ("leon" encuentra "León"). Sin texto devuelve todas, en el mismo orden.
export function filterOptions<T extends ComboboxOption>(options: readonly T[], query: string): T[] {
  const q = normalizeSearch(query);
  if (!q) return [...options];
  return options.filter((o) => normalizeSearch(o.name).includes(q));
}

export type ComboboxKeyAction =
  | { type: "open"; index: number | null }
  | { type: "close" }
  | { type: "move"; index: number }
  | { type: "select"; index: number }
  | { type: "none" };

export interface ComboboxKeyResult {
  action: ComboboxKeyAction;
  // Enter no debe enviar el formulario; las flechas no deben mover el scroll del panel; Escape no debe cerrar el panel.
  preventDefault: boolean;
  stopPropagation: boolean;
}

const NOOP: ComboboxKeyResult = { action: { type: "none" }, preventDefault: false, stopPropagation: false };

// Qué hace una tecla sobre el campo. `active` es la opción resaltada (-1 si no hay), `count` las opciones visibles.
export function comboboxKeyAction(
  key: string,
  state: { open: boolean; active: number; count: number; searchable: boolean },
): ComboboxKeyResult {
  const { open, active, count, searchable } = state;
  const last = count - 1;

  switch (key) {
    case "ArrowDown":
      if (!open) return { action: { type: "open", index: null }, preventDefault: true, stopPropagation: false };
      return { action: { type: "move", index: count === 0 ? -1 : Math.min(active + 1, last) }, preventDefault: true, stopPropagation: false };
    case "ArrowUp":
      if (!open) return { action: { type: "open", index: null }, preventDefault: true, stopPropagation: false };
      return { action: { type: "move", index: count === 0 ? -1 : Math.max(active - 1, 0) }, preventDefault: true, stopPropagation: false };
    case "Home":
      // En el campo de búsqueda Inicio/Fin mueven el cursor del texto, no la opción.
      if (!open || searchable || count === 0) return NOOP;
      return { action: { type: "move", index: 0 }, preventDefault: true, stopPropagation: false };
    case "End":
      if (!open || searchable || count === 0) return NOOP;
      return { action: { type: "move", index: last }, preventDefault: true, stopPropagation: false };
    case "Enter":
      if (!open) return { action: { type: "open", index: null }, preventDefault: true, stopPropagation: false };
      return {
        action: active >= 0 && active <= last ? { type: "select", index: active } : { type: "none" },
        preventDefault: true,
        stopPropagation: false,
      };
    case " ":
      // Sin búsqueda el campo es de solo lectura y la barra espaciadora se comporta como en un select nativo.
      if (searchable) return NOOP;
      if (!open) return { action: { type: "open", index: null }, preventDefault: true, stopPropagation: false };
      return {
        action: active >= 0 && active <= last ? { type: "select", index: active } : { type: "none" },
        preventDefault: true,
        stopPropagation: false,
      };
    case "Escape":
      // Cerrada, Escape sigue su camino (cierra el panel); abierta, solo cierra la lista.
      if (!open) return NOOP;
      return { action: { type: "close" }, preventDefault: true, stopPropagation: true };
    case "Tab":
      return open ? { action: { type: "close" }, preventDefault: false, stopPropagation: false } : NOOP;
    default:
      return NOOP;
  }
}

export interface ListboxPlacement {
  placement: "below" | "above";
  maxHeight: number;
}

// Debajo del campo si cabe (o si hay más sitio que arriba); si no, arriba. La altura se acota al espacio libre para que
// la lista nunca se corte con el borde de la pantalla.
export function placeListbox(
  rect: { top: number; bottom: number },
  viewportHeight: number,
  { gap = 6, margin = 12, desiredMax = 288, minUseful = 160 }: { gap?: number; margin?: number; desiredMax?: number; minUseful?: number } = {},
): ListboxPlacement {
  const below = viewportHeight - rect.bottom - gap - margin;
  const above = rect.top - gap - margin;
  const placeBelow = below >= Math.min(desiredMax, minUseful) || below >= above;
  const space = placeBelow ? below : above;
  return { placement: placeBelow ? "below" : "above", maxHeight: Math.max(96, Math.min(desiredMax, Math.floor(space))) };
}
