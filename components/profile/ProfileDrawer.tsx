"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Mail, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";

// Mismo lenguaje visual que CartDrawer.tsx (header navy con degradado +
// curvas decorativas, acentos gold, tarjetas beige) — reusa los mismos
// valores de color en vez de introducir una paleta nueva para "Perfil".
const INK = "#082B5C";
const MUTED = "#8493A5";
const RULE = "#E2E8F0";
const BEIGE = "#F1ECE4";
const GOLD = "#FFD21A";

export default function ProfileDrawer() {
  const t = useTranslations("Profile");
  const { user, isLoading, isOpen, closeProfile, login, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeProfile();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeProfile]);

  // Limpia el formulario cuando el drawer se cierra, para que la próxima
  // apertura (ya sea otro intento o tras cerrar sesión) no arrastre el
  // password ni un error viejo en pantalla.
  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError(null);
    }
  }, [isOpen]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login({ userId, password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUserId("");
    setPassword("");
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(8,20,40,0.45)", backdropFilter: "blur(2px)" }}
            onClick={closeProfile}
            aria-hidden
          />
          <motion.div
            key="profile-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[310] flex w-full max-w-[440px] flex-col bg-white shadow-[0_0_70px_rgba(8,20,40,0.3)]"
          >
            <div
              className="relative flex items-center justify-between gap-3 overflow-hidden px-6 py-5"
              style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)` }}
            >
              <svg
                className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 opacity-[0.08]"
                viewBox="0 0 320 320"
                fill="none"
                aria-hidden
              >
                <circle cx="160" cy="160" r="140" stroke="#fff" strokeWidth="1.5" />
                <circle cx="160" cy="160" r="95" stroke="#fff" strokeWidth="1.5" />
              </svg>
              <svg
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full opacity-[0.16]"
                viewBox="0 0 440 24"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden
              >
                <path d="M0,14 C 70,22 140,4 220,12 C 300,20 370,2 440,10" stroke="#fff" strokeWidth="1.5" />
              </svg>
              <div className="relative flex items-center gap-3">
                <span
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12"
                  style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,210,26,0.35)" }}
                >
                  <User className="h-5 w-5 text-white" strokeWidth={1.7} aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase text-white/60" style={{ letterSpacing: "0.16em" }}>
                    {t("eyebrow")}
                  </p>
                  <p className="font-display text-[19px] font-semibold leading-tight text-white">{t("title")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProfile}
                aria-label={t("close")}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <X className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isLoading ? (
                <p className="text-center text-[13.5px]" style={{ color: MUTED }}>
                  {t("loadingSession")}
                </p>
              ) : user ? (
                <div className="flex flex-col gap-4">
                  <div
                    className="flex flex-col items-center gap-3 rounded-[24px] px-8 py-9 text-center"
                    style={{ background: BEIGE, boxShadow: "0 16px 40px -24px rgba(8,43,92,0.35)" }}
                  >
                    <span
                      className="relative flex h-16 w-16 items-center justify-center rounded-full"
                      style={{
                        background: "radial-gradient(circle at 35% 30%, #FFFFFF, #F1ECE4 70%)",
                        boxShadow: `inset 0 0 0 2px ${GOLD}`,
                      }}
                    >
                      <User className="h-7 w-7" strokeWidth={1.6} style={{ color: INK }} aria-hidden />
                    </span>
                    <p className="font-display text-[16px] font-semibold" style={{ color: INK }}>
                      {t("loggedInGreeting", { name: user.name || user.accountNum })}
                    </p>
                    <div className="flex w-full flex-col gap-2 text-left">
                      <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3" style={{ borderColor: RULE }}>
                        <span className="text-[11.5px] font-semibold uppercase" style={{ color: MUTED, letterSpacing: "0.06em" }}>
                          {t("accountNumLabel")}
                        </span>
                        <span className="text-[13.5px] font-semibold" style={{ color: INK }}>
                          {user.accountNum}
                        </span>
                      </div>
                      {user.email && (
                        <div className="flex items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: RULE }}>
                          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase" style={{ color: MUTED, letterSpacing: "0.06em" }}>
                            <Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            {t("emailLabel")}
                          </span>
                          <span className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>
                            {user.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center justify-center gap-2 rounded-full border py-3 text-[14px] font-semibold transition hover:bg-black/[0.02]"
                    style={{ borderColor: RULE, color: INK }}
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
                    {t("logoutCta")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <p className="text-[13.5px] leading-relaxed" style={{ color: "#5C6B7D" }}>
                    {t("loginIntro")}
                  </p>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
                      {t("userIdLabel")}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      required
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder={t("userIdPlaceholder")}
                      className="rounded-2xl border px-4 py-3 text-[14px] outline-none transition focus:border-[#075FD8]"
                      style={{ borderColor: RULE, color: INK }}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
                      {t("passwordLabel")}
                    </span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("passwordPlaceholder")}
                      className="rounded-2xl border px-4 py-3 text-[14px] outline-none transition focus:border-[#075FD8]"
                      style={{ borderColor: RULE, color: INK }}
                    />
                  </label>

                  {error && (
                    <p className="rounded-xl px-4 py-2.5 text-[13px] font-medium" style={{ background: "#FDECEC", color: "#B3261E" }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 flex items-center justify-center gap-2.5 rounded-full py-3.5 text-[15px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)`, boxShadow: "0 12px 24px rgba(8,43,92,0.28)" }}
                  >
                    {submitting ? t("submitCtaLoading") : t("submitCta")}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
