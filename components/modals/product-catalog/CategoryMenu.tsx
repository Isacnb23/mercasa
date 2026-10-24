"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ListFilter, Search } from "lucide-react";
import { filterMenuSections, MENU_SEARCH_THRESHOLD, countMenuCategories, type MenuSection } from "@/lib/category-nav";

// Menú "Ir a categoría" del encabezado del catálogo. Botón compacto (misma altura, radio y tokens que
// "Glosario", "Descargar PDF" y "Volver al sitio") que abre un panel: popover bajo el botón en pantallas
// ≥ sm y hoja inferior en móvil. Lista las sub-familias y categorías en orden, con la actual marcada y el
// número de productos de cada una; con más de 10 categorías suma un buscador. Accesible: el botón anuncia
// un listbox, las opciones son `role="option"` con `aria-selected`, flechas/Inicio/Fin mueven la opción
// activa (aria-activedescendant), Enter elige, Escape cierra y el foco vuelve al botón.

const INK = "#082B5C";
const ACCENT = "#075FD8";
const MUTED = "#8493A5";
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const HOVER_BG = "#F0F5FC";
const CURRENT_BG = "#EAF0F8";

export interface CategoryMenuLabels {
  button: string;
  title: string;
  searchPlaceholder: string;
  searchEmpty: string;
  current: string;
  products: (count: number) => string;
}

export interface CategoryMenuProps {
  sections: ReadonlyArray<MenuSection>;
  activeCategoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
  labels: CategoryMenuLabels;
}

// Elegir una categoría: UNA sola llamada a la navegación con su id y el menú se cierra. Es la única vía (clic y
// Enter pasan por aquí).
export function selectCategory(
  categoryId: string,
  handlers: { onSelect: (categoryId: string) => void; onOpenChange: (open: boolean) => void }
): void {
  handlers.onSelect(categoryId);
  handlers.onOpenChange(false);
}

