"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award, Boxes, ChevronDown, ChevronRight, Globe2, Handshake, Map as MapIcon, Ship, Shield, Truck, Users } from "lucide-react";
import Reveal, { RevealGroup, RevealItem } from "./Reveal";
import { logisticsIntro, logisticsSteps, logisticsTrustBadges } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import heroLogisticaPhoto from "@/public/brand/herologistica.jpg";
import step1Photo from "@/public/brand/1.jpg";
import step2Photo from "@/public/brand/2.almacenamiento.jpg";
import step3Photo from "@/public/brand/3.jpg";
import step4Photo from "@/public/brand/4.jpg";

/* Azul eléctrico de énfasis para esta sección — el mismo #3b7bff que ya usa
   SeamArc en las costuras entre secciones, sin tocar los tokens globales. */

const statIcons = {
  globe: Globe2,
  ship: Ship,
  boxes: Boxes,
  truck: Truck,
  users: Users,
} as const;

const badgeIcons = { shield: Shield, handshake: Handshake, award: Award, map: MapIcon } as const;

const stepPhotos = {
  "map-world": step1Photo,
  "photo-warehouse": step2Photo,
  "map-cr": step3Photo,
  store: step4Photo,
} as const;

/* ---------- Curva azul luminosa que atraviesa todo el hero (trayectoria) ---------- */
function HeroCurve() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -top-16 left-0 hidden h-[calc(100%+8rem)] w-full lg:block"
      viewBox="0 0 1600 620"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="logi-curve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
          <stop offset="32%" stopColor="#3b7bff" stopOpacity="0.55" />
          <stop offset="66%" stopColor="#7aa0ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b7bff" stopOpacity="0" />
        </linearGradient>
        <filter id="logi-glow" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* halo difuso ancho */}
      <path
        d="M-40,430 C 340,150 620,70 900,180 C 1180,290 1340,360 1660,220"
        stroke="url(#logi-curve)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.34"
        filter="url(#logi-glow)"
      />
      {/* línea fina brillante */}
      <path
        d="M-40,430 C 340,150 620,70 900,180 C 1180,290 1340,360 1660,220"
        stroke="url(#logi-curve)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

/* ---------- Showcase hero: imagen con los 4 íconos + línea integrados ---------- */
function HeroShowcase() {
  return (
    <div className="group relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[44px] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(59,123,255,0.2),transparent_70%)] blur-3xl"
      />
      <div className="relative aspect-[1942/809] w-full overflow-hidden rounded-[28px] border border-[#3b7bff]/30 shadow-[0_30px_80px_-24px_rgba(2,10,25,0.9),0_0_70px_-28px_rgba(59,123,255,0.6)] ring-1 ring-inset ring-white/[0.05] transition-[border-color,box-shadow] duration-500 group-hover:border-[#3b7bff]/45 group-hover:shadow-[0_30px_90px_-24px_rgba(2,10,25,0.95),0_0_90px_-26px_rgba(59,123,255,0.75)]">
        <Image
          src={heroLogisticaPhoto}
          alt="Cadena logística de Mercasa: importación por barco, almacenamiento en bodega, transporte por camión y punto de venta"
          fill
          priority={false}
          className="object-cover transition-transform duration-[1200ms] ease-out will-change-transform group-hover:scale-[1.02]"
          sizes="(min-width: 1280px) 1050px, (min-width: 768px) calc(100vw - 5rem), calc(100vw - 3rem)"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060f18]/30 via-transparent to-transparent"
        />
      </div>
    </div>
  );
}

/* ---------- Foto de apoyo de cada etapa ---------- */
function StepVisual({ visual }: { visual: string }) {
  const src = stepPhotos[visual as keyof typeof stepPhotos];
  return (
    <div className="group/img relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-navy-950/70 ring-1 ring-inset ring-[#3b7bff]/[0.1] transition-[border-color,box-shadow] duration-500 hover:border-[#3b7bff]/35 hover:shadow-[0_0_30px_-12px_rgba(59,123,255,0.5)]">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover transition-transform duration-[900ms] ease-out will-change-transform group-hover/img:scale-[1.04]"
        sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 92vw"
      />
    </div>
  );
}

