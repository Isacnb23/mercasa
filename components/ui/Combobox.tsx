"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Loader2 } from "lucide-react";
import {
  comboboxKeyAction,
  filterOptions,
  isSearchable,
  placeListbox,
  type ComboboxOption,
  type ListboxPlacement,
} from "@/lib/combobox";
import { ACCENT, DANGER_TEXT, FIELD_CLASS, INK, MUTED, RULE, SELECTED_BG, TEXT_MUTED } from "./drawer-tokens";

// Desplegable propio para los formularios de los paneles (reemplaza al <select> nativo). Patrón combobox de ARIA 1.2: el
// foco se queda SIEMPRE en el campo (role="combobox") y la opción resaltada se anuncia con aria-activedescendant; la
// lista (role="listbox") se pinta en un portal con posición fija para que el panel con scroll no la corte ni la tape el
// botón de guardar. Con más de COMBOBOX_SEARCH_THRESHOLD opciones el campo se puede escribir y filtra la lista.
//   Flechas mueven · Enter/Espacio eligen · Escape cierra solo la lista · Tab cierra y sigue · Inicio/Fin (sin búsqueda).

export type { ComboboxOption };

export interface ComboboxProps {
  id: string;
  label: string;
  // Id de la opción elegida ("" = ninguna).
  value: string;
  options: readonly ComboboxOption[];
  onChange: (id: string) => void;
  // Bloqueado desde fuera (p. ej. falta el nivel anterior). También se bloquea mientras carga o sin opciones.
  disabled?: boolean;
  loading?: boolean;
  // Mensaje de error de carga bajo el campo.
  error?: string | null;
  placeholder: string;
  loadingText: string;
  searchPlaceholder: string;
  emptyText: string;
}

export default function Combobox({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
  error = null,
  placeholder,
  loadingText,
  searchPlaceholder,
  emptyText,
}: ComboboxProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const errorId = `${uid}-error`;
  const optionId = (index: number) => `${uid}-opt-${index}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number } & ListboxPlacement | null>(null);

  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled || loading || options.length === 0;
  const searchable = isSearchable(options.length);
  const visible = searchable ? filterOptions(options, query) : [...options];
  const active = visible.length === 0 ? -1 : Math.min(activeIndex, visible.length - 1);
  const selected = options.find((o) => o.id === value);
  const isOpen = open && !isDisabled;

  const openList = (index: number | null = null) => {
    setQuery("");
    const at = index ?? options.findIndex((o) => o.id === value);
    setActiveIndex(at >= 0 ? at : 0);
    setOpen(true);
  };
  const closeList = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (option: ComboboxOption) => {
    onChange(option.id);
    closeList();
    inputRef.current?.focus();
  };

  // Posición de la lista: se calcula contra el campo al abrir y se mantiene al hacer scroll del panel o redimensionar.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const { placement, maxHeight } = placeListbox(rect, viewportHeight);
      setPlace({
        placement,
        maxHeight,
        left: rect.left,
        width: rect.width,
        ...(placement === "below" ? { top: rect.bottom + 6 } : { bottom: viewportHeight - rect.top + 6 }),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      setPlace(null);
    };
  }, [isOpen, visible.length]);

  // Un toque o clic fuera del campo y de la lista la cierra.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && (fieldRef.current?.contains(target) || popupRef.current?.contains(target))) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  // La opción resaltada con el teclado siempre queda a la vista dentro de la lista.
  useEffect(() => {
    if (!isOpen || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId depende solo de uid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, active, place]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const { action, preventDefault, stopPropagation } = comboboxKeyAction(e.key, { open: isOpen, active, count: visible.length, searchable });
    if (preventDefault) e.preventDefault();
    // Escape con la lista abierta no debe llegar al panel (que se cerraría entero).
    if (stopPropagation) e.stopPropagation();
    switch (action.type) {
      case "open":
        openList();
        break;
      case "close":
        closeList();
        break;
      case "move":
        setActiveIndex(Math.max(action.index, 0));
        break;
      case "select":
        choose(visible[action.index]);
        break;
    }
  };

  const showSearch = isOpen && searchable;
  const inputValue = showSearch ? query : (selected?.name ?? "");
  const inputPlaceholder = loading ? loadingText : showSearch ? searchPlaceholder : placeholder;

  return (
    <div className="flex flex-col gap-1.5">
      <label id={labelId} htmlFor={id} className="text-[12px] font-semibold" style={{ color: INK }}>
        {label}
      </label>

      <div ref={fieldRef} className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-autocomplete={searchable ? "list" : "none"}
          aria-activedescendant={isOpen && active >= 0 ? optionId(active) : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required="true"
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          readOnly={!searchable}
          disabled={isDisabled}
          value={inputValue}
          placeholder={inputPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onClick={() => (isOpen ? (searchable ? undefined : closeList()) : openList())}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // Mover el foco a otro control cierra la lista; tocar la lista misma no (conserva el foco en el campo).
            if (popupRef.current?.contains(e.relatedTarget as Node | null)) return;
            closeList();
          }}
          className={`${FIELD_CLASS} pr-11 ${searchable ? "" : "cursor-pointer caret-transparent"}`}
          style={{ borderColor: RULE, color: INK }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center" aria-hidden>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={2} style={{ color: MUTED }} />
          ) : (
            <ChevronDown
              className={`h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
              style={{ color: isDisabled ? "#B9C6D8" : TEXT_MUTED }}
            />
          )}
        </span>
      </div>

      {error && (
        <span id={errorId} className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: DANGER_TEXT }}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {error}
        </span>
      )}

      {isOpen && place &&
        createPortal(
          <div
            ref={popupRef}
            data-lenis-prevent
            // Mantiene el foco en el campo al tocar la lista o su barra de scroll.
            onMouseDown={(e) => e.preventDefault()}
            className="fixed z-[330] overflow-y-auto overscroll-contain rounded-xl border bg-white py-1 shadow-[0_14px_36px_-8px_rgba(8,43,92,0.28)]"
            style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight, borderColor: RULE }}
          >
            <ul id={listId} role="listbox" aria-labelledby={labelId}>
              {visible.map((option, index) => {
                const isSelected = option.id === value;
                const isActive = index === active;
                return (
                  <li
                    key={option.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-4 py-2 text-[14px]"
                    style={{ background: isActive ? SELECTED_BG : undefined, color: INK, fontWeight: isSelected ? 600 : 400 }}
                  >
                    <span className="min-w-0 break-words">{option.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.4} style={{ color: ACCENT }} aria-hidden />}
                  </li>
                );
              })}
            </ul>
            {visible.length === 0 && (
              <p role="status" className="px-4 py-3 text-[13px]" style={{ color: TEXT_MUTED }}>
                {emptyText}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
