"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, Ship, Warehouse, Truck, Store } from "lucide-react";
import Container from "./Container";
import Reveal, { RevealGroup, RevealItem } from "./Reveal";
import SoftCurve from "./SoftCurve";
import { logisticsSteps } from "@/lib/data";
import { useScrollTo } from "@/lib/hooks/useScrollTo";
import heroLogisticaPhoto from "@/public/brand/herologistica.jpg";

const stepIcons = {
  ship: Ship,
  warehouse: Warehouse,
  truck: Truck,
  store: Store,
} as const;

// Un solo azul de marca para las 4 cards (antes cada paso tenía su propio
// color — desentonaba con la paleta monocromática de Mercasa).
const STEP_ACCENT = "#0C447C";
const STEP_ACCENT_BG = "#E6F1FB";

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
      className="relative overflow-hidden scroll-mt-20 pb-16 pt-24 md:pb-20 md:pt-32"
      style={{ background: "#F7F3EB" }}
    >
      {/* El seam Nosotros → Logística ya lo marca la curva inferior de
          Nosotros; acá solo se agrega la de salida hacia Marcas para no
          duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative z-10">
        {/* ---------- Bloque superior: editorial + collage ---------- */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[425px_minmax(0,1fr)] lg:gap-[70px]">
          <Reveal once>
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

          <Reveal delay={0.12} once>
            <HeroBand alt={t("heroBandAlt")} />
          </Reveal>
        </div>

        {/* ---------- Cuatro etapas: tarjetas con más carácter ---------- */}
        <div className="relative mt-16 lg:mt-[70px]">
          {/* Línea de flujo punteada: conecta los 4 pasos a la altura de sus
              badges, detrás de las cards (z-0, las cards opacas la tapan
              excepto en el gap entre ellas). Solo desde lg, que es donde el
              grid es una sola fila de 4 — en mobile/tablet (2 columnas) no
              hay una fila única a la que conectar. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-0 hidden lg:block"
            style={{ top: "42px", borderTop: "2px dashed #C7D4E3" }}
          />

          <RevealGroup once stagger={0.09} className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {logisticsSteps.map((step) => {
              const StepIcon = stepIcons[step.icon as keyof typeof stepIcons];
              return (
                <RevealItem
                  key={step.step}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_10px_28px_rgba(16,37,63,0.07)] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(16,37,63,0.14)]"
                >
                  {/* Barra de acento superior: mismo azul de marca en las 4
                      cards, para reforzar que son 4 etapas de UN proceso. */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: STEP_ACCENT }}
                  />

                  <div className="flex items-center justify-between gap-3">
                    {/* Badge rectangular (antes círculo): texto en el azul de
                        marca sobre un fondo tenue del mismo tono. */}
                    <span
                      className="inline-flex w-fit items-center rounded-lg px-3 py-1 font-display text-[13px] font-bold transition-transform duration-300 group-hover:scale-105"
                      style={{ background: STEP_ACCENT_BG, color: STEP_ACCENT }}
                    >
                      {step.step}
                    </span>

                    <StepIcon
                      aria-hidden
                      className="h-6 w-6 shrink-0"
                      strokeWidth={1.75}
                      style={{ color: STEP_ACCENT }}
                    />
                  </div>

                  <h3 className="mt-5 text-[19px] font-semibold leading-tight text-corp-ink">
                    {t(`steps.${step.key}.title`)}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.65]" style={{ color: "#3A4A5F" }}>
                    {t(`steps.${step.key}.description`)}
                  </p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>

        {/* La barra inferior de diferenciales ("Más de 60 años / Respaldo
            institucional / Estándares internacionales / Cobertura nacional")
            se quitó: repetía exactamente lo que ya cuenta Nosotros (trayectoria,
            respaldo de Grupo Inteca, cobertura). Sin un dato específico y real
            de logística para reemplazarla, mejor sin la barra que duplicando
            contenido. */}

        {/* ---------- Transición hacia Marcas ---------- */}
        <button
          type="button"
          onClick={() => scrollTo("#marcas")}
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