/* ---------- Sección principal ---------- */
export default function LogisticsTimeline() {
  return (
    <section id="logistica" className="relative overflow-hidden pt-32 pb-32 md:pt-40 md:pb-44">
      {/* --- Fondo: navy con profundidad + glow azul tras el showcase + puntos --- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_74%_-8%,rgba(19,52,100,0.5),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,32,0.6)_0%,transparent_18%,transparent_82%,rgba(4,12,22,0.7)_100%)]" />
        <div className="absolute right-[-8%] top-[-2%] h-[700px] w-[1000px] rounded-full bg-[radial-gradient(circle_at_58%_38%,rgba(59,123,255,0.18),transparent_62%)] blur-[90px]" />
        <div className="absolute left-0 top-20 h-[520px] w-[480px] opacity-60 [background-image:radial-gradient(circle,rgba(122,160,255,0.22)_1px,transparent_1.6px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_left_top,#000,transparent_72%)]" />
      </div>

      <div className="mx-auto max-w-[104rem] px-6 md:px-10 lg:px-14">
        {/* ====================== HERO ====================== */}
        <div className="relative">
          <HeroCurve />
          <div className="relative flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Entrada por fases: eyebrow → título → texto (stagger) */}
            <RevealGroup className="w-full lg:w-[38%] lg:shrink-0" stagger={0.14}>
              <RevealItem>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7aa0ff]">
                    {logisticsIntro.eyebrow}
                  </span>
                  <span className="h-px w-14 shrink-0 bg-gradient-to-r from-[#3b7bff]/70 to-transparent" />
                </div>
              </RevealItem>
              <RevealItem>
                <h2 className="mt-7 font-display text-[2.6rem] font-semibold leading-[1.07] tracking-tight text-white sm:text-[3.1rem] lg:text-[3.5rem] xl:text-[3.9rem]">
                  El motor detrás de
                  <br />
                  cada <span className="text-[#3b7bff]">entrega</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-mist-200/72">
                  {logisticsIntro.lead}
                </p>
              </RevealItem>
            </RevealGroup>

            <Reveal delay={0.12} className="w-full lg:w-[62%]">
              <HeroShowcase />
            </Reveal>
          </div>
        </div>

        {/* ================= CUATRO ETAPAS (sección editorial continua) ================= */}
        <RevealGroup className="mt-24 grid grid-cols-1 gap-x-0 gap-y-16 sm:grid-cols-2 lg:mt-36 lg:grid-cols-4">
          {logisticsSteps.map((step, i) => (
            <RevealItem
              key={step.step}
              className={`relative ${
                [
                  "sm:pr-7 lg:pr-9",
                  "sm:border-l sm:border-white/[0.09] sm:pl-7 sm:pr-7 lg:pl-9 lg:pr-9",
                  "sm:pr-7 lg:border-l lg:border-white/[0.09] lg:pl-9 lg:pr-9",
                  "sm:border-l sm:border-white/[0.09] sm:pl-7 sm:pr-7 lg:pl-9 lg:pr-9",
                ][i]
              }`}
            >
              {/* fila cabecera: número grande azul + chevron a la derecha */}
              <div className="flex items-center justify-between">
                <span className="font-display text-[3.4rem] font-semibold leading-none text-[#3b7bff]">
                  {step.step}
                </span>
                <ChevronRight className="h-6 w-6 text-[#3b7bff]/45" strokeWidth={2.25} />
              </div>

              <h3 className="mt-6 font-display text-[1.55rem] font-semibold leading-snug text-white lg:min-h-[4.1rem]">
                {step.title}
              </h3>
              <p className="mt-3.5 text-[15px] leading-relaxed text-mist-200/65 lg:min-h-[8rem] xl:min-h-[6.5rem]">
                {step.description}
              </p>

              <div className="mt-7">
                <StepVisual visual={step.visual} />
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3.5">
                {step.stats.map((stat) => {
                  const StatIcon = statIcons[stat.icon as keyof typeof statIcons];
                  return (
                    <div key={stat.label} className="flex items-center gap-3">
                      <StatIcon className="h-5 w-5 shrink-0 text-[#7aa0ff]" strokeWidth={1.6} />
                      <div className="leading-tight">
                        <span className="block font-display text-lg font-semibold text-white">
                          {stat.value}
                        </span>
                        <span className="block text-xs text-mist-200/55">{stat.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* ================= PANEL DE BENEFICIOS ================= */}
        <Reveal delay={0.15} className="mt-24 lg:mt-32">
          <div className="grid grid-cols-1 divide-y divide-white/[0.08] rounded-3xl border border-[#3b7bff]/20 bg-[#0b1a30]/45 backdrop-blur-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {logisticsTrustBadges.map((badge) => {
              const BadgeIcon = badgeIcons[badge.icon as keyof typeof badgeIcons];
              return (
                <div key={badge.key} className="group/badge flex items-start gap-4 px-8 py-8 transition-colors duration-300 hover:bg-[#3b7bff]/[0.05]">
                  <BadgeIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#7aa0ff] transition-transform duration-300 group-hover/badge:-translate-y-0.5" strokeWidth={1.5} />
                  <p className="text-sm leading-snug text-mist-200/72">
                    <span className="mb-1 block text-[15px] font-semibold text-white">{badge.title}</span>
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* ================= TRANSICIÓN A MARCAS ================= */}
        <button
          type="button"
          onClick={() => scrollToId("#marcas")}
          className="mx-auto mt-20 flex flex-col items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-mist-200/45 transition hover:text-white"
        >
          Descubra nuestras marcas
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-[#7aa0ff]" />
          </motion.span>
        </button>
      </div>

      {/* --- Costura inferior: curva azul + degradado que funde con la siguiente sección --- */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#060f18]" />
        <svg className="absolute bottom-8 left-0 h-20 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="logi-seam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b7bff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b7bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,70 C 420,120 1020,10 1440,58" stroke="url(#logi-seam)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
        </svg>
      </div>
    </section>
  );
}
