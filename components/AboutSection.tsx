"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Award, Handshake, Users, Warehouse } from "lucide-react";
import { aboutStats, site } from "@/lib/data";
import cediPhoto from "@/public/brand/cedi-sunset.jpg";

const statIcons = {
  colaboradores: Users,
  trayectoria: Award,
  cedis: Warehouse,
  respaldo: Handshake,
} as const;

/* ------------------------------------------------------------------ */
/*  Curva azul luminosa que abre la sección: trazo fino + halo suave    */
/*  y pequeños puntos de luz integrados sobre la trayectoria.           */
/* ------------------------------------------------------------------ */
function AboutTopCurve() {
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
        <linearGradient id={`about-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2F80ED" stopOpacity="0" />
          <stop offset="20%" stopColor="#3A86FF" stopOpacity="0.8" />
          <stop offset="55%" stopColor="#4C90FF" stopOpacity="1" />
          <stop offset="86%" stopColor="#2F80ED" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
        <filter id={`about-curve-glow-${uid}`} x="-10%" y="-300%" width="120%" height="700%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* halo */}
      <path
        d="M0,104 C 320,44 660,20 1020,52 C 1360,82 1640,120 1920,84"
        stroke={`url(#about-curve-${uid})`}
        strokeWidth={6}
        strokeLinecap="round"
        filter={`url(#about-curve-glow-${uid})`}
        opacity={0.45}
      />
      {/* trazo nítido */}
      <path
        d="M0,104 C 320,44 660,20 1020,52 C 1360,82 1640,120 1920,84"
        stroke={`url(#about-curve-${uid})`}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      {/* puntos de luz sobre la trayectoria */}
      <circle cx="470" cy="45" r="3" fill="#8FBAFF" opacity="0.9" />
      <circle cx="1020" cy="52" r="2.6" fill="#8FBAFF" opacity="0.75" />
      <circle cx="1520" cy="99" r="2.4" fill="#8FBAFF" opacity="0.6" />
    </svg>
  );
}

/* Puntos decorativos azules en el costado izquierdo */
function AboutDots() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-[16%] z-[1] hidden h-[420px] w-[170px] md:block"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(76,144,255,0.55) 1.1px, transparent 1.6px)",
        backgroundSize: "26px 26px",
        maskImage: "linear-gradient(to right, black 0%, transparent 88%)",
        WebkitMaskImage: "linear-gradient(to right, black 0%, transparent 88%)",
        opacity: 0.4,
      }}
    />
  );
}

/* Rótulo con línea corta al costado */
function Eyebrow({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  const line = (
    <span
      aria-hidden
      className="h-px w-10 shrink-0"
      style={{ background: "linear-gradient(90deg, rgba(62,134,255,0.7), rgba(62,134,255,0))" }}
    />
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className={`flex items-center gap-4 ${centered ? "justify-center" : ""}`}
    >
      {centered && (
        <span
          aria-hidden
          className="h-px w-10 shrink-0"
          style={{ background: "linear-gradient(270deg, rgba(62,134,255,0.7), rgba(62,134,255,0))" }}
        />
      )}
      <span
        className="whitespace-nowrap text-[13px] font-bold uppercase"
        style={{ letterSpacing: "0.18em", color: "#3E86FF" }}
      >
        {children}
      </span>
      {line}
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
  const inView = useInView(ref, { once: false, margin: "-40px" });
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
      className="block font-display text-[27px] font-semibold leading-none tabular-nums text-white lg:text-[30px]"
    >
      {display ?? `${shown.toLocaleString("en-US")}${suffix ?? ""}`}
    </span>
  );
}

export default function AboutSection() {
  const t = useTranslations("About");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  return (
    <section
      id="nosotros"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden pb-16 pt-24 md:pb-20 md:pt-32"
      style={{
        background:
          "radial-gradient(circle at 22% 26%, rgba(47,128,237,0.07), transparent 46%)",
      }}
    >
      <AboutTopCurve />
      <AboutDots />

      <div className="relative z-10 mx-auto px-5 md:px-8" style={{ width: "min(92vw, 1500px)" }}>
        {/* ---------- Bloque superior: relato + foto ---------- */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.35fr] lg:gap-[34px]">
          {/* Izquierda */}
          <div>
            <Eyebrow>{t("eyebrow")}</Eyebrow>

            <motion.h2
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 font-display text-white"
              style={{
                fontSize: "clamp(40px, 4.8vw, 82px)",
                lineHeight: 0.98,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              {t.rich("title", {
                accent: (chunks) => <span style={{ color: "#3A86FF" }}>{chunks}</span>,
              })}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 text-[15.5px] leading-[1.75] md:text-[17px]"
              style={{ color: "rgba(255,255,255,0.76)", maxWidth: "620px" }}
            >
              {t.rich("paragraph", {
                parent: site.parentCompany,
                strong: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
              })}
            </motion.p>
          </div>

          {/* Derecha: foto en panel premium */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden"
            style={{
              borderRadius: "26px",
              border: "1px solid rgba(70,130,255,0.18)",
              boxShadow:
                "0 16px 45px rgba(0,0,0,0.28), 0 0 18px rgba(60,120,255,0.08)",
            }}
          >
            <motion.div style={{ y: photoY }} className="relative aspect-[16/10] w-full scale-105">
              <Image
                src={cediPhoto}
                alt={t("photoAlt")}
                fill
                placeholder="blur"
                className="object-cover object-center"
                sizes="(min-width: 1024px) 60vw, 92vw"
              />
            </motion.div>
            {/* velo muy leve para integrarla al navy sin apagarla */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(3,20,38,0.18) 0%, rgba(3,20,38,0) 35%, rgba(3,20,38,0.26) 100%)",
              }}
            />
          </motion.div>
        </div>

        {/* ---------- Banda de métricas ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4"
          style={{
            background: "rgba(12,22,40,0.58)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(90,140,255,0.12)",
            borderRadius: "22px",
            boxShadow:
              "0 14px 35px rgba(0,0,0,0.22), 0 0 14px rgba(60,120,255,0.08)",
          }}
        >
          {aboutStats.map((stat, i) => {
            const Icon = statIcons[stat.key as keyof typeof statIcons];
            return (
              <div
                key={stat.key}
                className="flex items-center gap-4 px-6 py-6 lg:px-7 lg:py-7"
                style={
                  i > 0
                    ? { borderLeft: "1px solid rgba(255,255,255,0.07)" }
                    : undefined
                }
              >
                <Icon
                  className="h-9 w-9 shrink-0"
                  style={{ color: "#4C90FF" }}
                  strokeWidth={1.2}
                  aria-hidden
                />
                <div className="min-w-0">
                  <StatValue
                    display={"display" in stat ? stat.display : undefined}
                    value={"value" in stat ? stat.value : undefined}
                    suffix={"suffix" in stat ? stat.suffix : undefined}
                  />
                  <p
                    className="mt-2 text-[10.5px] font-semibold uppercase leading-snug"
                    style={{ letterSpacing: "0.12em", color: "rgba(255,255,255,0.62)" }}
                  >
                    {t(`stats.${stat.key}.label`)}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* La operación (importación → almacenamiento → distribución → punto de
            venta) se detalla por completo en la sección Logística; aquí ya no se
            repite ese recorrido para no duplicar contenido. "Nosotros" queda
            enfocado en identidad: trayectoria, respaldo y cifras institucionales. */}
      </div>
    </section>
  );
}
