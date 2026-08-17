"use client";

import { useId } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Boxes, ChevronDown, ChevronRight, Globe2, Ship, Truck, Users } from "lucide-react";
import Reveal, { RevealGroup, RevealItem } from "./Reveal";
import { logisticsSteps } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import heroLogisticaPhoto from "@/public/brand/herologistica.jpg";
import step1Photo from "@/public/brand/1.jpg";
import step2Photo from "@/public/brand/2.almacenamiento.jpg";
import step3Photo from "@/public/brand/3.jpg";
import step4Photo from "@/public/brand/4.jpg";

const statIcons = {
  globe: Globe2,
  ship: Ship,
  boxes: Boxes,
  truck: Truck,
  users: Users,
} as const;

const stepPhotos = {
  "map-world": step1Photo,
  "photo-warehouse": step2Photo,
  "map-cr": step3Photo,
  store: step4Photo,
} as const;

/* ------------------------------------------------------------------ */
/*  Curva azul de apertura + puntos de luz, mismo lenguaje que Nosotros */
/* ------------------------------------------------------------------ */
function LogisticsTopCurve() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 w-full sm:h-32"
      viewBox="0 0 1920 160"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`log-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2F80ED" stopOpacity="0" />
          <stop offset="22%" stopColor="#3A86FF" stopOpacity="0.75" />
          <stop offset="58%" stopColor="#4C90FF" stopOpacity="1" />
          <stop offset="88%" stopColor="#2F80ED" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
        <filter id={`log-curve-glow-${uid}`} x="-10%" y="-300%" width="120%" height="700%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <path
        d="M0,88 C 340,124 700,132 1060,96 C 1380,64 1660,34 1920,64"
        stroke={`url(#log-curve-${uid})`}
        strokeWidth={6}
        strokeLinecap="round"
        filter={`url(#log-curve-glow-${uid})`}
        opacity={0.4}
      />
      <path
        d="M0,88 C 340,124 700,132 1060,96 C 1380,64 1660,34 1920,64"
        stroke={`url(#log-curve-${uid})`}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <circle cx="560" cy="126" r="2.8" fill="#8FBAFF" opacity="0.85" />
      <circle cx="1060" cy="96" r="2.6" fill="#8FBAFF" opacity="0.7" />
      <circle cx="1520" cy="49" r="2.4" fill="#8FBAFF" opacity="0.55" />
    </svg>
  );
}

/* Arco ambiental muy tenue que envuelve el bloque editorial */
function LogisticsArc() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[1] hidden h-[760px] w-[640px] lg:block"
      viewBox="0 0 640 760"
      fill="none"
    >
      <defs>
        <linearGradient id={`log-arc-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A86FF" stopOpacity="0" />
          <stop offset="45%" stopColor="#3A86FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M470,-30 C 300,150 250,420 400,650"
        stroke={`url(#log-arc-${uid})`}
        strokeWidth={1.1}
      />
      <circle cx="404" cy="290" r="3" fill="#7FB2FF" opacity="0.75" />
      <circle cx="330" cy="470" r="2.2" fill="#7FB2FF" opacity="0.5" />
    </svg>
  );
}

/* Puntos decorativos del costado izquierdo */
function LogisticsDots() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-[22%] z-[1] hidden h-[420px] w-[150px] md:block"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(76,144,255,0.5) 1.1px, transparent 1.6px)",
        backgroundSize: "26px 26px",
        maskImage: "linear-gradient(to right, black 0%, transparent 88%)",
        WebkitMaskImage: "linear-gradient(to right, black 0%, transparent 88%)",
        opacity: 0.38,
      }}
    />
  );
}

