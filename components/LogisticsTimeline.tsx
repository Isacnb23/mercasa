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

/* ---------- Banda hero: imagen ya compuesta (barco → bodega → camión → tienda) ---------- */
function HeroBand() {
  return (
    <div className="relative aspect-[1942/809] w-full overflow-hidden rounded-[28px] border border-white/10 shadow-2xl shadow-black/40">
      <Image
        src={heroLogisticaPhoto}
        alt="Cadena logística de Mercasa: importación por barco, almacenamiento en bodega, transporte por camión y punto de venta"
        fill
        priority={false}
        className="object-cover"
        sizes="(min-width: 1280px) 1216px, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 2rem)"
      />
    </div>
  );
}

/* ---------- Foto de apoyo de cada etapa ---------- */
function StepVisual({ visual }: { visual: string }) {
  const src = stepPhotos[visual as keyof typeof stepPhotos];
  return (
    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-white/10 bg-navy-950/70">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 22vw, 45vw"
      />
    </div>
  );
}

/* ---------- Sección principal ---------- */
export default function LogisticsTimeline() {
  return (
    <section id="logistica" className="relative overflow-hidden py-24 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
          <Reveal className="w-full lg:max-w-sm lg:shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
                {logisticsIntro.eyebrow}
              </span>
              <span className="h-px w-10 shrink-0 bg-teal-400/60" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
              {logisticsIntro.titleLead}{" "}
              <span className="text-teal-400">{logisticsIntro.titleAccent}</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-mist-200/70">
              {logisticsIntro.lead}
            </p>
          </Reveal>

          <Reveal delay={0.12} className="w-full lg:flex-1">
            <HeroBand />
          </Reveal>
        </div>

        <RevealGroup className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-x-10">
          {logisticsSteps.map((step, i) => {
            return (
              <RevealItem
                key={step.step}
                className={`relative lg:px-0 ${i > 0 ? "lg:pl-8" : ""}`}
              >
                {i > 0 && (
                  <span className="absolute -left-5 top-[2px] hidden text-white/20 lg:block">
                    <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                )}
                <span className="font-display text-3xl font-semibold text-teal-400/90">
                  {step.step}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-white lg:min-h-[3.5rem]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-mist-200/65 lg:min-h-[8.7rem] xl:min-h-[6.4rem]">
                  {step.description}
                </p>

                <div className="mt-5">
                  <StepVisual visual={step.visual} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {step.stats.map((stat) => {
                    const StatIcon = statIcons[stat.icon as keyof typeof statIcons];
                    return (
                      <div key={stat.label} className="flex items-center gap-2.5">
                        <StatIcon className="h-[18px] w-[18px] shrink-0 text-teal-300/80" strokeWidth={1.6} />
                        <div className="leading-tight">
                          <span className="block font-display text-base font-semibold text-white">
                            {stat.value}
                          </span>
                          <span className="block text-[11px] text-mist-200/55">{stat.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal delay={0.15} className="mt-16 lg:mt-20">
          <div className="grid grid-cols-1 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {logisticsTrustBadges.map((badge) => {
              const BadgeIcon = badgeIcons[badge.icon as keyof typeof badgeIcons];
              return (
                <div key={badge.key} className="flex items-start gap-3.5 p-6">
                  <BadgeIcon className="h-5 w-5 shrink-0 text-teal-300" strokeWidth={1.6} />
                  <p className="text-sm leading-snug text-mist-200/75">
                    <span className="block font-semibold text-white">{badge.title}</span>
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>

        <button
          type="button"
          onClick={() => scrollToId("#marcas")}
          className="mx-auto mt-14 flex flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-mist-200/45 transition hover:text-white"
        >
          Descubra nuestras marcas
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>
      </div>
    </section>
  );
}
