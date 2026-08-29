"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";

import heroPhoto from "@/public/brand/Hero/hero-warehouse.png";
import HeroContent from "./HeroContent";
import StatsCards from "./StatsCards";
import HeroWave from "./HeroWave";
import ScrollIndicator from "./ScrollIndicator";

const desktopImageMask = `
  linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.1) 10%,
    rgba(0, 0, 0, 0.35) 18%,
    rgba(0, 0, 0, 0.75) 26%,
    #000000 32%,
    #000000 68%,
    rgba(0, 0, 0, 0.75) 74%,
    rgba(0, 0, 0, 0.35) 82%,
    rgba(0, 0, 0, 0.1) 90%,
    transparent 100%
  )
`;

export default function Hero() {
  const t = useTranslations("Hero");
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.85],
    [1, 0],
  );

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative flex min-h-[min(880px,100dvh)] items-center overflow-hidden bg-white"
    >
      {/* Imagen de escritorio con máscara simétrica */}
      <div className="absolute inset-y-0 left-[34%] right-[-2px] z-0 hidden md:block">
        <Image
          src={heroPhoto}
          alt={t("photoAlt")}
          fill
          preload
          quality={95}
          sizes="66vw"
          className="object-cover"
          style={{
            objectPosition: "100% center",
            WebkitMaskImage: desktopImageMask,
            maskImage: desktopImageMask,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        />
      </div>

      {/* Líneas curvas decorativas */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-[2] h-[220px] w-[420px] opacity-[0.06] md:h-[280px] md:w-[520px]"
        viewBox="0 0 520 280"
        fill="none"
      >
        <path
          d="M-20,240 C120,180 200,260 340,190 C420,150 460,190 540,140"
          stroke="#075FD8"
          strokeWidth="1.4"
        />

        <path
          d="M-20,280 C100,220 220,290 360,230 C440,195 480,230 540,190"
          stroke="#075FD8"
          strokeWidth="1.2"
        />
      </svg>

      {/* Contenido principal */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-20 mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 py-24 md:flex-row md:items-center md:justify-between md:py-20 lg:px-16"
      >
        <div className="w-full md:max-w-[560px]">
          <HeroContent />

          {/* Imagen para mobile */}
          <div className="relative mt-8 aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-[0_20px_45px_rgba(11,46,95,0.16)] md:hidden">
            <Image
              src={heroPhoto}
              alt={t("photoAlt")}
              fill
              quality={90}
              sizes="(min-width: 768px) 0px, calc(100vw - 40px)"
              className="object-cover object-center"
            />
          </div>

          {/* Estadísticas para mobile */}
          <div className="mt-6 md:hidden">
            <StatsCards
              variant="stacked"
              className="w-full"
            />
          </div>
        </div>

        {/* Estadísticas flotantes para escritorio */}
        <div className="hidden md:flex md:flex-1 md:justify-end">
          <StatsCards variant="floating" />
        </div>
      </motion.div>

      <HeroWave />

      <ScrollIndicator
        target="#nosotros"
        label={t("scrollAria")}
      />
    </section>
  );
}