/* ---------- Banda hero: collage ya compuesto (barco → bodega → camión → tienda) ---------- */
function HeroBand({ alt }: { alt: string }) {
  return (
    <div
      className="relative aspect-[1942/809] w-full overflow-hidden"
      style={{
        borderRadius: "24px",
        border: "1px solid rgba(80,140,255,0.18)",
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.30), 0 0 24px rgba(40,110,255,0.10)",
      }}
    >
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

/* ---------- Foto de apoyo de cada etapa ---------- */
function StepVisual({ visual }: { visual: string }) {
  const src = stepPhotos[visual as keyof typeof stepPhotos];
  return (
    <div
      className="relative h-[132px] w-full overflow-hidden"
      style={{
        borderRadius: "14px",
        border: "1px solid rgba(70,130,255,0.18)",
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 22vw, 45vw"
      />
      {/* velo muy ligero para unificar las cuatro imágenes */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "rgba(4,14,26,0.18)" }}
      />
    </div>
  );
}

/* ---------- Sección principal ---------- */
export default function LogisticsTimeline() {
  const t = useTranslations("Logistics");
  return (
    <section
      id="logistica"
      className="relative overflow-hidden scroll-mt-20 pb-16 pt-24 md:pb-20 md:pt-32"
      style={{
        background:
          "radial-gradient(circle at 78% 18%, rgba(47,128,237,0.07), transparent 46%)",
      }}
    >
      <LogisticsTopCurve />
      <LogisticsDots />

      <div
        className="relative z-10 mx-auto px-5 md:px-8"
        style={{ width: "min(92vw, 1500px)" }}
      >
        <div className="relative">
          <LogisticsArc />

          {/* ---------- Bloque superior: editorial + collage ---------- */}
          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[425px_minmax(0,1fr)] lg:gap-[70px]">
            <Reveal>
              <div className="flex items-center gap-4">
                <span
                  className="whitespace-nowrap text-[13px] font-bold uppercase"
                  style={{ letterSpacing: "0.18em", color: "#3A86FF" }}
                >
                  {t("eyebrow")}
                </span>
                <span
                  aria-hidden
                  className="h-px w-10 shrink-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(58,134,255,0.7), rgba(58,134,255,0))",
                  }}
                />
              </div>

              <h2
                className="mt-6 font-display text-white"
                style={{
                  fontSize: "clamp(34px, 2.95vw, 50px)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.03em",
                  fontWeight: 600,
                }}
              >
                {t("titleLead")}{" "}
                <span style={{ color: "#3A86FF" }}>{t("titleAccent")}</span>
              </h2>

              <p
                className="mt-6 text-[15.5px] leading-[1.7] md:text-[16px]"
                style={{ color: "rgba(255,255,255,0.68)", maxWidth: "500px" }}
              >
                {t("lead")}
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <HeroBand alt={t("heroBandAlt")} />
            </Reveal>
          </div>
        </div>

        {/* ---------- Cuatro etapas ---------- */}
        <RevealGroup className="mt-16 grid grid-cols-1 gap-x-0 gap-y-14 sm:grid-cols-2 lg:mt-[70px] lg:grid-cols-4">
          {logisticsSteps.map((step, i) => (
            <RevealItem
              key={step.step}
              className="relative px-0 lg:px-8 lg:first:pl-0"
            >
              <div className="flex h-full flex-col">
                {/* fila del número + chevron de avance */}
                <div className="flex items-start justify-between">
                  <span
                    className="font-display text-[34px] font-semibold leading-none"
                    style={{ color: "#3A86FF" }}
                  >
                    {step.step}
                  </span>
                  {i < logisticsSteps.length - 1 && (
                    <ChevronRight
                      className="hidden h-[18px] w-[18px] shrink-0 lg:block"
                      style={{ color: "rgba(120,165,255,0.55)" }}
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </div>

                {/* Bloque flexible: absorbe la diferencia de altura entre
                    títulos de 1 y 2 líneas para que las cuatro fotos y sus
                    métricas queden alineadas horizontalmente. */}
                <div className="flex-1">
                  <h3 className="mt-4 text-[19px] font-semibold leading-tight text-white">
                    {t(`steps.${step.key}.title`)}
                  </h3>

                  <p
                    className="mt-3 text-[14px] leading-[1.65]"
                    style={{ color: "rgba(255,255,255,0.62)" }}
                  >
                    {t(`steps.${step.key}.description`)}
                  </p>
                </div>

                <div className="mt-5">
                  <StepVisual visual={step.visual} />
                </div>

                {step.stats.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
                  {step.stats.map((stat) => {
                    const StatIcon = statIcons[stat.icon as keyof typeof statIcons];
                    return (
                      <div key={stat.icon} className="flex items-center gap-2.5">
                        <StatIcon
                          className="h-[19px] w-[19px] shrink-0"
                          style={{ color: "#4C90FF" }}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <div className="leading-tight">
                          <span className="block text-[16px] font-semibold text-white">
                            {stat.value}
                          </span>
                          <span
                            className="mt-0.5 block text-[11.5px]"
                            style={{ color: "rgba(255,255,255,0.48)" }}
                          >
                            {t(`steps.${step.key}.statLabel`)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* separador vertical */}
              {i < logisticsSteps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-0 top-0 hidden h-full w-px lg:block"
                  style={{ background: "rgba(80,130,255,0.14)" }}
                />
              )}
            </RevealItem>
          ))}
        </RevealGroup>

        {/* La barra inferior de diferenciales ("Más de 60 años / Respaldo
            institucional / Estándares internacionales / Cobertura nacional")
            se quitó: repetía exactamente lo que ya cuenta Nosotros (trayectoria,
            respaldo de Grupo Inteca, cobertura). Sin un dato específico y real
            de logística para reemplazarla, mejor sin la barra que duplicando
            contenido. */}

        {/* ---------- Transición hacia Marcas ---------- */}
        <button
          type="button"
          onClick={() => scrollToId("#marcas")}
          className="mx-auto mt-12 flex flex-col items-center gap-2 transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.45)" }}
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
      </div>
    </section>
  );
}
