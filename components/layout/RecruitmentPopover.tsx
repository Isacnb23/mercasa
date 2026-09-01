"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail, X } from "lucide-react";
import { site } from "@/lib/data";

/* Botón "Reclutamiento" del navbar: abre un card flotante con el correo de
   RH. Se cierra con la X o al hacer clic fuera. Pensado para poder sumarle
   más contenido después (vacantes, mensaje) sin rediseñar el card — por
   ahora solo el correo. Dos variantes de trigger (misma lógica de popover)
   para que encaje con el estilo de cada lista de navegación (desktop
   centrada vs. dropdown móvil de ancho completo). */
export default function RecruitmentPopover({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("Recruitment");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Estilo CTA sólido en amarillo de marca con texto azul oscuro: a propósito
  // NO comparte pinta con los links de navegación — esto es una acción
  // destacada, no una sección más del menú.
  const ctaStyle = {
    background: "#FFD21A",
    color: "#082B5C",
  };

  return (
    <div
      ref={rootRef}
      className={variant === "mobile" ? "relative mt-2" : "relative flex items-center"}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={ctaStyle}
        className={
          variant === "mobile"
            ? "flex w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-semibold shadow-[0_6px_16px_-4px_rgba(255,210,26,0.45)] transition duration-300 hover:brightness-95 active:scale-[0.98]"
            : "inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-5 py-[9px] text-[14px] font-semibold shadow-[0_6px_16px_-4px_rgba(255,210,26,0.5)] transition duration-300 hover:-translate-y-0.5 hover:brightness-95 active:scale-95"
        }
      >
        {t("navLabel")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t("title")}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-x-4 top-[92px] z-30 mx-auto w-auto max-w-[320px] sm:absolute sm:inset-x-auto sm:left-1/2 sm:top-[calc(100%+14px)] sm:mx-0 sm:w-[min(320px,88vw)] sm:-translate-x-1/2"
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(8,43,92,0.08)",
              background: "#FFFFFF",
              boxShadow: "0 24px 60px rgba(16,37,63,0.18)",
              padding: "20px",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold text-corp-ink">{t("title")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-corp-ink/50 transition hover:bg-corp-ink/[0.06] hover:text-corp-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[14px] leading-[1.55] text-slate-500">
              {t("intro")}
              {t("intro2")}
            </p>

            {/* Espacio reservado para más info a futuro (vacantes, mensaje) —
                por ahora solo el correo. */}
            <a
              href={`mailto:${site.emails.rh}`}
              className="mt-4 flex items-center gap-3 rounded-[10px] border border-corp-ink/10 px-3.5 py-3 transition hover:bg-corp-warmgray"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-corp-blue/10 text-corp-blue">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {t("emailLabel")}
                </p>
                <p className="truncate text-[14.5px] font-medium text-corp-ink">{site.emails.rh}</p>
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
