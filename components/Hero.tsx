"use client";

import { useId, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, Boxes, Truck, Warehouse } from "lucide-react";
import { heroHighlights, site } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import heroPhoto from "@/public/brand/hero-warehouse.jpg";

const highlightIcons = {
  transito: Boxes,
  infraestructura: Warehouse,
  cobertura: Truck,
} as const;

/* ------------------------------------------------------------------ */
/*  Curvas decorativas laterales: arcos finos azules que envuelven el   */
/*  bloque de texto, como trayectorias. Puramente decorativas.          */
/* ------------------------------------------------------------------ */
function HeroArcs() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2] hidden h-full w-full md:block"
      viewBox="0 0 1500 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id={`hero-arc-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A8DFF" stopOpacity="0" />
          <stop offset="40%" stopColor="#4A8DFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
        <filter id={`hero-arc-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Arco grande que rodea el titular */}
      <path
        d="M690,-40 C 520,240 512,520 660,760 C 740,900 860,980 1000,1040"
        stroke={`url(#hero-arc-${uid})`}
        strokeWidth={5}
        filter={`url(#hero-arc-glow-${uid})`}
        opacity={0.5}
      />
      <path
        d="M690,-40 C 520,240 512,520 660,760 C 740,900 860,980 1000,1040"
        stroke={`url(#hero-arc-${uid})`}
        strokeWidth={1.1}
        opacity={0.9}
      />

      {/* Arco interior, más corto y tenue */}
      <path
        d="M540,80 C 452,300 470,560 600,742"
        stroke={`url(#hero-arc-${uid})`}
        strokeWidth={1}
        opacity={0.45}
      />

      {/* Puntos de luz sobre la trayectoria */}
      <circle cx="608" cy="228" r="3" fill="#7FB2FF" opacity="0.85" />
      <circle cx="527" cy="470" r="2.4" fill="#7FB2FF" opacity="0.6" />
      <circle cx="662" cy="768" r="2.6" fill="#7FB2FF" opacity="0.7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Curva azul inferior: línea fina orgánica con halo, recorriendo el   */
/*  cierre del hero de lado a lado. Baja y angosta (h-14/h-20, pegada   */
/*  al borde inferior) para que quede claramente por debajo del texto  */
/*  del hero — nunca cruzándolo — sin importar cuántas líneas ocupe el  */
/*  título/párrafo en cada idioma (ver nota en maxWidth del H1 abajo).  */
/* ------------------------------------------------------------------ */
function HeroBottomCurve() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-14 w-full sm:h-20"
      viewBox="0 0 1920 200"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`hero-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#367CFF" stopOpacity="0" />
          <stop offset="18%" stopColor="#4A8DFF" stopOpacity="0.85" />
          <stop offset="52%" stopColor="#6BA5FF" stopOpacity="1" />
          <stop offset="85%" stopColor="#367CFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
        <filter id={`hero-curve-glow-${uid}`} x="-10%" y="-300%" width="120%" height="700%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* halo */}
      <path
        d="M0,142 C 300,80 620,54 980,86 C 1320,116 1620,158 1920,120"
        stroke={`url(#hero-curve-${uid})`}
        strokeWidth={7}
        strokeLinecap="round"
        filter={`url(#hero-curve-glow-${uid})`}
        opacity={0.5}
      />
      {/* trazo nítido */}
      <path
        d="M0,142 C 300,80 620,54 980,86 C 1320,116 1620,158 1920,120"
        stroke={`url(#hero-curve-${uid})`}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* segunda línea, más tenue, para dar profundidad */}
      <path
        d="M0,162 C 340,106 660,78 1010,108 C 1350,138 1640,174 1920,142"
        stroke={`url(#hero-curve-${uid})`}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}

export default function Hero() {
  const t = useTranslations("Hero");
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
      /* El header sticky ocupa ~70px por encima: se descuentan para que
         navbar + hero midan exactamente una pantalla y la etiqueta inferior
         quede siempre visible sin scroll. */
      className="relative flex min-h-[calc(100svh-64px)] items-center overflow-hidden md:min-h-[calc(100svh-72px)]"
    >
      {/* ---------- Fondo: bodega real ---------- */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 scale-110">
        <Image
          src={heroPhoto}
          alt={t("photoAlt")}
          fill
          priority
          className="object-cover brightness-[1.06] contrast-[1.06] saturate-[1.05]"
          sizes="100vw"
        />
        {/* Velo navy general: la foto queda dentro del ambiente oscuro */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(3,20,38,0.55) 0%, rgba(7,27,50,0.30) 42%, rgba(3,17,32,0.72) 100%)" }}
        />
      </motion.div>

      {/* ---------- Volumen curvo oscuro del lado izquierdo ----------
          Elipse gigante anclada a la izquierda: da el "gran volumen navy
          envolvente" de la referencia, con borde difuso hacia el centro
          (no un rectángulo). Va fuera del contenedor con parallax para que
          quede fija respecto a la sección. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-full md:w-[78%] lg:w-[72%]"
        style={{
          background:
            "radial-gradient(125% 118% at 12% 50%, #031426 0%, rgba(4,20,38,0.94) 38%, rgba(6,24,44,0.72) 58%, rgba(7,27,50,0.30) 78%, transparent 100%)",
        }}
      />
      {/* Refuerzo lateral: el borde izquierdo siempre llega a navy sólido */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[38%]"
        style={{
          background: "linear-gradient(90deg, #031426 0%, rgba(3,20,38,0.55) 55%, transparent 100%)",
        }}
      />

      {/* Glow azul ambiental, muy suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[4%] top-[18%] z-[1] h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(47,128,237,0.16), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-[6%] z-[1] h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(74,141,255,0.10), transparent 70%)" }}
      />

      {/* Trama de puntos muy discreta en el extremo izquierdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-[14%] z-[2] hidden h-[380px] w-[190px] md:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(94,150,255,0.55) 1.1px, transparent 1.6px)",
          backgroundSize: "26px 26px",
          maskImage: "linear-gradient(to right, black 0%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to right, black 0%, transparent 88%)",
          opacity: 0.42,
        }}
      />

      <HeroArcs />

      {/* Costura con la siguiente sección */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-40 bg-gradient-to-b from-transparent to-navy-950 md:h-56" />

      <HeroBottomCurve />

      {/* ---------- Contenido ---------- */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto grid w-full max-w-[1500px] items-start gap-12 px-5 pb-32 pt-24 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-10 md:pb-32 md:pt-28 lg:gap-16 lg:px-14"
      >
        {/* ----- Columna izquierda ----- */}
        <div>
          {/* Microencabezado: pill azul + respaldo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7 flex flex-wrap items-center gap-4"
          >
            <span
              className="whitespace-nowrap rounded-full px-4 py-[7px] text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{
                color: "#6BA5FF",
                border: "1px solid rgba(74,141,255,0.45)",
                background: "rgba(47,128,237,0.10)",
                boxShadow: "0 0 22px -6px rgba(74,141,255,0.55)",
              }}
            >
              {t("badgeSince", { year: site.foundedYear })}
            </span>
            <span className="whitespace-nowrap text-[13.5px] font-medium text-white/70">
              {t("badgeParent", { parent: site.parentCompany })}
            </span>
          </motion.div>

          {/* Titular — <accent> es un tag de rich text (t.rich): permite que
              cada idioma resalte su propio fragmento en azul sin forzar la
              MISMA estructura de frase/salto de línea que el español
              (traducciones naturales tienen largos de palabra distintos).
              maxWidth en "ch" estaba en 17 (ajustado a mano para las 4 líneas
              cortas del español) — con la traducción al inglés, una frase más
              larga en la misma columna angosta se partía en muchas más
              líneas de lo previsto y el párrafo terminaba empujado hacia
              abajo, hasta cruzar la curva decorativa del cierre del hero.
              23ch da lugar de sobra para ambos idiomas sin perder el aire de
              titular editorial. */}
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-white"
            style={{
              fontSize: "clamp(40px, 4.6vw, 74px)",
              lineHeight: 0.99,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              maxWidth: "23ch",
            }}
          >
            {t.rich("title", {
              accent: (chunks) => <span style={{ color: "#367CFF" }}>{chunks}</span>,
            })}
          </motion.h1>

          {/* Párrafo */}
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 text-[15.5px] leading-[1.7] md:text-[16.5px]"
            style={{ color: "rgba(255,255,255,0.78)", maxWidth: "590px" }}
          >
            {t("paragraph")}
          </motion.p>
        </div>

        {/* ----- Panel de métricas (glassmorphism) ----- */}
        <motion.div
          initial={{ opacity: 0, x: 34 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hidden min-w-0 md:block md:pt-16 lg:pt-20"
        >
          <div
            className="ml-auto w-full max-w-[420px] p-3"
            style={{
              background:
                "linear-gradient(160deg, rgba(16,30,55,0.80) 0%, rgba(9,20,38,0.72) 100%)",
              backdropFilter: "blur(18px) saturate(120%)",
              WebkitBackdropFilter: "blur(18px) saturate(120%)",
              border: "1px solid rgba(120,160,255,0.28)",
              borderRadius: "28px",
              boxShadow:
                "0 22px 60px rgba(0,0,0,0.50), 0 0 28px rgba(60,120,255,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
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
                  className="group flex items-center gap-5 rounded-2xl px-5 py-[22px] transition duration-300 hover:bg-white/[0.04]"
                  style={
                    i > 0
                      ? { borderTop: "1px solid rgba(255,255,255,0.07)" }
                      : undefined
                  }
                >
                  <Icon
                    className="h-[30px] w-[30px] shrink-0 transition duration-300 group-hover:-translate-y-0.5"
                    style={{ color: "#8FB8FF" }}
                    strokeWidth={1.3}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[13px] leading-tight text-white/55">
                      {t(`highlights.${item.key}.label`)}
                    </p>
                    <p className="mt-1.5 text-[16.5px] font-semibold leading-snug text-white">
                      {t(`highlights.${item.key}.value`)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* ---------- Etiqueta inferior centrada ---------- */}
      <motion.button
        onClick={() => scrollToId("#nosotros")}
        aria-label={t("scrollAria")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 transition hover:text-white"
        style={{ color: "rgba(255,255,255,0.42)" }}
      >
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.34em]">
          {t("scrollLabel")}
        </span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </motion.button>
    </section>
  );
}
