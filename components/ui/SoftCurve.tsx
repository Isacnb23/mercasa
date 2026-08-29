"use client";

import { useId } from "react";

/* ------------------------------------------------------------------ */
/*  Curva decorativa clara: un trazo fino y elegante entre secciones,     */
/*  sin glow/blur ni puntos de luz animados — la versión "de día" de las  */
/*  curvas que usaba el diseño oscuro. Compartida entre Hero y Nosotros   */
/*  para que se sienta la misma mano de diseño en todo el sitio.          */
/* ------------------------------------------------------------------ */
export default function SoftCurve({
  position,
  flip,
  color = "#5B9BE0",
  peakOpacity = 1,
}: {
  position: "top" | "bottom";
  flip?: boolean;
  /* Por defecto un azul con más cuerpo para fondos blancos/off-white. Las
     pocas secciones oscuras del sitio (Contacto) pasan un tono claro a baja
     opacidad (ej. "rgba(255,255,255,0.35)") para que el mismo trazo se siga
     leyendo sobre navy sin volverse un glow. */
  color?: string;
  peakOpacity?: number;
}) {
  const uid = useId().replace(/[:]/g, "");
    const d = flip
    ? "M0,90 C 320,130 660,150 1020,115 C 1360,80 1640,30 1920,105"
    : "M0,105 C 320,30 660,10 1020,65 C 1360,115 1640,150 1920,90";
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-[1] h-16 w-full sm:h-24 ${
        position === "top" ? "top-0" : "bottom-0"
      }`}
      viewBox="0 0 1920 160"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`soft-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity={peakOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} stroke={`url(#soft-curve-${uid})`} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}