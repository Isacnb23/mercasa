"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ChevronDown, Globe2, Play, Truck, Warehouse } from "lucide-react";
import { heroHighlights, site } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import heroPhoto from "@/public/brand/hero-warehouse.jpg";

const highlightIcons = {
  transito: Globe2,
  infraestructura: Warehouse,
  cobertura: Truck,
} as const;

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Bodega real, con velo suave para que el texto respire */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 scale-110">
        <Image
          src={heroPhoto}
          alt="Bodega de Mercasa: montacargas moviendo tarimas entre racks de almacenamiento"
          fill
          priority
          className="object-cover brightness-[1.08] contrast-[1.05] saturate-[1.06]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/50 via-48% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-transparent to-navy-950/25" />
      </motion.div>

      {/* Luces de acento, muy sutiles */}
      <motion.div
        className="pointer-events-none absolute left-[6%] top-[26%] z-0 h-64 w-64 rounded-full bg-teal-500/12 blur-3xl"
        animate={{ y: [0, 26, 0], x: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[14%] top-[10%] z-0 h-72 w-72 rounded-full bg-gold-500/8 blur-3xl"
        animate={{ y: [0, -22, 0], x: [0, -18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto grid w-full max-w-7xl gap-14 px-4 pb-28 pt-32 md:grid-cols-[1.1fr_0.9fr] md:items-start md:gap-10 md:px-8 md:pb-32 md:pt-36 lg:gap-16"
      >
        <div className="md:pt-10">
          {/* Badge partido: año + respaldo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-1.5 pr-4 backdrop-blur-md sm:gap-4 sm:pr-5"
          >
            <span className="whitespace-nowrap rounded-full border border-teal-300/40 bg-teal-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-200 sm:px-3.5 sm:text-[11px] sm:tracking-[0.16em]">
              Desde {site.foundedYear}
            </span>
            <span className="h-4 w-px bg-white/20" />
            <span className="whitespace-nowrap text-[12px] font-medium text-mist-200/85 sm:text-[13px]">
              Una empresa de {site.parentCompany}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]"
          >
            <span className="text-teal-300">Líderes</span> en distribución y
            comercialización masiva de productos de consumo en Costa Rica
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-xl text-[15px] leading-[1.8] text-mist-200/75 sm:text-base"
          >
            Importación, logística y distribución mayorista con más de 60 años
            de respaldo institucional. Abastecemos supermercados, retail y
            comercio local en todo el país.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-5"
          >
            <button
              onClick={() => scrollToId("#contacto")}
              className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 px-7 py-3.5 text-sm font-semibold text-navy-950 shadow-[0_14px_38px_-12px_rgba(26,201,191,0.75)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
            >
              Hágase Cliente
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => scrollToId("#nosotros")}
              className="group inline-flex items-center gap-3.5 text-sm font-medium text-mist-200/85 transition hover:text-white"
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] backdrop-blur-md transition duration-300 group-hover:border-teal-300/60 group-hover:bg-white/12">
                <span className="absolute inset-0 animate-ping rounded-full border border-teal-300/25 [animation-duration:2.6s]" />
                <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current text-white" />
              </span>
              Conozca más sobre nosotros
            </button>
          </motion.div>
        </div>

        {/* Tarjeta de datos destacados */}
        <motion.div
          initial={{ opacity: 0, x: 34 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hidden min-w-0 md:block"
        >
          <div className="ml-auto max-w-[25rem] rounded-[28px] border border-white/12 bg-navy-950/55 p-2.5 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            {heroHighlights.map((item, i) => {
              const Icon = highlightIcons[item.key as keyof typeof highlightIcons];
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.55 + i * 0.14,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group flex items-center gap-5 rounded-2xl px-5 py-5 transition duration-300 hover:bg-white/[0.05] ${
                    i > 0 ? "border-t border-white/8" : ""
                  }`}
                >
                  <Icon
                    className="h-9 w-9 shrink-0 text-teal-300/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:text-teal-200"
                    strokeWidth={1.15}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[13px] leading-tight text-mist-200/65">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-white">
                      {item.value}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      <motion.button
        onClick={() => scrollToId("#nosotros")}
        aria-label="Desplazarse hacia abajo"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-mist-200/50 transition hover:text-white"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="h-6 w-6" />
      </motion.button>
    </section>
  );
}
