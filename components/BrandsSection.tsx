"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import Container from "./Container";
import Reveal from "./Reveal";
import SoftCurve from "./SoftCurve";
import { brandCategories, brandPillars, brandsMuralImage } from "@/lib/data";

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
function CategoryExplorer({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const t = useTranslations("Brands");
  // Estado de acordeón (qué lista de marcas se ve desplegada) queda
  // deliberadamente separado de `activeKey` (qué categoría manda la imagen
  // principal): cerrar la lista de marcas no debe hacer que la imagen
  // "pierda" selección — la pared de logos activa es la del último chip
  // clickeado, se vea o no su lista de marcas en ese momento.
  const [openKey, setOpenKey] = useState<string | null>(null);
  // El panel de marcas del acordeón vive fuera de la columna angosta de su
  // propio chip (antes quedaba anidado ahí, atrapado a un ancho de
  // ~220-280px — la causa real del "hueco vacío a la derecha": el grid
  // recién agregado calculaba sus columnas contra ese ancho angosto, no
  // contra el de la tarjeta completa). Ahora se renderiza una sola vez,
  // debajo de toda la fila de chips, así el grid de pills tiene el ancho
  // real de la tarjeta para acomodarse en columnas uniformes.
  const openCategory = openKey ? brandCategories.find((cat) => cat.key === openKey) ?? null : null;

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
          const isActive = activeKey === cat.key;
          const isOpen = openKey === cat.key;
          const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
          return (
            <div key={cat.key} className="min-w-[220px] flex-1">
              <button
                type="button"
                onClick={() => {
                  // Click en el chip activo = deseleccionar (vuelve al mural
                  // con todas las marcas), igual que cerrar cualquier otro
                  // filtro activo.
                  onSelect(isActive ? null : cat.key);
                  setOpenKey(isOpen ? null : cat.key);
                }}
                aria-expanded={isOpen}
                aria-pressed={isActive}
                className="flex w-full items-center gap-3.5 rounded-full px-[19px] text-left transition duration-300"
                style={{
                  minHeight: "48px",
                  border: `1px solid ${isActive ? "rgba(7,95,216,0.5)" : "#D8E1EC"}`,
                  background: isActive ? "#E6F1FB" : "#F8F9FB",
                }}
              >
                <span
                  className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isActive ? "#075FD8" : "#E6F1FB",
                    color: isActive ? "#fff" : "#075FD8",
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
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {openCategory && (
          <motion.div
            key={openCategory.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {/* Grid en vez de flex-wrap libre: columnas uniformes según el
                ancho disponible (auto-fill/minmax) para que los pills se
                acomoden en una cuadrícula prolija, en vez de wrappear por su
                propio largo de texto y dejar un hueco vacío a la derecha. */}
            <ul className="mt-3 grid gap-x-3 gap-y-[10px] [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
              {openCategory.brands.map((name, i) => (
                <motion.li
                  key={name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.02 }}
                  className="flex items-center justify-center rounded-full border px-[11px] py-[7px] text-center text-[11.5px] font-medium leading-snug text-corp-ink"
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
}

export default function BrandsSection() {
  const t = useTranslations("Brands");
  const reduceMotion = useReducedMotion();
  // Por defecto, sin categoría seleccionada: se ve el mural completo (todas
  // las marcas) y ningún chip queda activo.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeCategory = activeKey ? brandCategories.find((cat) => cat.key === activeKey) ?? null : null;
  const showroomImage = activeCategory?.image ?? brandsMuralImage;
  const showroomAlt = activeCategory
    ? `${t("showroomAlt")} — ${t(`categories.${activeCategory.key}.label`)}`
    : t("showroomAlt");

  return (
    <section id="marcas" className="relative overflow-hidden scroll-mt-20 bg-white pb-[48px] pt-[40px] sm:pb-[64px]">
      {/* El seam Logística → Marcas ya lo marca la curva inferior de
          Logística; acá solo se agrega la de salida hacia Contacto para no
          duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative">
        <div className="grid grid-cols-1 gap-[34px] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-center lg:gap-[42px]">
          {/* ---------- Columna izquierda: contenido ---------- */}
          <Reveal className="relative" once>
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
              initial={reduceMotion ? false : { opacity: 0, x: 40, scale: 1.02 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              // aspect-ratio fijo (proporción de la pared de logos original):
              // ancho estable sin depender de las dimensiones intrínsecas de
              // cada imagen, así cambiar de categoría nunca produce layout
              // shift, ni mientras la imagen entrante todavía está cargando.
              className="relative block aspect-[1654/951] w-full overflow-hidden rounded-[28px] border"
              data-brands-showroom
              style={{
                borderColor: "#E8DFC8",
                boxShadow:
                  "0 0 40px 6px rgba(255,217,160,0.25), 0 0 90px 20px rgba(255,217,160,0.12), 0 20px 50px rgba(16,37,63,0.10)",
              }}
            >
              {/* AnimatePresence en modo "sync" (default, sin mode="wait"):
                  la pared saliente y la entrante quedan superpuestas
                  (absolute inset-0) y animan a la vez — crossfade real, no
                  un corte con hueco en medio. */}
              <AnimatePresence>
                <motion.div
                  key={activeKey ?? "mural"}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={showroomImage}
                    alt={showroomAlt}
                    fill
                    sizes="(max-width: 1023px) 100vw, 76vw"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <CategoryExplorer activeKey={activeKey} onSelect={setActiveKey} />
          </div>
        </div>
      </Container>
    </section>
  );
}
