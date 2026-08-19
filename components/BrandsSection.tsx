"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
import SoftCurve from "./SoftCurve";
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

/* Explorador de categorías, cerrado por defecto: fila horizontal de
   categorías (se envuelve en móvil) dentro de una tarjeta clara, para quien
   quiera curiosear qué marcas caen en cada categoría — nunca un paso
   obligatorio para ver el muro de marcas. Vive debajo del showroom,
   ocupando todo el ancho de esa columna. */
function CategoryExplorer() {
  const t = useTranslations("Brands");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div
      className="w-full rounded-[18px] border bg-white p-[18px] shadow-[0_8px_24px_rgba(16,37,63,0.06)]"
      style={{ borderColor: "#D8E1EC" }}
    >
      <div className="flex items-center gap-2 px-2 pb-3">
        <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-corp-blue" />
        <p className="text-[11px] font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.14em" }}>
          {t("explorerLabel")}
        </p>
      </div>

      <div className="flex flex-wrap gap-[12px]">
        {brandCategories.map((cat) => {
          const isOpen = openKey === cat.key;
          const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
          return (
            <div key={cat.key} className="min-w-[220px] flex-1">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : cat.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3.5 rounded-full px-[19px] text-left transition duration-300"
                style={{
                  minHeight: "48px",
                  border: `1px solid ${isOpen ? "rgba(7,95,216,0.4)" : "#D8E1EC"}`,
                  background: isOpen ? "#E6F1FB" : "#F8F9FB",
                }}
              >
                <span
                  className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isOpen ? "#075FD8" : "#E6F1FB",
                    color: isOpen ? "#fff" : "#075FD8",
                  }}
                >
                  <Icon className="h-[16px] w-[16px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex-1 text-[14px] font-medium text-corp-ink">
                  {t(`categories.${cat.key}.label`)}
                </span>
                <ChevronDown
                  className="h-[14px] w-[14px] shrink-0 text-corp-ink/40 transition-transform duration-300"
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
                          className="rounded-full border px-[11px] py-[5px] text-[11.5px] font-medium text-corp-ink"
                          style={{ background: "#F8F9FB", borderColor: "#E2E8F0" }}
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
  const t = useTranslations("Brands");
  return (
    <section id="marcas" className="relative overflow-hidden scroll-mt-20 bg-white pb-[48px] pt-[40px] sm:pb-[64px]">
      {/* El seam Logística → Marcas ya lo marca la curva inferior de
          Logística; acá solo se agrega la de salida hacia Contacto para no
          duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <div className="relative mx-auto px-4 sm:px-6" style={{ width: "min(95vw, 1660px)" }}>
        <div className="grid grid-cols-1 gap-[34px] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-center lg:gap-[42px]">
          {/* ---------- Columna izquierda: contenido ---------- */}
          <Reveal className="relative">
            <h2
              className="font-display text-corp-ink"
              style={{
                fontSize: "clamp(36px, 4vw, 56px)",
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {t("titleLead")}
              <br />
              {t("titleWord1")} <span className="text-corp-blue">{t("titleWord2")}</span>
            </h2>

            <p className="mt-7 max-w-[420px] text-[15.5px] leading-[1.7]" style={{ color: "#3A4A5F" }}>
              {t("paragraph")}
            </p>

            <ul className="mt-7 flex flex-col">
              {brandPillars.map((pillar, i) => {
                const Icon = pillarIcons[pillar.key as keyof typeof pillarIcons];
                return (
                  <motion.li
                    key={pillar.key}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: "-40px" }}
                    transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="grid items-start gap-x-4 mt-5 first:mt-0"
                    style={{ gridTemplateColumns: "46px 1fr" }}
                  >
                    <span
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] text-corp-blue"
                      style={{ background: "#E6F1FB", border: "1px solid rgba(255,210,26,0.5)" }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-[13px] font-bold uppercase text-corp-ink" style={{ letterSpacing: "0.06em" }}>
                        {t(`pillars.${pillar.key}.title`)}
                      </h3>
                      <p className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: "#3A4A5F" }}>
                        {t(`pillars.${pillar.key}.description`)}
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
              className="relative block overflow-hidden rounded-[28px] border"
              data-brands-showroom
              style={{
                borderColor: "#E8DFC8",
                boxShadow:
                  "0 0 40px 6px rgba(255,217,160,0.25), 0 0 90px 20px rgba(255,217,160,0.12), 0 20px 50px rgba(16,37,63,0.10)",
              }}
            >
              <Image
                src={wallPhoto}
                alt={t("showroomAlt")}
                placeholder="blur"
                sizes="(max-width: 1023px) 100vw, 76vw"
                className="block h-auto w-full"
              />
            </motion.div>

            <CategoryExplorer />
          </div>
        </div>
      </div>
    </section>
  );
}
