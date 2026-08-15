"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

type ChapterCurvesProps = {
  /** Variante de trazo: alterna la forma para que secciones vecinas no se vean idénticas. */
  variant?: 0 | 1 | 2;
  className?: string;
};

const PATH_SETS: [string, string][] = [
  [
    "M-100,180 C 220,60 420,260 760,150 S 1300,40 1640,190",
    "M-100,300 C 260,380 520,180 880,300 S 1360,400 1640,260",
  ],
  [
    "M-100,80 C 300,220 560,10 940,140 S 1420,240 1640,90",
    "M-100,260 C 280,140 620,340 960,210 S 1400,90 1640,230",
  ],
  [
    "M-100,220 C 240,90 500,300 820,170 S 1320,60 1640,210",
    "M-100,60 C 320,190 600,20 980,150 S 1380,260 1640,50",
  ],
];

/**
 * Líneas curvas de resplandor teal, muy sutiles, que fluyen detrás de
 * Marcas / Contacto / Footer para que se lean como una sola superficie
 * en vez de bloques pegados. Se "dibujan" (stroke-dashoffset vía pathLength)
 * la primera vez que entran en pantalla; con reduced-motion aparecen
 * estáticas, sin trazo animado.
 */
export default function ChapterCurves({ variant = 0, className = "" }: ChapterCurvesProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/[:]/g, "");
  const [dA, dB] = PATH_SETS[variant % PATH_SETS.length];

  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 1540 360"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`curve-fade-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
          <stop offset="45%" stopColor="#3b7bff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3b7bff" stopOpacity="0" />
        </linearGradient>
        <filter id={`curve-glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {[dA, dB].map((d, i) => (
        <g key={i}>
          {/* halo desenfocado detrás del trazo nítido */}
          <motion.path
            d={d}
            stroke={`url(#curve-fade-${uid})`}
            strokeWidth={5}
            strokeLinecap="round"
            filter={`url(#curve-glow-${uid})`}
            initial={reduceMotion ? { opacity: 0.16 - i * 0.05 } : { pathLength: 0, opacity: 0 }}
            whileInView={
              reduceMotion
                ? undefined
                : { pathLength: 1, opacity: 0.16 - i * 0.05 }
            }
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 2.4, delay: i * 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.path
            d={d}
            stroke={`url(#curve-fade-${uid})`}
            strokeWidth={1.2}
            strokeLinecap="round"
            initial={reduceMotion ? { opacity: 0.32 - i * 0.08 } : { pathLength: 0, opacity: 0 }}
            whileInView={
              reduceMotion
                ? undefined
                : { pathLength: 1, opacity: 0.32 - i * 0.08 }
            }
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 2.4, delay: i * 0.3 + 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </g>
      ))}
    </svg>
  );
}
