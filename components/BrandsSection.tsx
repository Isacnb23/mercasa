"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Award, Baby, GlassWater, Handshake, ShoppingCart, Sparkles, UtensilsCrossed } from "lucide-react";
import Container from "./Container";
import Reveal from "./Reveal";
import SoftCurve from "./SoftCurve";
import { brandCategories, brandPillars, brandsMuralImage } from "@/lib/data";
import { cn } from "@/lib/utils";

const pillarIcons = {
  calidad: Award,
  alianzas: Handshake,
  compromiso: ShoppingCart,
} as const;

const categoryIcons = {
  alimentos: UtensilsCrossed,
  bebidas: GlassWater,
  "bebe-cuidado": Baby,
  "hogar-institucional": Sparkles,
} as const;

// Colores del selector master-detail — pedidos puntualmente para este bloque
// (distintos del corp-blue #075FD8 que usa el resto del sitio).
const MASTER_DETAIL_ACCENT = "#185FA5";
const MASTER_DETAIL_CHIP_BG = "#F0F5FA";

// Cuántas marcas mostrar como representativas al pie del panel antes del
// "+N" con el resto (ej. "Oreo · Milka · Snickers · Pringles · +12").
const VISIBLE_BRANDS_COUNT = 4;

// Cada cuánto avanza sola la rotación automática del mural (independiente
// del master-detail de arriba).
const MURAL_ROTATE_MS = 4500;

/* ---------- Columna izquierda: lista de categorías seleccionables ---------- */
function CategoryListItem({
  category,
  isActive,
  onSelect,
}: {
  category: (typeof brandCategories)[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("Brands");
  const Icon = categoryIcons[category.key as keyof typeof categoryIcons];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "flex min-h-[52px] shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition duration-300 lg:min-h-[60px] lg:w-full",
        isActive ? "shadow-[0_10px_26px_rgba(24,95,165,0.28)]" : "border border-[#E2E8F0] bg-white hover:border-[#185FA5]/30"
      )}
      style={{ background: isActive ? MASTER_DETAIL_ACCENT : undefined }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
        style={{
          background: isActive ? "rgba(255,255,255,0.18)" : MASTER_DETAIL_CHIP_BG,
          color: isActive ? "#ffffff" : MASTER_DETAIL_ACCENT,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </span>
      <span
        className="whitespace-nowrap text-[14.5px] font-semibold"
        style={{ color: isActive ? "#ffffff" : "#0c1a26" }}
      >
        {t(`categories.${category.key}.shortLabel`)}
      </span>
    </button>
  );
}

/* ---------- Columna derecha: panel de detalle de la categoría activa ---------- */
function CategoryDetailPanel({ category }: { category: (typeof brandCategories)[number] }) {
  const t = useTranslations("Brands");
  const Icon = categoryIcons[category.key as keyof typeof categoryIcons];
  const productTypes = t.raw(`categories.${category.key}.productTypes`) as string[];
  const visibleBrands = category.brands.slice(0, VISIBLE_BRANDS_COUNT);
  const remainingBrands = category.brands.length - visibleBrands.length;

  return (
    <motion.div
      key={category.key}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex flex-col justify-center p-7 sm:p-9"
    >
      <div className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: MASTER_DETAIL_CHIP_BG }}
        >
          <Icon className="h-8 w-8" strokeWidth={1.75} style={{ color: MASTER_DETAIL_ACCENT }} aria-hidden />
        </span>
        <h3
          className="font-display text-corp-ink"
          style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: 600, lineHeight: 1.15 }}
        >
          {t(`categories.${category.key}.label`)}
        </h3>
      </div>

      <p className="mt-5 max-w-[440px] text-[15px] leading-[1.6]" style={{ color: "#3A4A5F" }}>
        {t(`categories.${category.key}.tagline`)}
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {productTypes.map((productType) => (
          <span
            key={productType}
            className="rounded-full px-3.5 py-[7px] text-[12.5px] font-medium leading-snug"
            style={{ background: MASTER_DETAIL_CHIP_BG, color: MASTER_DETAIL_ACCENT }}
          >
            {productType}
          </span>
        ))}
      </div>

      <div className="mt-6 pt-6" style={{ borderTop: "1px solid #E2E8F0" }}>
        <p className="text-[13px] leading-[1.5]" style={{ color: "#5C6B7D" }}>
          <span className="font-semibold text-corp-ink">{t("categoryBrandsLabel")}: </span>
          {visibleBrands.join(" · ")}
          {remainingBrands > 0 ? ` · +${remainingBrands}` : ""}
        </p>
      </div>
    </motion.div>
  );
}

