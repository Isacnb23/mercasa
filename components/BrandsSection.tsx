"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Container from "./Container";
import Reveal from "./Reveal";
import SoftCurve from "./SoftCurve";
import { brandCategories, brandsMuralImage } from "@/lib/data";

// Cada cuánto avanza sola la rotación automática del mural. Sección
// puramente de respaldo de marca (estática/manual, ver lib/data.ts
// brandCategories) — independiente del árbol real de productos que consume
// ProductsSection, y no se conecta a la API.
const MURAL_ROTATE_MS = 4500;

export default function BrandsSection() {
  const t = useTranslations("Brands");
  const reduceMotion = useReducedMotion();

  const [muralKey, setMuralKey] = useState<string>(brandCategories[0].key);
  const muralCategory = brandCategories.find((cat) => cat.key === muralKey) ?? brandCategories[0];
  const showroomImage = muralCategory?.image ?? brandsMuralImage;
  const showroomAlt = `${t("showroomAlt")} — ${t(`categories.${muralCategory.key}.label` as "categories.alimentos.label")}`;

  // Altura fija del bloque de chips: se mide la altura de CADA categoría
  // (oculta, fuera de flujo) y se reserva la más alta de todas, para que
  // rotar entre categorías con distinta cantidad de marcas (1 fila vs 2)
  // nunca cambie el alto de la sección. Se remide en resize porque el
  // wrap de los chips depende del ancho disponible.
  const [chipsHeight, setChipsHeight] = useState<number | null>(null);
  const measureRefs = useRef<Record<string, HTMLUListElement | null>>({});

  useLayoutEffect(() => {
    function measure() {
      const heights = brandCategories.map((cat) => measureRefs.current[cat.key]?.offsetHeight ?? 0);
      const max = Math.max(...heights, 0);
      if (max > 0) setChipsHeight(max);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => {
      const currentIndex = brandCategories.findIndex((cat) => cat.key === muralKey);
      const next = brandCategories[(currentIndex + 1) % brandCategories.length];
      setMuralKey(next.key);
    }, MURAL_ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [muralKey, reduceMotion]);

  return (
    <section id="marcas" className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden bg-white pb-[48px] pt-[112px] sm:pb-[64px] sm:pt-[120px]">
      {/* Seam de salida hacia Contacto. La entrada (Productos → Marcas) la
          marca la curva inferior de ProductsSection, no se duplica acá. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative">
        {/* y={0}: título de la sección navegable (#marcas), ver
            fix-padding-secciones-raiz.md — mismo motivo que en LogisticsTimeline. */}
        <Reveal y={0} className="text-center">
          <h2
            className="font-display text-corp-ink"
            style={{ fontSize: "clamp(30px, 3.2vw, 44px)", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.1 }}
          >
            {t("muralTitle")}
          </h2>
          <span aria-hidden className="mx-auto mt-4 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />
          <p className="mx-auto mt-4 max-w-[480px] text-[14.5px] leading-[1.6]" style={{ color: "#3A4A5F" }}>
            {t("muralSubtitle")}
          </p>
        </Reveal>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
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
            El wrapper reserva la altura de la categoría más larga (medida
            abajo) y centra verticalmente los chips dentro de ese espacio,
            para que 1 fila o 2 filas ocupen siempre el mismo alto. */}
        <div
          className="mx-auto mt-6 flex max-w-[900px] items-center justify-center"
          style={{ minHeight: chipsHeight ?? undefined }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.ul
              key={muralKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-wrap justify-center gap-[10px]"
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

        {/* Medición oculta: renderiza las 4 categorías fuera de flujo con el
            mismo ancho/estilos que el bloque visible, para calcular la
            altura máxima real (2 filas en la categoría con más marcas) sin
            depender de un número mágico calibrado a mano. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 select-none" style={{ visibility: "hidden" }}>
          {brandCategories.map((cat) => (
            <ul
              key={cat.key}
              ref={(el) => {
                measureRefs.current[cat.key] = el;
              }}
              className="mx-auto flex max-w-[900px] flex-wrap justify-center gap-[10px]"
            >
              {cat.brands.map((name) => (
                <li
                  key={name}
                  className="rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium leading-snug"
                  style={{ background: "#F8F9FB", borderColor: "#E2E8F0" }}
                >
                  {name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </Container>
    </section>
  );
}
