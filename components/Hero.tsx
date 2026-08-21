"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Globe2, Truck, Warehouse } from "lucide-react";
import { heroHighlights, site } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import heroPhoto from "@/public/brand/hero-warehouse.jpg";

const highlightIcons = {
  transito: Globe2,
  infraestructura: Warehouse,
  cobertura: Truck,
} as const;

const EASE_CORP = [0.22, 0.61, 0.36, 1] as const;

export default function Hero() {
  const t = useTranslations("Hero");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const renderHighlightCard = (item: (typeof heroHighlights)[number], extraClassName: string) => {
    const Icon = highlightIcons[item.key as keyof typeof highlightIcons];
    const isAccent = item.key === "infraestructura";
    return (
      <div
        key={item.key}
        className={`rounded-2xl bg-white p-4 ${extraClassName}`}
        style={{ boxShadow: "0 16px 40px rgba(8, 27, 56, 0.16)" }}
      >
        <div className="flex items-start gap-3">
          <span
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
              (isAccent ? "bg-[#FDECD9]" : "bg-[#E3EEFC]")
            }
          >
            <Icon
              className={"h-5 w-5 " + (isAccent ? "text-[#E8620A]" : "text-corp-blue")}
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t(`highlights.${item.key}.label`)}
            </p>
            <p className="mt-1 text-[16px] font-bold leading-snug text-corp-ink">
              {t(`highlights.${item.key}.value`)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative flex min-h-[calc(100svh-72px)] items-center overflow-hidden bg-white md:min-h-[calc(100svh-82px)]"
    >
      {/* Arcos decorativos sutiles: discretos, detrás del texto, no protagonistas */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/2 z-0 hidden h-[780px] w-[780px] -translate-y-1/2 opacity-40 md:block"
        viewBox="0 0 900 900"
        fill="none"
      >
        <circle cx="450" cy="450" r="430" stroke="#C7DCF5" strokeWidth="1.2" />
        <circle cx="450" cy="450" r="355" stroke="#D8E7FA" strokeWidth="1" />
      </svg>

            {/* ---------- Foto: fondo completo, desvanecida a la izquierda, fuerte a la derecha ---------- */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 hidden md:block">
        <Image
          src={heroPhoto}
          alt={t("photoAlt")}
          fill
          priority
          className="object-cover contrast-[1.12] saturate-[1.25] brightness-[1.02]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 34%, rgba(255,255,255,0.82) 48%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.12) 72%, rgba(255,255,255,0) 84%)",
          }}
        />

        {/* Onda inferior: transición orgánica hacia Nosotros. Vive dentro del
            mismo contenedor que la foto (no como hermano aparte) para
            garantizar que comparte exactamente el mismo borde inferior, sin
            posibilidad de una rendija de subpixel entre ambos. */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-[2px] z-[5]" aria-hidden>
          <svg viewBox="0 0 1600 220" preserveAspectRatio="none" className="h-[152px] w-full lg:h-[192px]">
            <path d="M0,170 C500,90 1000,170 1600,110 L1600,222 L0,222 Z" fill="#FFFFFF" />
          </svg>
        </div>
      </motion.div>

      {/* ---------- Contenido ---------- */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto grid w-full max-w-[1380px] items-center gap-10 px-5 py-24 md:grid-cols-[1fr_320px] md:gap-8 md:px-10 md:py-28 lg:gap-16 lg:px-16"
      >
        {/* ----- Columna 1: texto ----- */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CORP }}
            className="mb-8 flex flex-wrap items-center gap-3"
          >
            <span className="whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.14em] text-corp-blue">
              {t("badgeSince", { year: site.foundedYear })}
            </span>
            <span className="text-corp-blue/30">|</span>
            <span className="whitespace-nowrap text-[13.5px] font-medium text-slate-500">
              {t("badgeParent", { parent: site.parentCompany })}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE_CORP }}
            className="font-display text-corp-ink"
            style={{
              fontSize: "clamp(32px, 3.4vw, 50px)",
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              maxWidth: "20ch",
            }}
          >
            {t.rich("title", {
              accent: (chunks) => <span className="text-corp-blue">{chunks}</span>,
            })}
          </motion.h1>

          <motion.span
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.32, ease: EASE_CORP }}
            className="mt-5 block h-[3px] w-[46px] origin-left rounded-full bg-corp-blue"
            aria-hidden
          />

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: EASE_CORP }}
            className="mt-6 text-[15.5px] leading-[1.7]"
            style={{ maxWidth: "420px", color: "#3A4A5F" }}
          >
            {t("paragraph")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_CORP }}
            className="mt-9"
          >
            <button
              type="button"
              onClick={() => scrollToId("#logistica")}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-corp-ink bg-white px-7 py-[13px] text-[14px] font-semibold text-corp-ink transition duration-300 hover:-translate-y-0.5 hover:bg-corp-ink hover:text-white sm:w-auto"
            >
              {t("ctaPrimary")}
              <ChevronRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
            </button>
          </motion.div>

          {/* Foto — mobile: bloque en el flujo normal debajo del texto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE_CORP }}
            className="relative mt-9 aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-corp md:hidden"
          >
            <Image
              src={heroPhoto}
              alt={t("photoAlt")}
              fill
              priority
              className="object-cover contrast-[1.12] saturate-[1.25] brightness-[1.02]"
              sizes="calc(100vw - 40px)"
            />
          </motion.div>

          {/* Métricas — mobile: apiladas y centradas debajo de la foto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE_CORP }}
            className="mt-5 flex flex-col items-center gap-3 md:hidden"
          >
            {heroHighlights.map((item) => renderHighlightCard(item, "w-full max-w-[320px]"))}
          </motion.div>
        </div>

        {/* ----- Columna 2: métricas en tarjetas escalonadas, flotando sobre la foto ----- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE_CORP }}
          className="relative hidden h-[320px] w-[280px] md:block"
        >
          {renderHighlightCard(heroHighlights[0], "absolute left-0 top-0 z-10 w-[250px]")}
          {renderHighlightCard(heroHighlights[1], "absolute left-[62px] top-[104px] z-20 w-[250px]")}
          {renderHighlightCard(heroHighlights[2], "absolute left-[6px] top-[212px] z-10 w-[250px]")}
        </motion.div>
      </motion.div>

      {/* ---------- Indicador de scroll ---------- */}
      <motion.button
        onClick={() => scrollToId("#nosotros")}
        aria-label={t("scrollAria")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="absolute bottom-7 left-1/2 z-20 hidden h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-corp-ink/10 bg-white/85 text-corp-blue shadow-corp backdrop-blur-sm transition hover:bg-white md:flex"
      >
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={1.75} />
        </motion.span>
      </motion.button>
    </section>
  );
}