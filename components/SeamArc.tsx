"use client";

import { useId } from "react";

type SeamArcProps = {
  /** Voltea el arco verticalmente para que "responda" al de la sección vecina. */
  flip?: boolean;
  className?: string;
};

/**
 * Arco/ceja decorativo muy sutil que marca la costura entre dos secciones
 * (Marcas→Contacto, Contacto→Footer) para que el cambio se sienta como una
 * curva continua en vez de un corte recto. Puramente decorativo: el fondo
 * navy no cambia, solo se agrega esta línea de luz.
 */
export default function SeamArc({ flip = false, className = "" }: SeamArcProps) {
  const uid = useId().replace(/[:]/g, "");

  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      fill="none"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <defs>
        <linearGradient id={`seam-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
          <stop offset="50%" stopColor="#3b7bff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b7bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,88 C 360,10 1080,150 1440,66"
        stroke={`url(#seam-${uid})`}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.4}
      />
    </svg>
  );
}
