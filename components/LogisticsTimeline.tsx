"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Boxes, ChevronDown, Globe2, Ship, Truck, Users } from "lucide-react";
import Reveal, { RevealGroup, RevealItem } from "./Reveal";
import SoftCurve from "./SoftCurve";
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

/* ---------- Foto de apoyo de cada etapa ---------- */
function StepVisual({ visual }: { visual: string }) {
  const src = stepPhotos[visual as keyof typeof stepPhotos];
  return (
    <div
      className="relative h-[140px] w-full overflow-hidden rounded-[14px]"
      style={{
        border: "1px solid #E8DFC8",
        boxShadow: "0 10px 26px -14px rgba(16,37,63,0.22)",
      }}
    >
      <Image src={src} alt="" fill className="object-cover" sizes="(min-width: 1024px) 22vw, 45vw" />
      {/* Overlay tibio consistente: unifica la temperatura de color entre
          fotos de distinto origen (real vs. render) para que las 4 se
          sientan de la misma sesión, aunque no lo sean. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,43,92,0.06) 0%, rgba(8,43,92,0) 35%, rgba(8,43,92,0.14) 100%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
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
      style={{ background: "#F7F3EB" }}
    >
      {/* El seam Nosotros → Logística ya lo marca la curva inferior de
          Nosotros; acá solo se agrega la de salida hacia Marcas para no
          duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <div className="relative z-10 mx-auto px-5 md:px-8" style={{ width: "min(92vw, 1500px)" }}>
        {/* ---------- Bloque superior: editorial + collage ---------- */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[425px_minmax(0,1fr)] lg:gap-[70px]">
          <Reveal>
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

        {/* ---------- Cuatro etapas: tarjetas con más carácter ---------- */}
        <RevealGroup className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-[70px] lg:grid-cols-4">
          {logisticsSteps.map((step) => (
            <RevealItem
              key={step.step}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_10px_28px_rgba(16,37,63,0.07)] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(16,37,63,0.14)]"
            >
              {/* Filete superior en hover: mismo lenguaje que la banda de Nosotros */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-corp-yellow transition-transform duration-400 group-hover:scale-x-100"
              />

              {/* Número dentro de un círculo, en vez de suelto: más ancla visual */}
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full font-display text-[17px] font-bold text-corp-blue transition-transform duration-300 group-hover:scale-105"
                style={{ background: "#E6F1FB" }}
              >
                {step.step}
              </span>

              {/* Bloque flexible: absorbe la diferencia de altura entre
                  títulos de 1 y 2 líneas para que las cuatro fotos y sus
                  métricas queden alineadas horizontalmente. */}
              <div className="flex-1">
                <h3 className="mt-5 text-[19px] font-semibold leading-tight text-corp-ink">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.65]" style={{ color: "#3A4A5F" }}>
                  {t(`steps.${step.key}.description`)}
                </p>
              </div>

              <div className="mt-5">
                <StepVisual visual={step.visual} />
              </div>

              {step.stats.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-t pt-4" style={{ borderColor: "#E2E8F0" }}>
                  {step.stats.map((stat) => {
                    const StatIcon = statIcons[stat.icon as keyof typeof statIcons];
                    return (
                      <div key={stat.icon} className="flex items-center gap-2.5">
                        <StatIcon className="h-[18px] w-[18px] shrink-0 text-corp-blue/70" strokeWidth={1.5} aria-hidden />
                        <div className="leading-tight">
                          <span className="block text-[16px] font-semibold text-corp-ink">{stat.value}</span>
                          <span className="mt-0.5 block text-[11.5px] text-slate-500">
                            {t(`steps.${step.key}.statLabel`)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          className="mx-auto mt-12 flex flex-col items-center gap-2 text-slate-400 transition hover:text-corp-blue"
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