export default function BrandsSection() {
  const t = useTranslations("Brands");
  const reduceMotion = useReducedMotion();
  // El master-detail siempre tiene una categoría activa (arranca en la
  // primera, "alimentos") — a diferencia del grid de cards anterior, acá no
  // existe un estado "sin selección".
  const [activeKey, setActiveKey] = useState<string>(brandCategories[0].key);
  const activeCategory = brandCategories.find((cat) => cat.key === activeKey) ?? brandCategories[0];

  // El mural de abajo tiene su PROPIO estado, independiente del
  // master-detail: rota solo en loop hasta que el usuario elige una
  // categoría arriba, momento en el que se sincroniza con esa elección y
  // deja de rotar (nunca le vuelve a quitar el control al usuario).
  const [muralKey, setMuralKey] = useState<string>(brandCategories[0].key);
  const [muralAutoRotate, setMuralAutoRotate] = useState(true);
  const muralCategory = brandCategories.find((cat) => cat.key === muralKey) ?? brandCategories[0];
  const showroomImage = muralCategory?.image ?? brandsMuralImage;
  const showroomAlt = `${t("showroomAlt")} — ${t(`categories.${muralCategory.key}.label`)}`;

  useEffect(() => {
    if (!muralAutoRotate || reduceMotion) return;
    const id = window.setTimeout(() => {
      const currentIndex = brandCategories.findIndex((cat) => cat.key === muralKey);
      const next = brandCategories[(currentIndex + 1) % brandCategories.length];
      setMuralKey(next.key);
    }, MURAL_ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [muralKey, muralAutoRotate, reduceMotion]);

  // Click manual en el selector de arriba: fija el master-detail Y
  // sincroniza+congela el mural en esa misma categoría.
  const handleSelectCategory = (key: string) => {
    setActiveKey(key);
    setMuralKey(key);
    setMuralAutoRotate(false);
  };

  return (
    <section id="productos" className="relative overflow-hidden scroll-mt-20 bg-white pb-[48px] pt-[40px] sm:pb-[64px] sm:pt-[56px]">
      {/* El seam Logística → Productos ya lo marca la curva inferior de
          Logística; acá solo se agrega la de salida hacia Contacto para no
          duplicar el mismo trazo en el mismo borde. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative">
        {/* ---------- Encabezado: el producto primero, la marca como respaldo ---------- */}
        <Reveal className="mx-auto max-w-[640px] text-center" once>
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
            <span className="text-corp-blue">{t("titleAccent")}</span>
          </h2>

          <span
            aria-hidden
            className="mx-auto mt-5 block h-[3px] w-[46px] rounded-full bg-corp-yellow"
          />

          <p className="mx-auto mt-6 max-w-[520px] text-[15.5px] leading-[1.7]" style={{ color: "#3A4A5F" }}>
            {t("paragraph")}
          </p>
        </Reveal>

        {/* ---------- 3 puntos de valor: respaldo de marca, en fila ---------- */}
        <ul className="mx-auto mt-10 grid max-w-[880px] grid-cols-1 gap-8 sm:grid-cols-3">
          {brandPillars.map((pillar, i) => {
            const Icon = pillarIcons[pillar.key as keyof typeof pillarIcons];
            return (
              <motion.li
                key={pillar.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-40px" }}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center"
              >
                <span
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] text-corp-blue"
                  style={{ background: "#E6F1FB", border: "1px solid rgba(255,210,26,0.5)" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
                </span>
                <h3 className="mt-3 text-[13px] font-bold uppercase text-corp-ink" style={{ letterSpacing: "0.06em" }}>
                  {t(`pillars.${pillar.key}.title`)}
                </h3>
                <p className="mt-1.5 max-w-[240px] text-[13.5px] leading-[1.5]" style={{ color: "#3A4A5F" }}>
                  {t(`pillars.${pillar.key}.description`)}
                </p>
              </motion.li>
            );
          })}
        </ul>

        {/* ---------- Protagonista: master-detail de categorías de producto ---------- */}
        <div className="mt-16 lg:mt-20">
          <Reveal once className="flex items-center justify-center gap-4">
            <span
              className="whitespace-nowrap text-[12px] font-bold uppercase text-corp-blue"
              style={{ letterSpacing: "0.16em" }}
            >
              {t("categoriesLabel")}
            </span>
          </Reveal>

          <Reveal once delay={0.05} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-8">
            {/* Lista: fila de chips con scroll horizontal en mobile, columna en desktop */}
            <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {brandCategories.map((category) => (
                <CategoryListItem
                  key={category.key}
                  category={category}
                  isActive={activeKey === category.key}
                  onSelect={() => handleSelectCategory(category.key)}
                />
              ))}
            </div>

            {/* Panel de detalle: altura mínima fija para no saltar al cambiar de categoría */}
            <div
              className="relative min-h-[380px] overflow-hidden rounded-[28px] border bg-white"
              style={{ borderColor: "#E2E8F0", boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
            >
              <AnimatePresence initial={false}>
                <CategoryDetailPanel category={activeCategory} />
              </AnimatePresence>
            </div>
          </Reveal>
        </div>

        {/* ---------- Respaldo: mural de marcas, ahora secundario ---------- */}
        <div className="mt-16 lg:mt-20">
          <Reveal once className="text-center">
            <h3
              className="font-display text-corp-ink"
              style={{ fontSize: "clamp(24px, 2.4vw, 32px)", fontWeight: 600, letterSpacing: "-0.01em" }}
            >
              {t("muralTitle")}
            </h3>
            <p className="mx-auto mt-3 max-w-[480px] text-[14.5px] leading-[1.6]" style={{ color: "#3A4A5F" }}>
              {t("muralSubtitle")}
            </p>
          </Reveal>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            // aspect-ratio fijo (proporción de la pared de logos original):
            // ancho estable sin depender de las dimensiones intrínsecas de
            // cada imagen, así cambiar de categoría nunca produce layout
            // shift, ni mientras la imagen entrante todavía está cargando.
            className="relative mx-auto mt-8 aspect-[1654/951] w-full max-w-[1100px] overflow-hidden rounded-[28px] border"
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
                key={muralKey}
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
                  sizes="(max-width: 1023px) 100vw, 1100px"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Nombres de marca de la categoría del mural: refuerza la prueba
              social puntual en vez de listar las ~50 marcas todas juntas.
              Sigue a `muralKey` (no a `activeKey`) para quedar sincronizado
              con la rotación automática. */}
          <AnimatePresence initial={false} mode="wait">
            <motion.ul
              key={muralKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 flex max-w-[900px] flex-wrap justify-center gap-[10px]"
            >
              {muralCategory.brands.map((name) => (
                <li
                  key={name}
                  className="rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium leading-snug text-corp-ink"
                  style={{ background: "#F8F9FB", borderColor: "#E2E8F0" }}
                >
                  {name}
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
