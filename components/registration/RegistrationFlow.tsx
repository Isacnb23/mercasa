"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DANGER_BG,
  DANGER_TEXT,
  FIELD_CLASS,
  FOCUS_RING,
  INK,
  PRIMARY_BUTTON,
  RULE,
  SECONDARY_BUTTON,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";
import {
  CODE_LENGTH,
  EMPTY_VALUES,
  FIELD_ORDER,
  classifyRegisterError,
  completeOutcome,
  digitsOnly,
  invalidFields,
  isCodeComplete,
  passwordChecks,
  validateField,
  type CompleteOutcome,
  type RegisterErrorKind,
  type RegistrationField,
  type RegistrationValues,
} from "@/lib/registration";
import CaptchaWidget from "./CaptchaWidget";

type Step = 1 | 2 | 3;
const TOTAL_STEPS = 3;

// Escala vertical única del registro (clases de Tailwind, sin valores sueltos), igual en los 3 pasos:
//  BLOCK    20px entre bloques (campo, términos, captcha);
//  FIELD    8px dentro de un bloque (etiqueta + ayuda → campo → error → requisitos);
//  LABEL    4px entre la etiqueta y su texto de ayuda;
//  STEP_TOP 24px bajo la barra de progreso.
const BLOCK = "gap-5";
const FIELD = "gap-2";
const LABEL = "gap-1";
const STEP_TOP = "mt-6";

// El botón del paso 1 vive en el pie del panel (fuera del formulario en el DOM) y se asocia con form=.
const START_FORM_ID = "registration-start-form";

