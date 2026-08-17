"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  Award,
  Baby,
  ChevronDown,
  GlassWater,
  Handshake,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import Reveal from "./Reveal";
import SeamArc from "./SeamArc";
import { brandCategories, brandPillars } from "@/lib/data";
import wallPhoto from "@/public/brand/mercasa-brands-showroom-3d.jpg";

const pillarIcons = {
  calidad: Award,
  alianzas: Handshake,
  compromiso: ShoppingCart,
} as const;

const categoryIcons = {
  alimentos: UtensilsCrossed,
  "bebe-cuidado": Baby,
  "hogar-institucional": Sparkles,
  bebidas: GlassWater,
} as const;

/* Puntos decorativos junto a la columna de texto — mismo lenguaje visual
   que Footer/Contacto (FooterDots/ContactDots), versión local para Marcas. */
function BrandsDots() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-6 top-10 hidden h-[260px] w-[130px] sm:block lg:-left-10"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(59,123,255,0.6) 1.1px, transparent 1.6px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(circle at 30% 50%, black 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle at 30% 50%, black 0%, transparent 75%)",
        opacity: 0.5,
      }}
    />
  );
}

/* Explorador de categorías, cerrado por defecto: fila horizontal de
   categorías (se envuelve en móvil) dentro de un módulo con borde/resplandor
   azul, para quien quiera curiosear qué marcas caen en cada categoría —
   nunca un paso obligatorio para ver el muro de marcas. Vive debajo del
   showroom, ocupando todo el ancho de esa columna. */
