"use client";

import { useCallback } from "react";
import { useLenis } from "lenis/react";

const SCROLL_DURATION = 0.9;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Scroll suave hacia un ancla (#seccion), delegando en la instancia global de
 * Lenis (ver SmoothScroll.tsx) cuando ya está montada — respeta scroll-margin-top
 * (scroll-mt-20 de cada sección) para no quedar tapada por el navbar fijo, y
 * honra prefers-reduced-motion automáticamente. Si Lenis todavía no está
 * disponible, cae a `scrollIntoView` nativo con el mismo efecto.
 */
export function useScrollTo() {
  const lenis = useLenis();

  return useCallback(
    (id: string) => {
      const el = document.querySelector(id);
      if (!el) return;

      if (lenis) {
        lenis.scrollTo(el as HTMLElement, {
          duration: SCROLL_DURATION,
          easing: easeOutCubic,
        });
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [lenis]
  );
}
