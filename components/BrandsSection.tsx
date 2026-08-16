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
import wallPhoto from "@/public/brand/mercasa-brands-showroom-3d.png";

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

/* Explorador de categorías, cerrado por defecto: filas tipo acordeón
   (no chips) dentro de un módulo con borde/resplandor azul, para quien
   quiera curiosear qué marcas caen en cada categoría — nunca un paso
   obligatorio para ver el muro de marcas. */
function CategoryExplorer() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div
      className="w-full rounded-[22px] border p-[22px] md:p-[26px]"
      style={{
        borderColor: "rgba(56,140,255,0.28)",
        background:
          "linear-gradient(160deg, rgba(36,104,232,0.10) 0%, rgba(8,20,42,0.4) 100%)",
        boxShadow:
          "0 0 0 1px rgba(56,140,255,0.06), 0 24px 55px -34px rgba(0,0,0,0.72)",
      }}
    >
      <div className="mb-[16px] flex items-center gap-2.5 px-1">
        <span
          aria-hidden
          className="h-[7px] w-[7px] rounded-full"
          style={{
            background: "#388CFF",
            boxShadow: "0 0 0 3px rgba(56,140,255,0.22), 0 0 14px 2px rgba(56,140,255,0.5)",
          }}
        />
        <p
          className="text-[12.5px] font-semibold uppercase"
          style={{ letterSpacing: "0.16em", color: "rgba(221,229,234,0.6)" }}
        >
          Explorar por categoría
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
        {brandCategories.map((cat) => {
          const isOpen = openKey === cat.key;
          const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
          return (
            <div key={cat.key}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : cat.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3.5 rounded-[16px] px-[18px] text-left transition duration-300 hover:-translate-y-px"
                style={{
                  minHeight: "58px",
                  border: `1px solid ${isOpen ? "rgba(56,140,255,0.55)" : "rgba(255,255,255,0.12)"}`,
                  background: isOpen
                    ? "linear-gradient(120deg, rgba(36,104,232,0.35), rgba(47,128,237,0.22))"
                    : "rgba(8,18,36,0.55)",
                  boxShadow: isOpen ? "0 12px 30px -14px rgba(56,140,255,0.6)" : "none",
                }}
              >
                <span
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
                  style={{
                    background: isOpen ? "rgba(255,255,255,0.18)" : "rgba(56,140,255,0.16)",
                    color: isOpen ? "#fff" : "#7fb0ff",
                  }}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={1.7} aria-hidden />
                </span>
                <span
                  className="flex-1 text-[15px] font-medium"
                  style={{ color: isOpen ? "#fff" : "rgba(221,229,234,0.85)" }}
                >
                  {cat.label}
                </span>
                <ChevronDown
                  className="h-[17px] w-[17px] shrink-0 opacity-70 transition-transform duration-300"
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
                    <ul className="flex flex-wrap gap-[8px] px-2 pb-2 pt-[12px]">
                      {cat.brands.map((name, i) => (
                        <motion.li
                          key={name}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: i * 0.02 }}
                          className="rounded-full px-[13px] py-[6px] text-[12.5px] font-medium"
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
        <div className="grid grid-cols-1 gap-[34px] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-start lg:gap-[42px]">
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

          {/* ---------- Columna derecha: showroom + barra inferior ---------- */}
          <div className="relative flex flex-col gap-[22px]">
            {/* Curva azul con puntos que emerge del gap y llega a la esquina
                superior-izquierda del showroom — conexión tecnológica, como en
                la referencia. Localizada aquí para que quede claramente visible
                (no detrás del contenido). */}
            <svg
              aria-hidden
              className="pointer-events-none absolute -left-[92px] -top-7 z-20 hidden h-[180px] w-[400px] lg:block"
              viewBox="0 0 400 180"
              fill="none"
            >
              <defs>
                <linearGradient id="brands-curve" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
                  <stop offset="38%" stopColor="#3b7bff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#9cc0ff" stopOpacity="0.95" />
                </linearGradient>
                <filter id="brands-curve-glow" x="-20%" y="-40%" width="140%" height="200%">
                  <feGaussianBlur stdDeviation="4.5" />
                </filter>
              </defs>
              <path
                d="M8,160 C 96,128 150,126 250,96 C 322,74 352,70 390,66"
                stroke="url(#brands-curve)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.45"
                filter="url(#brands-curve-glow)"
              />
              <path
                d="M8,160 C 96,128 150,126 250,96 C 322,74 352,70 390,66"
                stroke="url(#brands-curve)"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.95"
              />
              <circle cx="390" cy="66" r="4.5" fill="#dbe7ff">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                <animate attributeName="r" values="3.6;5;3.6" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="390" cy="66" r="10" fill="none" stroke="#9cc0ff" strokeWidth="1" opacity="0.4" />
            </svg>

            {/* SHOWROOM: marco físico (bezel azul + glow), mural brillante y completo */}
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.985 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="group relative"
              data-brands-showroom
            >
              {/* Capa lejana: glow amplio y difuso que sangra hacia el fondo. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-16 rounded-[72px]"
                style={{
                  background:
                    "radial-gradient(52% 52% at 50% 42%, rgba(50,115,235,0.26), transparent 70%)",
                  filter: "blur(82px)",
                }}
              />
              {/* Capa cercana: filo azul luminoso que se disuelve en el navy —
                  hace que el borde se funda con el fondo en vez de cortar seco. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-[3px] rounded-[34px]"
                style={{
                  background:
                    "linear-gradient(150deg, rgba(140,185,255,0.65) 0%, rgba(70,130,230,0.28) 26%, rgba(59,123,255,0.05) 52%, transparent 78%)",
                  filter: "blur(7px)",
                }}
              />
              {/* Bezel: gradiente que se ilumina en la esquina superior y se
                  disuelve hacia el navy del fondo (sin borde duro). */}
              <div
                className="relative overflow-hidden rounded-[32px] p-[9px]"
                style={{
                  background:
                    "linear-gradient(150deg, rgba(150,190,255,0.55) 0%, rgba(64,120,215,0.28) 22%, rgba(12,26,48,0.6) 62%, rgba(8,18,36,0.72) 100%)",
                  boxShadow:
                    "0 50px 110px -40px rgba(0,0,0,0.85), 0 0 92px -34px rgba(59,123,255,0.7)",
                }}
              >
                {/* filo superior iluminado (reflejo de luz del marco) */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(198,220,255,0.75), transparent)",
                  }}
                />
                {/* Pantalla interior con el mural real (completo, sin recorte) */}
                <div className="relative overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/[0.08]">
                  <Image
                    src={wallPhoto}
                    alt="Portafolio de marcas distribuidas por Mercasa"
                    placeholder="blur"
                    sizes="(max-width: 1023px) 100vw, 76vw"
                    className="block h-auto w-full transition-transform duration-[1400ms] ease-out will-change-transform group-hover:scale-[1.012]"
                  />
                  {/* Viñeta MÍNIMA solo en los bordes extremos: funde apenas el
                      corte con el bezel sin apagar el brillo del showroom. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(122% 104% at 50% 44%, transparent 70%, rgba(6,15,24,0.30) 100%)",
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Explorador de categorías: ahora debajo del showroom, a todo el
                ancho de la imagen (antes estaba en la columna izquierda). */}
            <CategoryExplorer />
          </div>
        </div>
      </div>

      {/* Ceja/arco que funde el cierre de Marcas con el inicio de Contacto */}
      <SeamArc className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 w-full" />
    </section>
  );
}
