"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLenis } from "lenis/react";
import {
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/data";
import {
  RECRUIT_LIMITS,
  validateRecruitment,
  type RecruitErrorCode,
  type RecruitField,
} from "@/lib/recruitment-validation";

// Orden en que se busca el primer campo con error para darle el foco.
const FIELD_ORDER: RecruitField[] = ["name", "email", "phone", "position", "canton", "message", "cv", "consent"];
const noopSubscribe = () => () => {};

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Status = "idle" | "submitting" | "success" | "error";

const labelStyle = "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const inputBase =
  "w-full rounded-[10px] border bg-white py-2.5 pl-9 pr-9 text-[14px] text-corp-ink placeholder:text-slate-400 outline-none transition focus:ring-2";

function stateClasses(invalid: boolean, valid: boolean) {
  if (invalid) return "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200/70";
  if (valid) return "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200/70";
  return "border-corp-ink/10 focus:border-corp-blue/50 focus:ring-corp-blue/15";
}

function FieldError({ field, text }: { field: RecruitField; text?: string }) {
  if (!text) return null;
  return (
    <p id={`recruit-err-${field}`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-[1.4] text-red-600">
      <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

type TextFieldProps = {
  field: RecruitField;
  label: string;
  optionalTag?: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  valid: boolean;
  placeholder: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  autoComplete?: string;
  multiline?: boolean;
  counter?: React.ReactNode;
};

function TextField({
  field,
  label,
  optionalTag,
  icon,
  value,
  onChange,
  onBlur,
  error,
  valid,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
  multiline,
  counter,
}: TextFieldProps) {
  const id = `recruit-${field}`;
  const common = {
    id,
    value,
    placeholder,
    maxLength,
    onBlur,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `recruit-err-${field}` : undefined,
  };
  return (
    <div>
      <label htmlFor={id} className={labelStyle}>
        {label}
        {optionalTag && <span className="ml-1.5 font-medium normal-case tracking-normal text-slate-400">({optionalTag})</span>}
      </label>
      <div className="relative">
        {multiline ? (
          <textarea
            {...common}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBase} resize-none !pl-3 ${stateClasses(!!error, valid)}`}
          />
        ) : (
          <>
            {icon && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-corp-blue/40" aria-hidden="true">
                {icon}
              </span>
            )}
            <input
              {...common}
              type={type}
              inputMode={inputMode}
              autoComplete={autoComplete}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${stateClasses(!!error, valid)}`}
            />
          </>
        )}
        {valid && !error && !multiline && (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <FieldError field={field} text={error} />
        </div>
        {counter}
      </div>
    </div>
  );
}

/* Botón "Reclutamiento" del navbar: abre un drawer flotante con el formulario
   de postulación. El envío pega a /api/careers (app/api/careers/route.ts), que
   arma el correo a RH con el CV adjunto y registra la postulación en GI.Recruit.API.
   Los datos escritos viven SOLO en el estado del componente (memoria): nunca se
   guardan en localStorage, sessionStorage ni cookies.

   Estructura del drawer: cabecera fija / cuerpo con scroll interno / pie fijo con
   el botón de enviar. El scroll suave de la página (Lenis, ver
   components/chrome/SmoothScroll.tsx) captura la rueda y el touch en toda la
   ventana, así que el cuerpo lleva `data-lenis-prevent` y Lenis se pausa mientras
   el drawer está abierto. Dos variantes de trigger (desktop centrada vs. dropdown
   móvil de ancho completo). */
export default function RecruitmentPopover({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("Recruitment");
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [canton, setCanton] = useState("");
  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [fileError, setFileError] = useState<RecruitErrorCode | null>(null);
  const [dragging, setDragging] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<RecruitField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // true solo en el cliente (evita crear el portal durante el render del servidor)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Validación derivada (mismas reglas que el servidor): se recalcula en cada render,
  // así el error desaparece apenas el valor se corrige.
  const errors = validateRecruitment({
    name,
    email,
    phone,
    position,
    canton,
    message,
    consent,
    cv: cv ? { name: cv.name, size: cv.size } : null,
  });
  const shown = (f: RecruitField) => submitted || !!touched[f];
  const touch = (f: RecruitField) => setTouched((prev) => (prev[f] ? prev : { ...prev, [f]: true }));

  function closeDialog() {
    setOpen(false);
    if (status === "success") resetForm();
    triggerRef.current?.focus();
  }

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideRoot = rootRef.current?.contains(target);
      const insideDialog = dialogRef.current?.contains(target);
      if (!insideRoot && !insideDialog) {
        setOpen(false);
        if (status === "success") resetForm();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, status]);

  // Escape cierra y devuelve el foco al botón "Reclutamiento"
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      if (status === "success") resetForm();
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, status]);

  // Bloquea el scroll de la página mientras el drawer está abierto
  useEffect(() => {
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open, lenis]);

  // Al abrir, el foco pasa al drawer (lectores de pantalla); en móvil no se enfoca un
  // campo para no abrir el teclado virtual de golpe.
  useEffect(() => {
    if (open) dialogRef.current?.focus({ preventScroll: true });
  }, [open]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCanton("");
    setPosition("");
    setMessage("");
    setCv(null);
    setFileError(null);
    setConsent(false);
    setHoneypot("");
    setTouched({});
    setSubmitted(false);
    setStatus("idle");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function acceptFile(file: File | undefined) {
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith(".pdf") && (file.type === "" || file.type === "application/pdf");
    if (!isPdf) {
      setFileError("pdfOnly");
    } else if (file.size > RECRUIT_LIMITS.cvMaxBytes) {
      setFileError("tooLarge");
    } else if (file.size === 0) {
      setFileError("required");
    } else {
      setFileError(null);
      setCv(file);
    }
    touch("cv");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function errorText(field: RecruitField, code: RecruitErrorCode) {
    if (code === "pdfOnly") return t("cvPdfOnly");
    if (code === "tooLarge") return t("cvTooLarge");
    if (code === "invalid") return field === "phone" ? t("phoneInvalid") : t("emailInvalid");
    if (code === "length") {
      if (field === "name") return t("nameLength");
      if (field === "position") return t("positionLength");
      if (field === "canton") return t("cantonLength");
      return t("messageLength");
    }
    if (field === "cv") return t("cvRequired");
    if (field === "consent") return t("consentRequired");
    return t("errRequired");
  }

  // Texto de error visible de un campo (null si aún no corresponde mostrarlo)
  function visibleError(field: RecruitField) {
    if (field === "cv" && fileError) return errorText("cv", fileError);
    const code = errors[field];
    return code && shown(field) ? errorText(field, code) : undefined;
  }

  const hasValue: Record<RecruitField, boolean> = {
    name: name.trim() !== "",
    email: email.trim() !== "",
    phone: phone.trim() !== "",
    position: position.trim() !== "",
    canton: canton.trim() !== "",
    message: message.trim() !== "",
    cv: !!cv,
    consent,
  };
  const isValid = (f: RecruitField) => shown(f) && hasValue[f] && !errors[f];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return; // evita doble envío
    setError(null);
    setSubmitted(true);

    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      const el = document.getElementById(`recruit-${firstInvalid}`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }

    setStatus("submitting");

    const formData = new FormData();
    formData.set("nombre", name.trim());
    formData.set("correo", email.trim());
    formData.set("telefono", phone.trim());
    formData.set("canton", canton.trim());
    formData.set("puesto", position.trim());
    formData.set("mensaje", message.trim());
    formData.set("consent", consent ? "true" : "false");
    formData.set("website", honeypot); // honeypot: debe ir vacío
    if (cv) formData.set("cv", cv);

    try {
      const res = await fetch("/api/careers", { method: "POST", body: formData });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        // Falla: se conserva todo lo escrito para poder reintentar.
        setStatus("error");
        setError(data.error ?? t("errorMessage", { email: site.emails.rh }));
        return;
      }
      // Éxito: se limpia todo (campos, archivo y checkbox) y se muestra la pantalla de éxito.
      resetForm();
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

  const cvError = visibleError("cv");
  const submitting = status === "submitting";
  const messageNearLimit = message.length > RECRUIT_LIMITS.messageMax * 0.9;

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-label={t("title")}
          tabIndex={-1}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
          // Debajo de `sm` (mobile) ESTE popover se portea a document.body
          // (ver más abajo) para no quedar atrapado por el panel del menú
          // hamburguesa de Header.tsx, que anima con Framer Motion (transform)
          // y recorta con overflow-hidden — un ancestro con transform crea un
          // containing block nuevo para los hijos `position: fixed`.
          // `inset-x-4` lo estira a (casi) todo el ancho de pantalla. A partir de
          // `sm` vuelve a ser el popover angosto anclado bajo el botón.
          // Altura máxima = alto de la ventana menos el header (92px arriba + 20px de margen);
          // el drawer es una columna: cabecera fija, cuerpo con scroll, pie fijo.
          className="fixed inset-x-4 top-[92px] z-[60] flex max-h-[calc(100dvh-112px)] flex-col overflow-hidden outline-none sm:absolute sm:inset-x-auto sm:left-1/2 sm:top-[calc(100%+14px)] sm:z-30 sm:mx-0 sm:max-h-[min(680px,calc(100dvh-120px))] sm:w-[min(400px,92vw)] sm:-translate-x-1/2"
          style={{
            borderRadius: "18px",
            border: "1px solid rgba(8,43,92,0.08)",
            background: "#FFFFFF",
            boxShadow: "0 28px 70px rgba(16,37,63,0.2)",
          }}
        >
          {/* Cabecera fija */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-corp-ink/[0.06] px-5 pb-3.5 pt-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-corp-blue/10 text-corp-blue">
                <Briefcase className="h-4 w-4" />
              </span>
              <p className="text-[15px] font-semibold text-corp-ink">{t("title")}</p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              aria-label={t("close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-corp-ink/50 transition hover:bg-corp-ink/[0.06] hover:text-corp-ink focus-visible:outline-2 focus-visible:outline-corp-blue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {status === "success" ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-5 py-10 text-center" data-lenis-prevent>
              <motion.span
                initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
              >
                <CheckCircle2 className="h-7 w-7" />
              </motion.span>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: 0.12, duration: 0.25 }}
                className="flex flex-col items-center gap-2"
              >
                <p className="text-[16px] font-semibold text-corp-ink">{t("successTitle")}</p>
                <p className="text-[13.5px] leading-[1.55] text-slate-500">{t("successMessage")}</p>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="mt-2 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-corp-blue underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-corp-blue"
                >
                  {t("close")}
                </button>
              </motion.div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
              {/* Cuerpo con scroll interno. `data-lenis-prevent` hace que Lenis no capture la
                  rueda/touch aquí; `overscroll-contain` evita que el scroll pase a la página. */}
              <div
                data-lenis-prevent
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]"
              >
                <p className="text-[13.5px] leading-[1.55] text-slate-500">{t("intro")}</p>

                {/* Honeypot: invisible para personas, los bots lo llenan */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />

                <TextField
                  field="name"
                  label={t("nameLabel")}
                  icon={<User className="h-4 w-4" />}
                  value={name}
                  onChange={setName}
                  onBlur={() => touch("name")}
                  error={visibleError("name")}
                  valid={isValid("name")}
                  placeholder={t("namePlaceholder")}
                  maxLength={RECRUIT_LIMITS.nameMax}
                  autoComplete="name"
                />

                <TextField
                  field="email"
                  label={t("emailLabel")}
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  onBlur={() => touch("email")}
                  error={visibleError("email")}
                  valid={isValid("email")}
                  placeholder={t("emailPlaceholder")}
                  maxLength={RECRUIT_LIMITS.emailMax}
                  autoComplete="email"
                />

                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  <TextField
                    field="phone"
                    label={t("phoneLabel")}
                    icon={<Phone className="h-4 w-4" />}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(v) => setPhone(formatPhone(v))}
                    onBlur={() => touch("phone")}
                    error={visibleError("phone")}
                    valid={isValid("phone")}
                    placeholder={t("phonePlaceholder")}
                    maxLength={9}
                    autoComplete="tel-national"
                  />
                  <TextField
                    field="position"
                    label={t("positionLabel")}
                    icon={<Briefcase className="h-4 w-4" />}
                    value={position}
                    onChange={setPosition}
                    onBlur={() => touch("position")}
                    error={visibleError("position")}
                    valid={isValid("position")}
                    placeholder={t("positionPlaceholder")}
                    maxLength={RECRUIT_LIMITS.positionMax}
                  />
                </div>

                <TextField
                  field="canton"
                  label={t("cantonLabel")}
                  optionalTag={t("optional")}
                  icon={<MapPin className="h-4 w-4" />}
                  value={canton}
                  onChange={setCanton}
                  onBlur={() => touch("canton")}
                  error={visibleError("canton")}
                  valid={isValid("canton")}
                  placeholder={t("cantonPlaceholder")}
                  maxLength={RECRUIT_LIMITS.cantonMax}
                />

                <TextField
                  field="message"
                  label={t("messageLabel")}
                  multiline
                  value={message}
                  onChange={setMessage}
                  onBlur={() => touch("message")}
                  error={visibleError("message")}
                  valid={isValid("message")}
                  placeholder={t("messagePlaceholder")}
                  maxLength={RECRUIT_LIMITS.messageMax}
                  counter={
                    <span className={`shrink-0 pt-1.5 text-[11px] tabular-nums ${messageNearLimit ? "text-amber-600" : "text-slate-400"}`}>
                      {t("charCount", { count: message.length, max: RECRUIT_LIMITS.messageMax })}
                    </span>
                  }
                />

                {/* CV: zona de arrastrar y soltar */}
                <div>
                  <span className={labelStyle}>{t("cvLabel")}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => acceptFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  {cv ? (
                    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-emerald-300 bg-emerald-50/40 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-corp-blue" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-corp-ink">{cv.name}</p>
                          <p className="text-[11.5px] text-slate-500">{formatSize(cv.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="recruit-cv"
                        onClick={() => {
                          setCv(null);
                          setFileError(null);
                          touch("cv");
                        }}
                        className="shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-corp-blue hover:bg-corp-blue/10 focus-visible:outline-2 focus-visible:outline-corp-blue"
                      >
                        {t("cvRemove")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="recruit-cv"
                      onClick={() => fileInputRef.current?.click()}
                      onBlur={() => touch("cv")}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        acceptFile(e.dataTransfer.files?.[0]);
                      }}
                      aria-describedby={cvError ? "recruit-err-cv" : undefined}
                      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed px-3 py-5 text-center transition focus-visible:outline-2 focus-visible:outline-corp-blue ${
                        cvError
                          ? "border-red-300 bg-red-50/40 text-red-600"
                          : dragging
                            ? "border-corp-blue bg-corp-blue/10 text-corp-blue"
                            : "border-corp-ink/15 bg-corp-warmgray/40 text-corp-ink/70 hover:border-corp-blue/40 hover:bg-corp-blue/5 hover:text-corp-blue"
                      }`}
                    >
                      <Upload className="h-5 w-5" aria-hidden="true" />
                      <span className="text-[13px] font-medium">{t("cvDrop")}</span>
                      <span className="text-[11.5px] font-semibold text-corp-blue">{t("cvChoose")}</span>
                    </button>
                  )}
                  <p className="mt-1.5 text-[11.5px] text-slate-400">{t("cvHint")}</p>
                  <FieldError field="cv" text={cvError} />
                </div>

                {/* Consentimiento + aviso de privacidad plegable */}
                <div className="rounded-[12px] bg-corp-warmgray/60 p-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="recruit-consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      onBlur={() => touch("consent")}
                      aria-invalid={visibleError("consent") ? true : undefined}
                      aria-describedby={visibleError("consent") ? "recruit-err-consent" : undefined}
                      className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer accent-[#075FD8]"
                    />
                    <label htmlFor="recruit-consent" className="cursor-pointer text-[12.5px] leading-[1.5] text-corp-ink/80">
                      {t("consentLabel")}
                    </label>
                  </div>
                  <FieldError field="consent" text={visibleError("consent")} />
                  <details className="group mt-2 text-[12px] leading-[1.5] text-slate-600">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-corp-blue focus-visible:outline-2 focus-visible:outline-corp-blue [&::-webkit-details-marker]:hidden">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("privacyToggle")}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
                      <li>{t("privacyResponsible")}</li>
                      <li>{t("privacyPurpose")}</li>
                      <li>{t("privacyData")}</li>
                      <li>{t("privacyRecipients")}</li>
                      <li>{t("privacyRights", { email: site.emails.comunicaciones })}</li>
                    </ul>
                    <Link
                      href="/legal/politica-de-privacidad"
                      target="_blank"
                      className="mt-2 inline-block font-semibold text-corp-blue underline-offset-2 hover:underline"
                    >
                      {t("privacyFullLink")}
                    </Link>
                  </details>
                </div>
              </div>

              {/* Pie fijo: el botón de enviar siempre se ve */}
              <div className="sticky bottom-0 shrink-0 border-t border-corp-ink/[0.06] bg-white px-5 pb-4 pt-3">
                {error && (
                  <p role="alert" className="mb-2.5 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-red-600">
                    <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-corp-blue px-4 py-3 text-[14px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-corp-blue disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {t("submittingCta")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {t("submitCta")}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={variant === "mobile" ? "relative mt-2" : "relative flex items-center"}
    >
      <button
        ref={triggerRef}
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

      {variant === "mobile" ? (mounted ? createPortal(dialog, document.body) : null) : dialog}
    </div>
  );
}
