"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronRight, Ship, Warehouse, Truck, Store } from "lucide-react";
import Reveal from "./Reveal";
import { useScrollTo } from "@/lib/hooks/useScrollTo";
import { logisticsSteps } from "@/lib/data";
import { cn } from "@/lib/utils";

const stepIcons = {
  ship: Ship,
  warehouse: Warehouse,
  truck: Truck,
  store: Store,
} as const;

// Mismo azul de marca en los 4 cards — barra de acento, número e ícono
// idénticos en los 4, para que la única diferencia entre ellos sea el
// contenido (no el color).
const STEP_ACCENT = "#0C447C";
const STEP_ACCENT_BG = "#E6F1FB";

const FEATURE_KEYS = ["f1", "f2", "f3", "f4"] as const;

export default function LogisticsSteps() {
  const t = useTranslations("Logistics");
  const scrollTo = useScrollTo();

  return (
    <div>
      {/* Eyebrow de apertura: introduce la secuencia completa antes del paso 01 */}
      <Reveal className="mt-16 lg:mt-20">
        <div className="flex items-center gap-4">
          <span
            className="whitespace-nowrap text-[12px] font-bold uppercase text-corp-blue"
            style={{ letterSpacing: "0.16em" }}
          >
            {t("sequenceEyebrow")}
          </span>
          <span
            aria-hidden
            className="h-px w-10 shrink-0"
            style={{ background: "linear-gradient(90deg, rgba(7,95,216,0.45), rgba(7,95,216,0))" }}
          />
        </div>
      </Reveal>

      {/* Grid 2x2 (1 columna en mobile): corta el scroll de la sección a la
          mitad frente al zigzag full-width anterior — la secuencia 01→04 ya
          no es una única columna vertical, así que la numeración grande en
          cada bloque reemplaza al riel de progreso que había antes. */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-10 lg:gap-x-8 lg:gap-y-12">
        {logisticsSteps.map((step, i) => {
          const isFirst = i === 0;
          const isLast = i === logisticsSteps.length - 1;
          const StepIcon = stepIcons[step.icon as keyof typeof stepIcons];
          const statValue = t(`steps.${step.key}.statValue`);

          return (
            <Reveal key={step.key} delay={(i % 2) * 0.08}>
              <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E2E8F0] shadow-[0_14px_40px_rgba(16,37,63,0.08)]">
                <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[4px]" style={{ background: STEP_ACCENT }} />

                {/* ----- Imagen: banner superior de alto fijo ----- */}
                <div className="relative h-[200px] w-full shrink-0">
                  <Image
                    src={step.image}
                    alt={t(`steps.${step.key}.title`)}
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 50vw, 100vw"
                    priority={i === 0}
                  />
                </div>

                {/* ----- Contenido ----- */}
                <div className="relative flex flex-1 flex-col bg-white px-6 py-8 md:px-7 md:py-9">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className={cn(
                        "font-display font-bold leading-none opacity-[0.16]",
                        isFirst ? "text-[56px] md:text-[64px]" : "text-[48px] md:text-[56px]"
                      )}
                      style={{ color: STEP_ACCENT }}
                    >
                      {step.step}
                    </span>
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                      style={{ background: STEP_ACCENT_BG }}
                    >
                      <StepIcon className="h-6 w-6" strokeWidth={1.75} style={{ color: STEP_ACCENT }} aria-hidden />
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-[21px] font-semibold leading-tight text-corp-ink md:text-[23px]">
                    {t(`steps.${step.key}.title`)}
                  </h3>

                  <p className="mt-3 text-[14px] leading-[1.65]" style={{ color: "#3A4A5F" }}>
                    {t(`steps.${step.key}.description`)}
                  </p>

                  <ul className="mt-6 flex flex-col gap-3.5">
                    {FEATURE_KEYS.map((fKey) => (
                      <li key={fKey} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: STEP_ACCENT }}
                        />
                        <p className="text-[13.5px] leading-[1.55]" style={{ color: "#3A4A5F" }}>
                          <span className="font-semibold text-corp-ink">
                            {t(`steps.${step.key}.features.${fKey}.title`)}:{" "}
                          </span>
                          {t(`steps.${step.key}.features.${fKey}.description`)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7">
                    {statValue ? (
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-[34px] font-bold leading-none md:text-[38px]" style={{ color: STEP_ACCENT }}>
                          {statValue}
                        </span>
                        <span
                          className="max-w-[160px] text-[11.5px] font-semibold uppercase leading-tight tracking-wide"
                          style={{ color: "#3A4A5F" }}
                        >
                          {t(`steps.${step.key}.statLabel`)}
                        </span>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold uppercase tracking-wide"
                        style={{ background: STEP_ACCENT_BG, color: STEP_ACCENT }}
                      >
                        {t(`steps.${step.key}.statLabel`)}
                      </span>
                    )}
                  </div>

                  {isLast && (
                    <button
                      type="button"
                      onClick={() => scrollTo("#productos")}
                      className="group mt-7 inline-flex w-fit items-center justify-center gap-2 rounded-full border-2 border-corp-ink bg-white px-6 py-[11px] text-[13.5px] font-semibold text-corp-ink transition duration-300 hover:-translate-y-0.5 hover:bg-corp-ink hover:text-white"
                    >
                      {t("cta")}
                      <ChevronRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
