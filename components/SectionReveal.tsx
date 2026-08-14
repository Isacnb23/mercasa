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
}: {
  children: React.ReactNode;
  variant?: "lift" | "fade";
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  const lift = variant === "lift";

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...(lift ? { y: 36, filter: "blur(6px)" } : {}),
      }}
      whileInView={{
        opacity: 1,
        ...(lift ? { y: 0, filter: "blur(0px)" } : {}),
      }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
