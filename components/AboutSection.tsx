"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Award, Handshake, Users, Warehouse } from "lucide-react";
import { aboutStats, site } from "@/lib/data";
import cediPhoto from "@/public/brand/Nosotros/ChatGPT Image 25 ago 2026, 10_34_48.png";
import Container from "./Container";
import SoftCurve from "./SoftCurve";

const statIcons = {
  colaboradores: Users,
  trayectoria: Award,
  cedis: Warehouse,
  respaldo: Handshake,
} as const;

const EASE_CORP = [0.22, 0.61, 0.36, 1] as const;

/* Divisores de la banda de métricas: 2 columnas (2x2) por defecto — borde
   arriba en la segunda fila, izquierda entre columnas — y 4 en lg (solo
   borde izquierda, una sola fila). Se resuelve por índice en vez de con
   `divide-*` porque el patrón de bordes cambia de forma distinta en cada
   breakpoint. */
function statDividerClass(i: number) {
  switch (i) {
    case 1:
      return "border-l";
    case 2:
      return "border-t lg:border-t-0 lg:border-l";
    case 3:
      return "border-t border-l lg:border-t-0";
    default:
      return "";
  }
}

/* Rótulo con línea corta al costado */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-4"
    >
      <span
        className="whitespace-nowrap text-[13px] font-bold uppercase text-corp-blue"
        style={{ letterSpacing: "0.18em" }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="h-px w-10 shrink-0"
        style={{ background: "linear-gradient(90deg, rgba(7,95,216,0.55), rgba(7,95,216,0))" }}
      />
    </motion.div>
  );
}

/* Contador que arranca al entrar en pantalla. Sin tamaño de fuente propio:
   lo hereda del <span> que lo envuelve en cada celda de la banda de
   métricas, así el número controla su tipografía desde un solo lugar. */
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
    <span ref={ref} className="tabular-nums">
      {display ?? `${shown.toLocaleString("en-US")}${suffix ?? ""}`}
    </span>
  );
}

export default function AboutSection() {
  const t = useTranslations("About");

  return (
    <section
      id="nosotros"
      // pt subido de 64/80px a 130/150px (ver header-spacing-fix.md): el
      // header real mide ~96px — con 64/80px el título quedaba a solo unos
      // px de aire real bajo el navbar, se sentía pegado al navegar acá
      // directo desde el menú. Mismo valor que el resto de las secciones
      // (About/Brands/Collaborators/Contact/Logistics/Products/Customer
      // Class) para que el espaciado se sienta parejo en todo el sitio.
      className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden pb-16 pt-[130px] md:pb-20 md:pt-[150px]"
      style={{ background: "#F7F3EB" }}
    >
      <Container className="relative z-10">
        {/* ---------- Bloque superior: relato + foto ---------- */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.35fr] lg:gap-[34px]">
          {/* Izquierda */}
          <div>
            <Eyebrow>{t("eyebrow")}</Eyebrow>

            {/* y quitado (antes 22): este es el título de la sección
                navegable (#nosotros) — ver fix-padding-secciones-raiz.md. */}
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_CORP }}
              className="mt-6 font-display text-corp-ink"
              style={{
                fontSize: "clamp(36px, 4vw, 56px)",
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {t.rich("title", {
                accent: (chunks) => <span className="text-corp-blue">{chunks}</span>,
              })}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_CORP }}
              className="mt-7 text-[15.5px] leading-[1.7] md:text-[17px]"
              style={{ color: "#3A4A5F", maxWidth: "620px" }}
            >
              {t.rich("paragraph", {
                parent: site.parentCompany,
                strong: (chunks) => <strong className="font-semibold text-corp-ink">{chunks}</strong>,
              })}
            </motion.p>
          </div>

          {/* Derecha: foto */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE_CORP }}
            className="relative overflow-hidden rounded-[20px] shadow-corp"
          >
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={cediPhoto}
                alt={t("photoAlt")}
                fill
                placeholder="blur"
                className="object-cover object-center"
                sizes="(min-width: 1024px) 60vw, 92vw"
              />
            </div>
          </motion.div>
        </div>

        {/* ---------- Banda de métricas ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_CORP }}
          className="mt-12 grid grid-cols-2 overflow-hidden rounded-[16px] lg:mt-14 lg:grid-cols-4"
          style={{
            border: "1px solid #D8E1EC",
            boxShadow: "0 12px 32px rgba(16,37,63,0.08)",
          }}
        >
          {aboutStats.map((stat, i) => {
            const Icon = statIcons[stat.key as keyof typeof statIcons];
            return (
              <div
                key={stat.key}
                className={`group relative overflow-hidden border-[#E2E8F0] px-4 py-6 transition-colors duration-300 hover:bg-corp-offwhite sm:px-7 sm:py-8 ${statDividerClass(i)}`}
                style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FBFCFD" }}
              >
                {/* Filete superior: aparece en hover, detalle de marca */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-corp-yellow transition-transform duration-400 group-hover:scale-x-100"
                />

                <div className="flex items-start justify-between">
                  <Icon className="h-7 w-7 shrink-0 text-corp-blue/70" strokeWidth={1.4} aria-hidden />
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-corp-yellow opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                </div>

                <div className="mt-5 min-w-0">
                  <span className="block break-words font-display text-[24px] font-bold leading-none text-corp-ink sm:text-[34px] lg:text-[38px]">
                    <StatValue
                      display={"display" in stat ? stat.display : undefined}
                      value={"value" in stat ? stat.value : undefined}
                      suffix={"suffix" in stat ? stat.suffix : undefined}
                    />
                  </span>
                  <p
                    className="mt-3 text-[10.5px] font-semibold uppercase leading-snug text-slate-500"
                    style={{ letterSpacing: "0.12em" }}
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
      </Container>

      <SoftCurve position="bottom" flip />
    </section>
  );
}