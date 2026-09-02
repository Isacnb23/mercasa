"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bell, CalendarCheck2, Download, FileCheck2, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEEN_KEY = "notif-dudomi-2026-09-seen";
const PDF_HREF = "/notificaciones/certificado-dudomi-2026-09.pdf";
const EASE_CORP = [0.22, 0.61, 0.36, 1] as const;

function LotRow({ label, oldDate, newDate }: { label: string; oldDate: string; newDate: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-corp-ink/[0.06] bg-corp-warmgray/70 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-corp-blue/10 text-corp-blue">
        <CalendarCheck2 className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p>
        <p className="mt-0.5 text-[13.5px] leading-tight text-corp-ink">
          <span className="text-slate-400 line-through decoration-slate-400/70">{oldDate}</span>
          <span className="mx-1.5 text-slate-300">→</span>
          <span className="font-semibold text-corp-blue">{newDate}</span>
        </p>
      </div>
    </div>
  );
}

/* Notificación puntual (certificado de extensión de vencimiento Dudomi),
   hardcodeada a propósito — no es un sistema de lista de notificaciones.
   Si se necesita otra notificación en el futuro, evaluar entonces si vale
   la pena generalizar. */
export default function NotificationBell({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("Notification");
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(SEEN_KEY) === "true";
    } catch {
      return true;
    }
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "true");
      } catch {
        // localStorage puede fallar en modo privado — no es crítico.
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={variant === "mobile" ? "relative mt-2" : "relative flex items-center"}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("ariaLabel")}
        className={
          variant === "mobile"
            ? "flex w-full items-center justify-center gap-2 rounded-2xl border border-corp-ink/10 px-4 py-3 text-base font-semibold text-corp-ink transition hover:bg-corp-warmgray"
            : "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-corp-ink transition hover:bg-corp-ink/[0.06]"
        }
      >
        <Bell className="h-5 w-5" />
        {variant === "mobile" && t("ariaLabel")}
        {!seen && (
          <span
            className={cn(
              "absolute h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white",
              variant === "mobile" ? "right-4 top-2.5" : "right-2 top-2"
            )}
            aria-hidden
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={`${t("dudomi.title")} — ${t("dudomi.subtitle")}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: EASE_CORP }}
            style={{ transformOrigin: "top right" }}
            className="fixed inset-x-4 top-[92px] z-30 mx-auto w-auto max-w-[420px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+14px)] sm:mx-0 sm:w-[min(620px,90vw)] sm:max-w-[620px]"
          >
            <div
              className="flex max-h-[min(600px,85vh)] flex-col overflow-hidden rounded-[20px]"
              style={{
                border: "1px solid rgba(10,55,110,0.06)",
                background: "#FFFFFF",
                boxShadow: "0 24px 64px rgba(12,35,70,0.18)",
              }}
            >
              {/* Header: eyebrow dorado + ícono de certificado, con más
                  peso tipográfico que un texto plano suelto. */}
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-corp-ink/[0.06] px-5 pb-4 pt-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-corp-blue/10 text-corp-blue">
                    <FileCheck2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#B6821F" }}>
                      {t("eyebrow")}
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold leading-snug text-corp-ink">{t("dudomi.title")}</p>
                    <p className="text-[12.5px] font-medium text-slate-500">{t("dudomi.subtitle")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("close")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-corp-ink/50 transition hover:bg-corp-ink/[0.06] hover:text-corp-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-4">
                <p className="text-[12px] leading-[1.4] text-slate-500">{t("dudomi.product")}</p>
                <p className="mt-2.5 text-[13.5px] leading-[1.5] text-corp-ink/80">{t("dudomi.body")}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LotRow label={t("dudomi.lot1Label")} oldDate={t("dudomi.lot1Old")} newDate={t("dudomi.lot1New")} />
                  <LotRow label={t("dudomi.lot2Label")} oldDate={t("dudomi.lot2Old")} newDate={t("dudomi.lot2New")} />
                </div>

                <p className="mt-3 text-[13px] leading-[1.5] text-slate-500">{t("dudomi.results")}</p>

                {/* Firma/nota de pie: fondo cálido diferenciado del cuerpo,
                    para que se lea como certificación, no como otro párrafo. */}
                <div
                  className="mt-3 flex items-start gap-2.5 rounded-[12px] px-3.5 py-3"
                  style={{ backgroundColor: "#F1ECE4" }}
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#B6821F" }} strokeWidth={2} aria-hidden />
                  <p className="text-[11.5px] leading-[1.5] text-corp-ink/70">{t("dudomi.footer")}</p>
                </div>

                <a
                  href={PDF_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-[46px] items-center justify-center gap-2 rounded-full bg-corp-blue text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(11,46,95,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                >
                  <Download className="h-4 w-4" />
                  {t("dudomi.download")}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
