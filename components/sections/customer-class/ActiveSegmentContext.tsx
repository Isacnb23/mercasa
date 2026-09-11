"use client";

import { createContext, useContext, useState } from "react";

type ActiveSegmentContextValue = {
  activeSegmentKey: string;
  setActiveSegmentKey: (key: string) => void;
};

const ActiveSegmentContext = createContext<ActiveSegmentContextValue | null>(null);

// Comparte el segmento activo entre "Segmento de Mercado" (justo después
// del Hero, ver reestructuracion-orden-secciones.md) y "Hablemos de
// negocios" (más abajo, después de Colaboradores) — el WhatsApp de cierre
// del formulario de contacto sigue necesitando saber qué segmento eligió
// el usuario arriba, aunque ya no sean dos <section> vecinas en el DOM.
// Antes este estado vivía como un simple useState dentro de ContactSection
// (que renderizaba ambas secciones una al lado de la otra); separar las
// dos secciones en el layout obligó a subir el estado a un Context propio
// en vez de pasarlo por props.
export function ActiveSegmentProvider({ children }: { children: React.ReactNode }) {
  const [activeSegmentKey, setActiveSegmentKey] = useState("supermercados");
  return (
    <ActiveSegmentContext.Provider value={{ activeSegmentKey, setActiveSegmentKey }}>
      {children}
    </ActiveSegmentContext.Provider>
  );
}

export function useActiveSegment() {
  const ctx = useContext(ActiveSegmentContext);
  if (!ctx) throw new Error("useActiveSegment debe usarse dentro de <ActiveSegmentProvider>");
  return ctx;
}
