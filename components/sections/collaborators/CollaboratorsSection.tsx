"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "../../ui/Container";
import Reveal, { RevealGroup, RevealItem } from "../../ui/Reveal";
import SoftCurve from "../../ui/SoftCurve";
import { collaboratorPhotos } from "@/lib/data";
import { cn } from "@/lib/utils";

// Cuántas celdas del grid mosaico ocupa cada tamaño de foto (ver
// lib/data.ts, collaboratorPhotos). Los mismos valores de col-span/row-span
// sirven en mobile (grid-cols-2) y desktop (lg:grid-cols-4): "large" pasa de
// ser un cuadro grande de ancho completo en mobile a media pantalla en
// desktop, sin necesitar clases responsive por separado.
const SIZE_CLASSES: Record<(typeof collaboratorPhotos)[number]["size"], string> = {
  large: "col-span-2 row-span-2",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
  normal: "col-span-1 row-span-1",
};

function CollaboratorPhotoTile({ photo }: { photo: (typeof collaboratorPhotos)[number] }) {
  const t = useTranslations("Collaborators");
  // Las fotos reales todavía no están subidas (ver lib/data.ts) — si el
  // archivo no existe, la imagen tira onError y esta celda degrada a un
  // ícono genérico sobre el mismo fondo sólido, en vez de romper el mosaico.
  const [errored, setErrored] = useState(false);

  return (
    <RevealItem className={cn("relative overflow-hidden rounded-[12px] bg-[#EEF2F6]", SIZE_CLASSES[photo.size])}>
      {!errored && (
        // <img> plano a propósito (no next/image): son placeholders que hoy
        // no existen en disco, y así el 404 llega directo al <img> sin pasar
        // por el pipeline de optimización de imágenes.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          alt={t("photoAlt")}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-8 w-8" style={{ color: "#B7C2D0" }} strokeWidth={1.5} aria-hidden />
        </div>
      )}
    </RevealItem>
  );
}

export default function CollaboratorsSection() {
  const t = useTranslations("Collaborators");

  return (
    // pt subido (72/84px, ver fix-padding-secciones-raiz.md): con
    // scroll-mt-[-8px] la sección aterriza a ras del header (~86-96px
    // reales) — medido en vivo, el título quedaba tapado con el pt-40/56
    // original (el eyebrow+separación antes del h2 no alcanzaba los ~96px
    // del header). Subido de nuevo a 130/150px (ver header-spacing-fix.md):
    // 72/84px ya no tapaba el título, pero quedaba casi sin aire visual —
    // mismo valor que el resto de las secciones para un espaciado parejo.
    // `min-h-dvh` gateado a `lg` (ver mobile-fixes-ronda2.md, punto 1, mismo
    // motivo que AboutSection): en mobile/tablet el mosaico es grid-cols-2
    // (más corto verticalmente que el lg:grid-cols-4 de desktop), así que
    // forzar pantalla completa siempre dejaba un tramo largo de scroll
    // vacío entre Nosotros y esta sección.
    <section id="colaboradores" className="relative flex scroll-mt-[-8px] flex-col justify-center overflow-hidden bg-white pb-[48px] pt-[130px] sm:pb-[64px] sm:pt-[150px] lg:min-h-dvh">
      {/* Entrada (Logística → Colaboradores) ya la marca la curva inferior
          de Logística. Acá se agrega la salida hacia Productos. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative">
        {/* y={0}: título de la sección navegable (#colaboradores), ver
            fix-padding-secciones-raiz.md — mismo motivo que en LogisticsTimeline. */}
        <Reveal y={0} className="mx-auto max-w-[640px] text-center">
          <span
            className="text-[12px] font-bold uppercase text-corp-blue"
            style={{ letterSpacing: "0.16em" }}
          >
            {t("eyebrow")}
          </span>
          <h2
            className="mt-4 font-display text-corp-ink"
            style={{
              fontSize: "clamp(36px, 4vw, 56px)",
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h2>
          <span aria-hidden className="mx-auto mt-5 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />
          <p className="mx-auto mt-6 max-w-[480px] text-[15.5px] leading-[1.7]" style={{ color: "#3A4A5F" }}>
            {t("subtitle")}
          </p>
        </Reveal>

        <RevealGroup
          stagger={0.06}
          className="mx-auto mt-14 grid max-w-[1100px] auto-rows-[140px] grid-cols-2 gap-4 sm:auto-rows-[160px] lg:grid-cols-4 lg:auto-rows-[180px]"
        >
          {collaboratorPhotos.map((photo) => (
            <CollaboratorPhotoTile key={photo.src} photo={photo} />
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
