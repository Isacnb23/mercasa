"use client";

// Piezas comunes de los drawers laterales (carrito y perfil): contenedor con portal,
// overlay, panel, Escape, bloqueo de scroll y retorno del foco; más encabezado, cuerpo
// con scroll propio y pie fijo con el mismo lenguaje visual.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { getFocusable, trapTarget } from "@/lib/focus-trap";
import { BODY_BG, FOCUS_RING, INK, RULE, TEXT_MUTED } from "./drawer-tokens";

const subscribeNoop = () => () => {};

interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  // aria-label del diálogo.
  label: string;
  // Prefijo de las `key` de framer-motion (debe ser distinto por drawer).
  name: string;
  children: React.ReactNode;
}

export function DrawerShell({ isOpen, onClose, label, name, children }: DrawerShellProps) {
  const reduceMotion = useReducedMotion();
  const openerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // false en el servidor y en la hidratación, true ya en el navegador: el portal necesita
  // `document`, que no existe en el pase de servidor.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Al abrir se recuerda el elemento con foco (el botón que abrió el drawer), el foco pasa
  // al primer elemento interactivo del panel (o al panel mismo si no hay) y al cerrar vuelve
  // al elemento que lo abrió.
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel) (getFocusable(panel)[0] ?? panel).focus({ preventScroll: true });
    return () => {
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  // Tab y Shift+Tab no sacan el foco del panel mientras está abierto.
  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = trapTarget<HTMLElement>(getFocusable(panel), active === panel ? null : active, e.shiftKey, panel);
    if (target) {
      e.preventDefault();
      target.focus();
    }
  };

  if (!mounted) return null;

  // Con "reducir movimiento" el panel solo aparece con un fundido (sin deslizarse).
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key={`${name}-backdrop`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(8,20,40,0.45)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key={`${name}-panel`}
            ref={panelRef}
            tabIndex={-1}
            onKeyDown={handlePanelKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            {...panelMotion}
            transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[310] flex w-full max-w-[440px] flex-col overflow-hidden bg-white outline-none shadow-[0_0_60px_rgba(8,20,40,0.22)] md:rounded-l-[28px]"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface DrawerHeaderProps {
  eyebrow: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  // Elemento a la izquierda del título (ej. avatar con iniciales).
  leading?: React.ReactNode;
  // Dato secundario bajo el título, en gris.
  subtitle?: string;
  // Insignia junto al título (ej. cantidad de productos).
  badge?: React.ReactNode;
}

// Encabezado claro: sin bloque de color; título grande en navy, cierre discreto con borde
// fino y una línea divisoria sutil.
export function DrawerHeader({ eyebrow, title, closeLabel, onClose, leading, subtitle, badge }: DrawerHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-6 pb-4 pt-6" style={{ borderColor: RULE }}>
      <div className="flex min-w-0 items-center gap-3.5">
        {leading}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase leading-none" style={{ color: TEXT_MUTED, letterSpacing: "0.14em" }}>
            {eyebrow}
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <h2 className="line-clamp-2 break-words font-display text-[24px] font-semibold leading-tight" style={{ color: INK }}>
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 truncate text-[12.5px]" style={{ color: TEXT_MUTED }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] ${FOCUS_RING}`}
        style={{ borderColor: RULE, color: INK }}
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

// Cuerpo con scroll propio (encabezado y pie quedan fijos). `data-lenis-prevent` evita que
// el scroll suave del sitio capture la rueda/gesto dentro del panel.
export function DrawerBody({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-lenis-prevent
      className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5"
      style={{ background: BODY_BG }}
    >
      {children}
    </div>
  );
}

// Pie fijo: superficie blanca con sombra superior suave.
export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 bg-white px-5 pb-4 pt-3.5" style={{ boxShadow: "0 -10px 28px -14px rgba(8,43,92,0.22)" }}>
      {children}
    </div>
  );
}