export default function CategoryMenu({ sections, activeCategoryId, open, onOpenChange, onSelect, disabled, labels }: CategoryMenuProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const showSearch = countMenuCategories(sections) > MENU_SEARCH_THRESHOLD;
  const filtered = filterMenuSections(sections, query);
  const flat = filtered.flatMap((section) => section.categories);
  const showSectionTitles = sections.length > 1;
  const safeHighlight = Math.min(highlight, Math.max(0, flat.length - 1));
  const optionId = (categoryId: string) => `${uid}-opt-${categoryId}`;
  const activeOptionId = flat[safeHighlight] ? optionId(flat[safeHighlight].id) : undefined;

  // Al abrir, el foco entra al panel (buscador o lista); al cerrar, vuelve al botón.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      (showSearch ? searchRef.current : listRef.current)?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      buttonRef.current?.focus();
    }
  }, [open, showSearch]);

  // Abrir: búsqueda vacía y opción activa = la categoría actual.
  const toggle = () => {
    if (!open) {
      const index = sections.flatMap((s) => s.categories).findIndex((category) => category.id === activeCategoryId);
      setQuery("");
      setHighlight(index >= 0 ? index : 0);
    }
    onOpenChange(!open);
  };

  // La opción activa siempre a la vista al moverse con el teclado.
  useEffect(() => {
    if (!open || !activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeOptionId]);

  const choose = (categoryId: string) => selectCategory(categoryId, { onSelect, onOpenChange });

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation(); // que el libro de atrás no pase de página
        setHighlight((safeHighlight + 1) % Math.max(1, flat.length));
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setHighlight((safeHighlight - 1 + flat.length) % Math.max(1, flat.length));
        break;
      case "ArrowLeft":
      case "ArrowRight":
        e.stopPropagation(); // en el buscador mueven el cursor; nunca hojean el libro
        break;
      case "Home":
        if (e.target !== searchRef.current) {
          e.preventDefault();
          setHighlight(0);
        }
        break;
      case "End":
        if (e.target !== searchRef.current) {
          e.preventDefault();
          setHighlight(Math.max(0, flat.length - 1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (flat[safeHighlight]) choose(flat[safeHighlight].id);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation(); // cierra solo el menú, no el catálogo
        onOpenChange(false);
        break;
      case "Tab":
        onOpenChange(false);
        break;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={labels.button}
        title={labels.button}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] font-semibold outline-none transition hover:shadow-[0_1px_6px_rgba(16,37,63,0.08)] focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ borderColor: RULE, background: "#F7FAFD", color: ACCENT }}
      >
        <ListFilter className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="hidden sm:inline">{labels.button}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 sm:bg-transparent" onClick={() => onOpenChange(false)} aria-hidden />
          <div
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[min(75dvh,520px)] flex-col overflow-hidden rounded-t-3xl border bg-white shadow-[0_-16px_44px_rgba(16,37,63,0.22)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:max-h-[min(60dvh,440px)] sm:w-[min(360px,92vw)] sm:rounded-2xl sm:shadow-[0_16px_44px_rgba(16,37,63,0.18)]"
            style={{ borderColor: RULE }}
            onKeyDown={onPanelKeyDown}
          >
            <div className="shrink-0 border-b px-4 pb-3 pt-3.5" style={{ borderColor: RULE }}>
              <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
                {labels.title}
              </p>
              {showSearch && (
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" strokeWidth={2} style={{ color: MUTED }} aria-hidden />
                  <input
                    ref={searchRef}
                    type="text"
                    role="combobox"
                    aria-expanded
                    aria-controls={listId}
                    aria-activedescendant={activeOptionId}
                    aria-autocomplete="list"
                    aria-label={labels.searchPlaceholder}
                    placeholder={labels.searchPlaceholder}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlight(0);
                    }}
                    className="h-9 w-full rounded-full border bg-white pl-9 pr-3 text-[13.5px] outline-none placeholder:text-[#8493A5] focus-visible:ring-2 focus-visible:ring-[#075FD8]"
                    style={{ borderColor: RULE, color: INK }}
                  />
                </div>
              )}
            </div>

            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={labels.title}
              aria-activedescendant={showSearch ? undefined : activeOptionId}
              tabIndex={showSearch ? -1 : 0}
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 outline-none"
            >
              {flat.length === 0 && (
                <p className="px-3 py-6 text-center text-[13.5px]" style={{ color: TEXT_SOFT }}>
                  {labels.searchEmpty}
                </p>
              )}
              {filtered.map((section) => (
                <div key={section.id} role="group" aria-labelledby={`${uid}-sec-${section.id}`} className="mb-1 last:mb-0">
                  {showSectionTitles && (
                    <p
                      id={`${uid}-sec-${section.id}`}
                      className="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase"
                      style={{ color: MUTED, letterSpacing: "0.08em" }}
                    >
                      {section.name}
                    </p>
                  )}
                  {section.categories.map((category) => {
                    const isCurrent = category.id === activeCategoryId;
                    const isHighlighted = flat[safeHighlight]?.id === category.id;
                    return (
                      <div
                        key={category.id}
                        id={optionId(category.id)}
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => choose(category.id)}
                        onMouseMove={() => {
                          const index = flat.findIndex((c) => c.id === category.id);
                          if (index >= 0 && index !== safeHighlight) setHighlight(index);
                        }}
                        className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium"
                        style={{
                          background: isCurrent ? CURRENT_BG : isHighlighted ? HOVER_BG : "transparent",
                          color: isCurrent ? ACCENT : "#334155",
                          boxShadow: isHighlighted ? `inset 0 0 0 1.5px ${ACCENT}` : "none",
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{category.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-[12px] font-normal tabular-nums" style={{ color: TEXT_SOFT }}>
                            {labels.products(category.itemCount)}
                          </span>
                          {isCurrent ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-label={labels.current} /> : <span className="inline-block h-3.5 w-3.5" aria-hidden />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
