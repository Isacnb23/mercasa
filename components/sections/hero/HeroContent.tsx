"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/data";
import { useScrollTo } from "@/lib/hooks/useScrollTo";

// Ahora el texto vive sobre el fundido BLANCO (no sobre el overlay navy de
// la foto) — título en navy oscuro, acento en azul corporativo brillante.
const TITLE_NAVY = "#0B2E5F";
const ACCENT_BRIGHT = "#176BEB";
const MUTED = "#66758A";

const EASE_CORP = [0.22, 0.61, 0.36, 1] as const;

export default function HeroContent() {
  const t = useTranslations("Hero");
  const scrollTo = useScrollTo();

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_CORP }}
        className="mb-7 flex flex-wrap items-center gap-3"
      >
        <span className="whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.14em] text-corp-blue">
          {t("badgeSince", { year: site.foundedYear })}
        </span>
        <span style={{ color: MUTED, opacity: 0.4 }}>|</span>
        <span className="whitespace-nowrap text-[14.5px] font-medium" style={{ color: MUTED }}>
          {t("badgeParent", { parent: site.parentCompany })}
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: EASE_CORP }}
        className="font-display"
        style={{
          fontSize: "clamp(40px, 4.8vw, 68px)",
          lineHeight: 1.02,
          fontWeight: 650,
          letterSpacing: "-0.02em",
          maxWidth: "16ch",
          color: TITLE_NAVY,
        }}
      >
        {t.rich("title", {
          accent: (chunks) => <span style={{ color: ACCENT_BRIGHT }}>{chunks}</span>,
        })}
      </motion.h1>

      <motion.span
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.32, ease: EASE_CORP }}
        className="mt-6 block h-[3px] w-[46px] origin-left rounded-full"
        style={{ backgroundColor: ACCENT_BRIGHT }}
        aria-hidden
      />

      <motion.p
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.24, ease: EASE_CORP }}
        className="mt-6 text-[15.5px] leading-[1.7]"
        style={{ maxWidth: "420px", color: MUTED }}
      >
        {t.rich("paragraph", {
          accent: (chunks) => <span className="font-semibold text-corp-blue">{chunks}</span>,
        })}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: EASE_CORP }}
        className="mt-9"
      >
        <button
          type="button"
          onClick={() => scrollTo("#logistica")}
          className="group inline-flex w-full items-center gap-4 rounded-full bg-corp-blue py-2 pl-7 pr-2 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(11,46,95,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 sm:w-auto"
        >
          {t("ctaPrimary")}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-corp-blue transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
          </span>
        </button>
      </motion.div>
    </div>
  );
}
