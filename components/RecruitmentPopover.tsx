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

  // Estilo CTA sólido (mismo azul que "Escríbanos por WhatsApp" en Contacto):
  // a propósito NO comparte pinta con los links de navegación — esto es una
  // acción destacada, no una sección más del menú.
  const ctaStyle = {
    background: "linear-gradient(135deg, #1754D8, #216CF2)",
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
            ? "flex w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-semibold text-white shadow-[0_6px_16px_-4px_rgba(30,100,240,0.35)] transition duration-300 hover:brightness-110 active:scale-[0.98]"
            : "inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-[9px] text-[13px] font-semibold text-white shadow-[0_6px_16px_-4px_rgba(30,100,240,0.45)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
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
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-[calc(100%+14px)] z-30 w-[min(320px,88vw)] -translate-x-1/2"
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(74,141,255,0.3)",
              background:
                "linear-gradient(160deg, rgba(16,30,55,0.97) 0%, rgba(9,20,38,0.97) 100%)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.5), 0 0 26px rgba(60,120,255,0.14), inset 0 1px 0 rgba(255,255,255,0.06)",
              padding: "20px",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold text-white">{t("title")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {t("intro")}
            </p>

            {/* Espacio reservado para más info a futuro (vacantes, mensaje) —
                por ahora solo el correo. */}
            <a
              href={`mailto:${site.emails.rh}`}
              className="mt-4 flex items-center gap-3 rounded-[10px] px-3.5 py-3 transition hover:bg-white/[0.06]"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(56,140,255,0.16)", color: "#7fb0ff" }}
              >
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-semibold uppercase"
                  style={{ letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}
                >
                  {t("emailLabel")}
                </p>
                <p className="truncate text-[13.5px] font-medium text-white">{site.emails.rh}</p>
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
