"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Boxes, PackageCheck, ShoppingCart } from "lucide-react";
import Reveal from "../../ui/Reveal";

const pillarIcons = {
  catalogo: Boxes,
  disponibilidad: PackageCheck,
  compromiso: ShoppingCart,
} as const;

const pillarKeys = ["catalogo", "disponibilidad", "compromiso"] as const;

// Encabezado estático de la sección (título + 3 pilares de confianza) —
// separado de ProductsExplorerLoader (server, async) para que el título
// aparezca de inmediato mientras el árbol de productos todavía se está
// trayendo/armando server-side detrás del Suspense.
export default function ProductsHeader() {
  const t = useTranslations("Products");

  return (
    <>
      {/* y={0}: título de la sección navegable (#productos), ver
          fix-padding-secciones-raiz.md — mismo motivo que en LogisticsTimeline. */}
      <Reveal y={0} className="mx-auto max-w-[640px] text-center">
        {/* Eyebrow "NUESTROS PRODUCTOS" (ver productos-rediseno-referencia.md
            y reference/productos-target.png) — mismo patrón de dos líneas
            sin ícono en el medio que ya usa el encabezado de Customer Class
            (CustomerClassSection.tsx): la referencia trae un engranaje
            decorativo entre las líneas, pero el doc pide explícitamente NO
            incluirlo acá. */}
        <span
          className="mb-5 flex items-center justify-center gap-3 text-[13px] font-bold uppercase sm:text-[15px]"
          style={{ letterSpacing: "0.2em", color: "#082b5c" }}
        >
          <span className="h-px w-10 shrink-0 sm:w-14" style={{ background: "#DDE3E8" }} />
          {t("eyebrow")}
          <span className="h-px w-10 shrink-0 sm:w-14" style={{ background: "#DDE3E8" }} />
        </span>
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

        <span aria-hidden className="mx-auto mt-4 block h-[3px] w-[46px] rounded-full bg-corp-yellow" />

        <p className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-[1.7]" style={{ color: "#3A4A5F" }}>
          {t("paragraph")}
        </p>
      </Reveal>

      {/* mt-10 -> mt-7, íconos/gaps achicados: en laptops de poco alto
          (1366x768, 1440x900) este bloque + el cuadro de familias no
          entraban sin scrollear la página entera (ver
          ajuste-encaje-laptop.md). */}
      <ul className="mx-auto mt-7 grid max-w-[880px] grid-cols-1 gap-6 sm:grid-cols-3">
        {pillarKeys.map((key, i) => {
          const Icon = pillarIcons[key];
          return (
            <motion.li
              key={key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-40px" }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-corp-blue"
                style={{ background: "#E6F1FB", border: "1px solid rgba(255,210,26,0.5)" }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
              </span>
              <h3 className="mt-2 text-[13px] font-bold uppercase text-corp-ink" style={{ letterSpacing: "0.06em" }}>
                {t(`pillars.${key}.title`)}
              </h3>
              <p className="mt-1 max-w-[240px] text-[15.5px] leading-[1.5]" style={{ color: "#3A4A5F" }}>
                {t(`pillars.${key}.description`)}
              </p>
            </motion.li>
          );
        })}
      </ul>
    </>
  );
}