function CategoryExplorer() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div
      className="w-full rounded-[18px] border p-[18px]"
      style={{
        borderColor: "rgba(56,140,255,0.28)",
        background:
          "linear-gradient(160deg, rgba(36,104,232,0.10) 0%, rgba(8,20,42,0.4) 100%)",
        boxShadow:
          "0 0 0 1px rgba(56,140,255,0.06), 0 20px 45px -30px rgba(0,0,0,0.7)",
      }}
    >
      <div className="flex items-center gap-2 px-2 pb-3">
        <span
          aria-hidden
          className="h-[6px] w-[6px] rounded-full"
          style={{
            background: "#388CFF",
            boxShadow: "0 0 0 3px rgba(56,140,255,0.22), 0 0 14px 2px rgba(56,140,255,0.5)",
          }}
        />
        <p
          className="text-[11px] font-semibold uppercase"
          style={{ letterSpacing: "0.14em", color: "rgba(221,229,234,0.55)" }}
        >
          Explorar por categoría
        </p>
      </div>

      <div className="flex flex-wrap gap-[10px]">
        {brandCategories.map((cat) => {
          const isOpen = openKey === cat.key;
          const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
          return (
            <div key={cat.key} className="min-w-[220px] flex-1">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : cat.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 rounded-full px-[16px] text-left transition duration-300"
                style={{
                  minHeight: "40px",
                  border: `1px solid ${isOpen ? "rgba(56,140,255,0.55)" : "rgba(255,255,255,0.10)"}`,
                  background: isOpen
                    ? "linear-gradient(120deg, rgba(36,104,232,0.35), rgba(47,128,237,0.22))"
                    : "rgba(8,18,36,0.55)",
                  boxShadow: isOpen ? "0 10px 26px -14px rgba(56,140,255,0.6)" : "none",
                }}
              >
                <span
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isOpen ? "rgba(255,255,255,0.18)" : "rgba(56,140,255,0.16)",
                    color: isOpen ? "#fff" : "#7fb0ff",
                  }}
                >
                  <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span
                  className="flex-1 text-[12.5px] font-medium"
                  style={{ color: isOpen ? "#fff" : "rgba(221,229,234,0.82)" }}
                >
                  {cat.label}
                </span>
                <ChevronDown
                  className="h-[13px] w-[13px] shrink-0 opacity-70 transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <ul className="flex flex-wrap gap-[7px] px-3 pb-3 pt-[10px]">
                      {cat.brands.map((name, i) => (
                        <motion.li
                          key={name}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: i * 0.02 }}
                          className="rounded-full px-[11px] py-[5px] text-[11.5px] font-medium"
                          style={{
                            background: "rgba(255,255,255,0.045)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(221,229,234,0.85)",
                          }}
                        >
                          {name}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BrandsSection() {
  return (
    <section
      id="marcas"
      className="relative overflow-hidden scroll-mt-20 pb-[48px] pt-[40px] sm:pb-[64px]"
      style={{
        background:
          "radial-gradient(circle at 18% 20%, rgba(36,104,232,0.08), transparent 45%)",
      }}
    >
      {/* Ceja/arco que funde el cierre de Logística con el inicio de Marcas —
          el fondo navy es el mismo lienzo compartido (AmbientBackdrop), esta
          línea es puramente decorativa para marcar la costura. */}
      <SeamArc
        flip
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 w-full"
      />
      <div
        className="relative mx-auto px-4 sm:px-6"
        style={{ width: "min(95vw, 1660px)" }}
      >
        <div className="grid grid-cols-1 gap-[34px] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-center lg:gap-[42px]">
          {/* ---------- Columna izquierda: contenido ---------- */}
          <Reveal className="relative">
            <BrandsDots />

            <h2
              className="font-display font-bold text-white"
              style={{
                fontSize: "clamp(52px, 3.1vw, 64px)",
                lineHeight: 0.96,
                letterSpacing: "-0.03em",
              }}
            >
              Marcas que
              <br />
              <span style={{ color: "#388CFF" }}>construyen</span>
              <br />
              <span style={{ color: "#388CFF" }}>confianza</span>
            </h2>

            <p
              className="mt-4 max-w-[320px] text-[15px] leading-[1.65]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Trabajamos con marcas líderes que garantizan calidad, innovación
              y bienestar para nuestros clientes.
            </p>

            <ul className="mt-5 flex flex-col">
              {brandPillars.map((pillar, i) => {
                const Icon = pillarIcons[pillar.key as keyof typeof pillarIcons];
                return (
                  <motion.li
                    key={pillar.key}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: "-40px" }}
                    transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="grid items-start gap-x-4 mt-4 first:mt-0"
                    style={{ gridTemplateColumns: "46px 1fr" }}
                  >
                    <span
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px]"
                      style={{ background: "rgba(56,140,255,0.14)", color: "#7fb0ff" }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
                    </span>
                    <div>
                      <h3
                        className="text-[13px] font-bold uppercase"
                        style={{ letterSpacing: "0.06em", color: "#fff" }}
                      >
                        {pillar.title}
                      </h3>
                      <p
                        className="mt-1 text-[13.5px] leading-[1.4]"
                        style={{ color: "rgba(221,229,234,0.62)" }}
                      >
                        {pillar.description}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </Reveal>

          {/* ---------- Columna derecha: showroom de marcas (foto real, completa, sin recorte) + categorías debajo ---------- */}
          <div className="flex flex-col gap-[24px]">
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 1.02 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: false, margin: "-80px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative block overflow-hidden"
              data-brands-showroom
              style={{
                borderRadius: "28px",
                padding: "5px",
                border: "1px solid rgba(50,125,255,0.60)",
                background: "rgba(8,22,40,0.40)",
                boxShadow:
                  "0 0 0 1px rgba(45,120,255,0.08), 0 0 28px rgba(45,120,255,0.16), 0 24px 65px rgba(0,0,0,0.28)",
              }}
            >
              <Image
                src={wallPhoto}
                alt="Portafolio de marcas distribuidas por Mercasa"
                placeholder="blur"
                sizes="(max-width: 1023px) 100vw, 76vw"
                className="block h-auto w-full rounded-[22px]"
              />
            </motion.div>

            <CategoryExplorer />
          </div>
        </div>
      </div>

      {/* Ceja/arco que funde el cierre de Marcas con el inicio de Contacto */}
      <SeamArc className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 w-full" />
    </section>
  );
}
