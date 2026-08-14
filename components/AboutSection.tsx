"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { Award, Boxes, Globe2, Handshake, Map, Users, Warehouse } from "lucide-react";
import { aboutStats, pillars, site } from "@/lib/data";
import cediPhoto from "@/public/brand/cedi-sunset.jpg";

const statIcons = {
  colaboradores: Users,
  trayectoria: Award,
  cedis: Warehouse,
  respaldo: Handshake,
} as const;

const pillarIcons = {
  compras: Globe2,
  logistica: Warehouse,
  cedis: Boxes,
  red: Map,
} as const;

/* Rótulo con la línea corta al costado, como en la referencia */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-4"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">
        {children}
      </span>
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="h-px w-10 origin-left bg-teal-400/60"
      />
    </motion.div>
  );
}

/* Contador que arranca al entrar en pantalla */
function StatValue({
  display,
  value,
  suffix,
}: {
  display?: string;
  value?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || value === undefined) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span
      ref={ref}
      className="font-display text-3xl font-semibold tabular-nums text-white sm:text-[2.1rem]"
    >
      {display ?? `${shown.toLocaleString("en-US")}${suffix ?? ""}`}
    </span>
  );
}

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["-4%", "8%"]);

  return (
    <section
      id="nosotros"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden"
    >
      {/* Foto del CEDI al atardecer, difuminada hacia el azul */}
      <motion.div
        style={{ y: photoY }}
        className="absolute inset-x-0 top-0 z-0 h-[58%] scale-105 lg:left-auto lg:right-0 lg:w-[72%]"
      >
        <Image
          src={cediPhoto}
          alt="Centro de distribución de Mercasa al atardecer: andenes de carga, tarimas y camión de reparto"
          fill
          placeholder="blur"
          className="object-cover object-center"
          sizes="(min-width: 1024px) 72vw, 100vw"
        />
        {/* se funde con el azul hacia la izquierda y hacia abajo */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/75 via-navy-950/55 to-navy-950 lg:from-navy-950/45 lg:via-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-navy-950 via-navy-950/55 via-30% to-transparent to-62% lg:block" />
      </motion.div>

      {/* ---------- Bloque superior: relato + cifras ---------- */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 md:px-8 md:pt-24">
        <Eyebrow>Nosotros</Eyebrow>

        <motion.h2
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-sm font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:max-w-[26rem] lg:text-[3.4rem]"
        >
          Más de 60 años de respaldo institucional
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-md text-base leading-relaxed text-mist-200/80 lg:max-w-[27rem]"
        >
          Mercasa opera bajo el respaldo de{" "}
          <strong className="font-semibold text-white">{site.parentCompany}</strong>,
          corporación de capital privado fundada en {site.foundedYear} y líder en
          la región. Esa trayectoria nos permite sostener una operación de
          distribución mayorista robusta, confiable y en constante modernización.
        </motion.p>

        {/* Cifras: fila con divisores, sobre el pie de la foto */}
        <div className="mt-14 grid grid-cols-1 gap-y-9 pb-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-y-0">
          {aboutStats.map((stat, i) => {
            const Icon = statIcons[stat.key as keyof typeof statIcons];
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-center gap-5 lg:px-7 ${
                  i === 0 ? "lg:pl-0" : "lg:border-l lg:border-white/15"
                }`}
              >
                <Icon
                  className="h-11 w-11 shrink-0 text-teal-300/90"
                  strokeWidth={1.1}
                  aria-hidden
                />
                <div>
                  <StatValue
                    display={"display" in stat ? stat.display : undefined}
                    value={"value" in stat ? stat.value : undefined}
                    suffix={"suffix" in stat ? stat.suffix : undefined}
                  />
                  <p className="mt-1 max-w-[11rem] text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-mist-200/70">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ---------- Bloque inferior: nuestra operación ---------- */}
      <div className="relative z-10 border-t border-white/10 bg-gradient-to-b from-navy-950/60 via-navy-950/35 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:pb-28 md:pt-14">
          <Eyebrow>Nuestra operación</Eyebrow>

          <div className="mt-12 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0">
            {pillars.map((pillar, i) => {
              const Icon = pillarIcons[pillar.key as keyof typeof pillarIcons];
              return (
                <motion.div
                  key={pillar.key}
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className={`group lg:px-8 ${
                    i === 0 ? "lg:pl-0" : "lg:border-l lg:border-white/10"
                  }`}
                >
                  <Icon
                    className="h-11 w-11 text-teal-300/90 transition duration-500 group-hover:-translate-y-1 group-hover:text-teal-200"
                    strokeWidth={1.1}
                    aria-hidden
                  />
                  <h3 className="mt-7 font-display text-2xl font-semibold leading-tight text-white lg:min-h-[4rem]">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-mist-200/70">
                    {pillar.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
