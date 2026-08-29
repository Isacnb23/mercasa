"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Aparición de sección completa al entrar en pantalla.
 *
 * `variant="fade"` anima solo la opacidad: obligatorio para secciones que usan
 * GSAP ScrollTrigger con pin, porque cualquier `transform` en un ancestro rompe
 * el `position: fixed` que usa el pineado.
 */
export default function SectionReveal({
  children,
  variant = "lift",
  delay = 0,
  z,
}: {
  children: React.ReactNode;
  variant?: "lift" | "fade";
  delay?: number;
  /** z-index creciente por capítulo: al "subir" sobre el anterior, se asienta
   *  encima en vez de quedar debajo durante el solape de la animación. */
  z?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  const lift = variant === "lift";

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...(lift ? { y: 36, scale: 0.995 } : {}),
      }}
      whileInView={{
        opacity: 1,
        ...(lift ? { y: 0, scale: 1 } : {}),
      }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: "relative", zIndex: z }}
    >
      {children}
    </motion.div>
  );
}