async function post(step: "start" | "verify" | "complete", body: unknown): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`/api/register/${step}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch {
    return { status: 0, body: null };
  }
}

// Registro de clientes en 3 pasos, un objetivo por pantalla: (1) datos, (2) código del correo, (3) listo / en revisión.
// Vive dentro del panel de perfil (no es una página aparte); `onBackToLogin` vuelve al formulario de ingreso.
// La contraseña vive solo en el estado de este componente y se borra en cuanto el servidor acepta el paso 1.
export default function RegistrationFlow({
  onBackToLogin,
  footerTarget,
}: {
  onBackToLogin: () => void;
  // Elemento del panel (fuera de la zona con scroll) donde se pinta el pie con el botón del paso 1. Sin esta prop
  // (undefined) el pie va al final del formulario; con null (el panel aún no lo montó) no se pinta nada todavía.
  footerTarget?: HTMLElement | null;
}) {
  const t = useTranslations("Registration");

  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<RegistrationValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [serverFields, setServerFields] = useState<RegistrationField[]>([]);
  const [formError, setFormError] = useState<RegisterErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const [attemptId, setAttemptId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<RegisterErrorKind | null>(null);

  const [outcome, setOutcome] = useState<CompleteOutcome | "working">("working");

  // Cada paso nuevo recibe el foco en su título (lectores de pantalla y teclado).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const fieldInvalid = (field: RegistrationField) =>
    (touched[field] || serverFields.includes(field)) && (!validateField(field, values) || serverFields.includes(field));

  const setField = <K extends RegistrationField>(field: K, value: RegistrationValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerFields((f) => f.filter((x) => x !== field));
    setFormError(null);
  };

  const touch = (field: RegistrationField) => setTouched((s) => ({ ...s, [field]: true }));

  const restart = () => {
    setStep(1);
    setValues((v) => ({ ...v, password: "" }));
    setTouched({});
    setServerFields([]);
    setFormError(null);
    setAttemptId("");
    setCode("");
    setCodeError(null);
    setOutcome("working");
    setCaptchaReset((n) => n + 1);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
    const bad = invalidFields(values);
    if (bad.length > 0) {
      setFormError("validation");
      document.getElementById(`reg-${bad[0]}`)?.focus();
      return;
    }
    if (!captchaToken) {
      setFormError("captcha");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const res = await post("start", { ...values, captchaToken });
    setSubmitting(false);

    if (res.status === 200 && typeof (res.body as { attemptId?: unknown } | null)?.attemptId === "string") {
      setAttemptId((res.body as { attemptId: string }).attemptId);
      setEmail(values.email.trim());
      setValues((v) => ({ ...v, password: "" }));
      setCode("");
      setCodeError(null);
      setStep(2);
      return;
    }

    const error = classifyRegisterError(res.status, res.body);
    setFormError(error.kind);
    setServerFields(error.fields);
    setCaptchaReset((n) => n + 1);
    if (error.fields.length > 0) document.getElementById(`reg-${error.fields[0]}`)?.focus();
  };

  const runComplete = async (id: string) => {
    setOutcome("working");
    const res = await post("complete", { attemptId: id });
    setOutcome(completeOutcome(res.status, res.body));
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!isCodeComplete(code)) {
      setCodeError("validation");
      document.getElementById("reg-code")?.focus();
      return;
    }

    setSubmitting(true);
    setCodeError(null);
    const res = await post("verify", { attemptId, code: digitsOnly(code) });
    setSubmitting(false);

    if (res.status === 200) {
      setStep(3);
      void runComplete(attemptId);
      return;
    }

    setCodeError(classifyRegisterError(res.status, res.body).kind);
    document.getElementById("reg-code")?.focus();
  };

  const passwordRules = passwordChecks(values.password);

  const formErrorText = (kind: RegisterErrorKind) => {
    switch (kind) {
      case "validation":
        return t("errors.form.validation");
      case "duplicate":
        return t("errors.form.duplicate");
      case "rateLimited":
        return t("errors.form.rateLimited");
      case "captcha":
        return t("errors.form.captcha");
      case "captchaUnavailable":
        return t("errors.form.captchaUnavailable");
      default:
        return t("errors.form.unavailable");
    }
  };

  const codeErrorText = (kind: RegisterErrorKind) => {
    switch (kind) {
      case "validation":
        return t("errors.code");
      case "codeInvalid":
        return t("step2.codeInvalid");
      case "codeExpired":
        return t("step2.codeExpired");
      case "rateLimited":
        return t("errors.form.rateLimited");
      default:
        return t("errors.form.unavailable");
    }
  };

  // Pie del paso 1: error del servidor + botón principal. Se pinta fuera del scroll (ver footerTarget).
  const startFooter = (
    <>
      {formError && <FormAlert>{formErrorText(formError)}</FormAlert>}
      <button
        type="submit"
        form={START_FORM_ID}
        disabled={submitting}
        className={PRIMARY_BUTTON}
        style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
      >
        {submitting ? t("step1.submitting") : t("step1.submit")}
      </button>
    </>
  );

  return (
    <div className="w-full">
      <p className="text-[13px] font-semibold" style={{ color: TEXT_MUTED }} aria-label={t("stepsAria")}>
        {t("stepLabel", { current: step, total: TOTAL_STEPS })}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= step ? INK : RULE }} />
        ))}
      </div>

      {step === 1 && (
        <form id={START_FORM_ID} onSubmit={handleStart} noValidate className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-corp-ink outline-none"
              style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
            >
              {t("step1.title")}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("step1.intro")}
            </p>
          </div>

          <TextField
            field="name"
            label={t("fields.name.label")}
            autoComplete="name"
            value={values.name}
            invalid={fieldInvalid("name")}
            error={t("errors.name")}
            onChange={(v) => setField("name", v)}
            onBlur={() => touch("name")}
          />
          <TextField
            field="idNumber"
            label={t("fields.idNumber.label")}
            hint={t("fields.idNumber.hint")}
            inputMode="numeric"
            autoComplete="off"
            value={values.idNumber}
            invalid={fieldInvalid("idNumber")}
            error={t("errors.idNumber")}
            onChange={(v) => setField("idNumber", v)}
            onBlur={() => touch("idNumber")}
          />
          <TextField
            field="email"
            label={t("fields.email.label")}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            invalid={fieldInvalid("email")}
            error={t("errors.email")}
            onChange={(v) => setField("email", v)}
            onBlur={() => touch("email")}
          />
          <TextField
            field="phone"
            label={t("fields.phone.label")}
            hint={t("fields.phone.hint")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            invalid={fieldInvalid("phone")}
            error={t("errors.phone")}
            onChange={(v) => setField("phone", v)}
            onBlur={() => touch("phone")}
          />
          <TextField
            field="password"
            label={t("fields.password.label")}
            type="password"
            autoComplete="new-password"
            value={values.password}
            invalid={fieldInvalid("password")}
            error={t("errors.password")}
            describedBy="reg-password-rules"
            onChange={(v) => setField("password", v)}
            onBlur={() => touch("password")}
          >
            <div id="reg-password-rules" className={`flex flex-col ${LABEL} text-[13px]`} style={{ color: TEXT_MUTED }}>
            <p className="font-semibold">{t("passwordRules.title")}</p>
            <ul className={`flex flex-col ${LABEL}`}>
              {(["length", "upper", "lower", "digit"] as const).map((rule) => (
                <li key={rule} className="flex items-center gap-2" style={{ color: passwordRules[rule] ? "#1B6B3A" : TEXT_MUTED }}>
                  {passwordRules[rule] ? (
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  )}
                  <span>{t(`passwordRules.${rule}`)}</span>
                  <span className="sr-only">
                    {" — "}
                    {passwordRules[rule] ? t("passwordRules.met") : t("passwordRules.pending")}
                  </span>
                </li>
              ))}
            </ul>
            </div>
          </TextField>

          <div className={`flex flex-col ${FIELD}`}>
            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-snug" style={{ color: INK }}>
              <input
                id="reg-acceptedTerms"
                type="checkbox"
                checked={values.acceptedTerms}
                aria-invalid={fieldInvalid("acceptedTerms") || undefined}
                aria-describedby={fieldInvalid("acceptedTerms") ? "reg-acceptedTerms-error" : undefined}
                onChange={(e) => {
                  setField("acceptedTerms", e.target.checked);
                  touch("acceptedTerms");
                }}
                className={`mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#082B5C] ${FOCUS_RING}`}
              />
              <span>
                {t("terms.accept")}{" "}
                <Link
                  href="/legal/terminos-y-condiciones"
                  target="_blank"
                  className={`rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
                  style={{ color: "#075FD8" }}
                >
                  {t("terms.termsLink")}
                </Link>{" "}
                {t("terms.and")}{" "}
                <Link
                  href="/legal/politica-de-privacidad"
                  target="_blank"
                  className={`rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
                  style={{ color: "#075FD8" }}
                >
                  {t("terms.privacyLink")}
                </Link>
              </span>
            </label>
            {fieldInvalid("acceptedTerms") && <FieldError id="reg-acceptedTerms-error">{t("errors.acceptedTerms")}</FieldError>}
          </div>

          <p className="text-center text-[13.5px]" style={{ color: TEXT_MUTED }}>
            {t("haveAccount")}{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className={`rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
              style={{ color: "#075FD8" }}
            >
              {t("haveAccountLink")}
            </button>
          </p>

          <CaptchaWidget onToken={setCaptchaToken} resetKey={captchaReset} />

          {footerTarget === undefined ? <div className={`flex flex-col ${FIELD}`}>{startFooter}</div> : null}
        </form>
      )}

      {step === 1 && footerTarget ? createPortal(startFooter, footerTarget) : null}

      {step === 2 && (
        <form onSubmit={handleVerify} noValidate className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-corp-ink outline-none"
              style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
            >
              {t("step2.title")}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("step2.intro", { email })}
            </p>
          </div>

          <TextField
            field="code"
            label={t("step2.codeLabel")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            invalid={codeError === "validation" || codeError === "codeInvalid"}
            error={codeError ? codeErrorText(codeError) : ""}
            onChange={(v) => {
              setCode(digitsOnly(v).slice(0, CODE_LENGTH));
              setCodeError(null);
            }}
            onBlur={() => {}}
          />

          {codeError && codeError !== "validation" && codeError !== "codeInvalid" && <FormAlert>{codeErrorText(codeError)}</FormAlert>}

          <button
            type="submit"
            disabled={submitting}
            className={PRIMARY_BUTTON}
            style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
          >
            {submitting ? t("step2.submitting") : t("step2.submit")}
          </button>
          <button type="button" onClick={restart} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("step2.restart")}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {outcome === "pending"
              ? t("step3.pendingTitle")
              : outcome === "disabled"
                ? t("step3.disabledTitle")
                : outcome === "working"
                  ? t("step3.workingTitle")
                  : t("step3.errorTitle")}
          </h3>

          <div role="status" aria-live="polite" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {outcome === "working" && t("step3.workingBody")}
            {outcome === "pending" && t("step3.pendingBody")}
            {outcome === "disabled" && t("step3.disabledBody")}
            {outcome === "retry" && t("step3.retryBody")}
            {outcome === "restart" && t("step3.restartBody")}
          </div>

          {outcome === "retry" && (
            <button
              type="button"
              onClick={() => void runComplete(attemptId)}
              className={PRIMARY_BUTTON}
              style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
            >
              {t("step3.retry")}
            </button>
          )}
          {outcome === "restart" && (
            <button type="button" onClick={restart} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
              {t("step2.restart")}
            </button>
          )}
          {(outcome === "pending" || outcome === "disabled") && (
            <button type="button" onClick={onBackToLogin} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
              {t("step3.home")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] font-medium leading-snug" style={{ color: DANGER_TEXT }}>
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      {children}
    </p>
  );
}

function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13.5px] font-medium leading-snug"
      style={{ background: DANGER_BG, color: DANGER_TEXT }}
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {children}
    </p>
  );
}

// Campo con etiqueta, ayuda y error asociados (aria-describedby / aria-invalid).
function TextField({
  field,
  label,
  hint,
  error,
  invalid,
  describedBy,
  value,
  onChange,
  onBlur,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  children,
}: {
  field: RegistrationField | "code";
  label: string;
  hint?: string;
  error: string;
  invalid: boolean;
  describedBy?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: string;
  inputMode?: "numeric" | "email" | "tel" | "text";
  autoComplete?: string;
  maxLength?: number;
  children?: React.ReactNode;
}) {
  const id = `reg-${field}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [hint ? hintId : null, invalid ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex scroll-mt-6 flex-col ${FIELD}`}>
      <div className={`flex flex-col ${LABEL}`}>
        <label htmlFor={id} className="text-[13px] font-semibold" style={{ color: INK }}>
          {label}
        </label>
        {hint && (
          <p id={hintId} className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
            {hint}
          </p>
        )}
      </div>
      <input
        id={id}
        name={field}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        aria-required={field !== "code" || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={FIELD_CLASS}
        style={{ borderColor: invalid ? DANGER_TEXT : RULE, color: INK }}
      />
      {invalid && <FieldError id={errorId}>{error}</FieldError>}
      {children}
    </div>
  );
}
