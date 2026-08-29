"use client";

import { useCallback } from "react";
import { useLenis } from "lenis/react";

const SCROLL_DURATION = 0.9;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Scroll suave hacia un ancla (#seccion), delegando en la instancia global de
 * Lenis (ver SmoothScroll.tsx) cuando ya está montada — respeta scroll-margin-top
 * de cada sección para no quedar tapada por el navbar fijo, y honra
 * prefers-reduced-motion automáticamente. Si Lenis todavía no está disponible,
 * cae a `scrollIntoView` nativo con el mismo efecto.
 *
 * OJO — historia de este cálculo (ver fix-scroll-margin-insuficiente.md y
 * fix-padding-secciones-raiz.md): Lenis calcula el destino del scroll con el
 * `getBoundingClientRect()` de la sección EN EL MOMENTO DEL CLICK. Mientras
 * las 6 secciones navegables usaban <SectionReveal variant="lift"> (con un
 * `transform: translateY(36px)` que recién se resolvía al entrar a pantalla),
 * ese cálculo podía quedar desalineado del punto final de reposo por un monto
 * que variaba (0px a ~47px) según si la sección ya se había visto antes en la
 * sesión — cualquier `scroll-margin-top` fijo terminaba mostrando la sección
 * ANTERIOR asomando detrás del header en alguno de esos escenarios.
 *
 * Fix real: las 6 secciones (About/Logistics/Collaborators/Products/Brands/
 * Contact, ver page.tsx) ahora usan variant="fade" — sin transform de
 * posición — así el punto calculado por Lenis siempre coincide con el punto
 * de reposo. Con eso, cada sección puede usar un `scroll-mt-[-8px]` estable:
 * el borde superior de la sección queda siempre en o por encima del borde del
 * header (nunca positivo), así lo que se ve detrás/alrededor del header (en
 * su padding y las esquinas del pill flotante) es siempre el fondo de la
 * sección destino, nunca el de la anterior. El padding-top propio de cada
 * sección es lo que evita que el header tape el título con ese margen
 * negativo.
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
