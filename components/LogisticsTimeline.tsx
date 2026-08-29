"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import Container from "./Container";
import Reveal from "./Reveal";
import SoftCurve from "./SoftCurve";
import LogisticsSteps from "./LogisticsSteps";
import { useScrollTo } from "@/lib/hooks/useScrollTo";
import heroLogisticaPhoto from "@/public/brand/herologistica.jpg";

/* ---------- Banda hero: collage ya compuesto (barco → bodega → camión → tienda) ---------- */
function HeroBand({ alt }: { alt: string }) {
  return (
    <div className="relative aspect-[1942/809] w-full overflow-hidden rounded-[20px] border border-corp-ink/[0.08] shadow-corp">
      <Image
        src={heroLogisticaPhoto}
        alt={alt}
        fill
        className="object-cover"
        sizes="(min-width: 1280px) 900px, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 2rem)"
      />
    </div>
  );
}

/* ---------- Sección principal ---------- */
export default function LogisticsTimeline() {
  const t = useTranslations("Logistics");
  const scrollTo = useScrollTo();
  return (
    <section
      id="logistica"
      // pt subido de 96/128px a 130/150px (ver header-spacing-fix.md): mismo
      // valor que el resto de las secciones para un espaciado parejo en
      // todo el sitio.
      className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden pb-16 pt-[130px] md:pb-20 md:pt-[150px]"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F7F3EB 100%)" }}
    >
      {/* El seam Nosotros → Logística ya lo marca la curva inferior de
          Nosotros; acá solo se agrega la de salida hacia Colaboradores para
          no duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative z-10">
        {/* ---------- Bloque superior: editorial + collage ---------- */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[425px_minmax(0,1fr)] lg:gap-[70px]">
          {/* y={0}: este bloque tiene el título navegable (#logistica) — un
              transform de posición todavía sin resolver en el click del
              navbar hacía que el título terminara más abajo de lo calculado
              por Lenis (ver fix-padding-secciones-raiz.md). */}
          <Reveal y={0}>
            <div className="flex items-center gap-4">
              <span
                className="whitespace-nowrap text-[13px] font-bold uppercase text-corp-blue"
                style={{ letterSpacing: "0.18em" }}
              >
                {t("eyebrow")}
              </span>
              <span
                aria-hidden
                className="h-px w-10 shrink-0"
                style={{ background: "linear-gradient(90deg, rgba(7,95,216,0.55), rgba(7,95,216,0))" }}
              />
            </div>

            <h2
              className="mt-6 font-display text-corp-ink"
              style={{
                fontSize: "clamp(34px, 2.95vw, 50px)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontWeight: 600,
              }}
            >
              {t("titleLead")} <span className="text-corp-blue">{t("titleAccent")}</span>
            </h2>

            {/* Subrayado amarillo corto: mismo detalle de marca que Hero/Nosotros */}
            <span
              aria-hidden
              className="mt-5 block h-[3px] w-[46px] rounded-full bg-corp-yellow"
            />

            <p className="mt-7 text-[15.5px] leading-[1.7] md:text-[16px]" style={{ color: "#3A4A5F", maxWidth: "500px" }}>
              {t("lead")}
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <HeroBand alt={t("heroBandAlt")} />
          </Reveal>
        </div>

        {/* ---------- Cuatro etapas: bloques grandes apilados en zigzag ---------- */}
        <LogisticsSteps />

        {/* La barra inferior de diferenciales ("Más de 60 años / Respaldo
            institucional / Estándares internacionales / Cobertura nacional")
            se quitó: repetía exactamente lo que ya cuenta Nosotros (trayectoria,
            respaldo de Grupo Inteca, cobertura). Sin un dato específico y real
            de logística para reemplazarla, mejor sin la barra que duplicando
            contenido. */}

        {/* ---------- Transición hacia Productos ---------- */}
        <button
          type="button"
          onClick={() => scrollTo("#productos")}
          className="mx-auto mt-12 flex min-h-[44px] flex-col items-center justify-center gap-2 text-slate-400 transition hover:text-corp-blue"
        >
          <span className="whitespace-nowrap text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.28em" }}>
            {t("cta")}
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-[18px] w-[18px]" />
          </motion.span>
        </button>
      </Container>
    </section>
  );
}