"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Briefcase, CheckCircle2, Loader2, Mail, Paperclip, Phone, Send, User, X } from "lucide-react";
import { site } from "@/lib/data";

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB — debe calzar con app/api/careers/route.ts

type Status = "idle" | "submitting" | "success" | "error";

/* Botón "Reclutamiento" del navbar: abre un card flotante con un formulario
   de postulación (nombre, correo, teléfono, puesto, mensaje opcional y CV
   adjunto). El envío pega a /api/careers (app/api/careers/route.ts), que ya
   arma el correo a RH con el CV adjunto vía Resend — no hay mailto: acá, el
   archivo sí viaja. Se cierra con la X o al hacer clic fuera; dos variantes
   de trigger (misma lógica de popover) para que encaje con el estilo de
   cada lista de navegación (desktop centrada vs. dropdown móvil de ancho
   completo). */
export default function RecruitmentPopover({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("Recruitment");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setPosition("");
    setMessage("");
    setCv(null);
    setStatus("idle");
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CV_BYTES) {
      setError(t("cvTooLarge"));
      e.target.value = "";
      return;
    }
    setError(null);
    setCv(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const formData = new FormData();
    formData.set("nombre", name);
    formData.set("correo", email);
    formData.set("telefono", phone);
    formData.set("puesto", position);
    formData.set("mensaje", message);
    if (cv) formData.set("cv", cv);

    try {
      const res = await fetch("/api/careers", { method: "POST", body: formData });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error ?? t("errorMessage", { email: site.emails.rh }));
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError(t("errorMessage", { email: site.emails.rh }));
    }
  }

  // Estilo CTA sólido en amarillo de marca con texto azul oscuro: a propósito
  // NO comparte pinta con los links de navegación — esto es una acción
  // destacada, no una sección más del menú.
  const ctaStyle = {
    background: "#FFD21A",
    color: "#082B5C",
  };

  const inputWrapStyle = "relative";
  const inputIconStyle = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corp-blue/40";
  const inputStyle =
    "w-full rounded-[10px] border border-corp-ink/10 bg-white py-2.5 pl-9 pr-3 text-[14px] text-corp-ink placeholder:text-slate-400 outline-none transition focus:border-corp-blue/40 focus:ring-2 focus:ring-corp-blue/10";
  const labelStyle = "mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500";

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
            // Debajo de `sm` (mobile) ESTE popover vive dentro del panel del
            // menú hamburguesa de Header.tsx, que sigue abierto/visible
            // detrás (un click acá adentro no cuenta como "click afuera" del
            // menú) — antes tenía max-w-[380px] acá, así que en mobile
            // quedaba flotando angosto sobre el menú abierto, dejando ver
            // los links detrás por los costados y mezclando ambos
            // visualmente. Sin el cap de ancho, `inset-x-4` lo estira a
            // (casi) todo el ancho de pantalla y tapa el menú por completo
            // detrás. A partir de `sm` vuelve a ser el popover angosto
            // anclado bajo el botón (ahí no hay menú hamburguesa detrás).
            className="fixed inset-x-4 top-[92px] z-30 max-h-[calc(100vh-112px)] overflow-y-auto sm:absolute sm:inset-x-auto sm:left-1/2 sm:top-[calc(100%+14px)] sm:mx-0 sm:max-h-[min(600px,calc(100vh-120px))] sm:w-[min(380px,92vw)] sm:-translate-x-1/2"
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(8,43,92,0.08)",
              background: "#FFFFFF",
              boxShadow: "0 28px 70px rgba(16,37,63,0.2)",
              padding: "22px",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-corp-blue/10 text-corp-blue">
                  <Briefcase className="h-4 w-4" />
                </span>
                <p className="text-[15px] font-semibold text-corp-ink">{t("title")}</p>
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

            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="text-[15px] font-semibold text-corp-ink">{t("successTitle")}</p>
                <p className="text-[13.5px] leading-[1.55] text-slate-500">{t("successMessage")}</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                  className="mt-1 text-[13.5px] font-semibold text-corp-blue underline-offset-2 hover:underline"
                >
                  {t("close")}
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-[14px] leading-[1.55] text-slate-500">{t("intro")}</p>

                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
                  <div>
                    <label className={labelStyle}>{t("nameLabel")}</label>
                    <div className={inputWrapStyle}>
                      <User className={inputIconStyle} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("namePlaceholder")}
                        className={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelStyle}>{t("emailLabel")}</label>
                    <div className={inputWrapStyle}>
                      <Mail className={inputIconStyle} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("emailPlaceholder")}
                        className={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelStyle}>{t("phoneLabel")}</label>
                      <div className={inputWrapStyle}>
                        <Phone className={inputIconStyle} />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("phonePlaceholder")}
                          className={inputStyle}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>{t("positionLabel")}</label>
                      <div className={inputWrapStyle}>
                        <Briefcase className={inputIconStyle} />
                        <input
                          type="text"
                          required
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          placeholder={t("positionPlaceholder")}
                          className={inputStyle}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelStyle}>{t("messageLabel")}</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("messagePlaceholder")}
                      rows={2}
                      className="w-full resize-none rounded-[10px] border border-corp-ink/10 bg-white px-3 py-2.5 text-[14px] text-corp-ink placeholder:text-slate-400 outline-none transition focus:border-corp-blue/40 focus:ring-2 focus:ring-corp-blue/10"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>{t("cvLabel")}</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {cv ? (
                      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-corp-blue/20 bg-corp-blue/5 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-corp-blue" />
                          <span className="truncate text-[13px] font-medium text-corp-ink">{cv.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCv(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="shrink-0 text-[12px] font-semibold text-corp-blue hover:underline"
                        >
                          {t("cvRemove")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-corp-ink/20 bg-corp-warmgray/40 px-3 py-2.5 text-[13px] font-medium text-corp-ink/70 transition hover:border-corp-blue/30 hover:bg-corp-blue/5 hover:text-corp-blue"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {t("cvChoose")}
                      </button>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">{t("cvHint")}</p>
                  </div>

                  {error && <p className="text-[12.5px] leading-[1.5] text-red-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="mt-1 flex items-center justify-center gap-2 rounded-[10px] bg-corp-blue px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("submittingCta")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("submitCta")}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
