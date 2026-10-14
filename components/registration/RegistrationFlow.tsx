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
  ID_TYPES,
  changeIdType,
  classifyRegisterError,
  completeOutcome,
  digitsOnly,
  emailSuggestion,
  fieldError,
  formatIdNumber,
  formatPhone,
  invalidFields,
  isCodeComplete,
  normalizeEmail,
  normalizeIdInput,
  normalizePhoneInput,
  passwordChecks,
  serverErrorKind,
  type CompleteOutcome,
  type IdType,
  type RegisterErrorKind,
  type RegistrationField,
  type RegistrationValues,
  type ServerFieldCodes,
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
  // Códigos de error por campo que devolvió el servidor al enviar (campo -> código); vacío si no hubo.
  const [serverCodes, setServerCodes] = useState<ServerFieldCodes>({});
  const serverFields = Object.keys(serverCodes) as RegistrationField[];
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

  // Un error se muestra al salir del campo (blur) o al enviar, no en cada tecla; una vez mostrado se actualiza en vivo.
  const fieldInvalid = (field: RegistrationField) =>
    (touched[field] || serverFields.includes(field)) && (fieldError(field, values) !== null || serverFields.includes(field));

  // Mensaje del campo según SU tipo de error (y el tipo de cédula); si solo lo rechazó el servidor, según su código.
  const fieldErrorText = (field: RegistrationField): string => {
    const kind = fieldError(field, values) ?? serverErrorKind(field, serverCodes[field], "invalid");
    switch (field) {
      case "name":
        if (kind === "digits") return t("errors.name.digits");
        if (kind === "surname") return t("errors.name.surname");
        return values.idType === "juridica" ? t("errors.name.invalidCompany") : t("errors.name.invalid");
      case "idNumber":
        if (values.idType === "juridica") return t("errors.idNumber.juridica");
        return kind === "prefix" ? t("errors.idNumber.fisicaPrefix") : t("errors.idNumber.fisicaLength");
      case "email":
        return t("errors.email");
      case "phone":
        return kind === "prefix" ? t("errors.phone.prefix") : t("errors.phone.length");
      case "password":
        return t("errors.password");
      case "acceptedTerms":
        return t("errors.acceptedTerms");
    }
  };

  const suggestedEmail = emailSuggestion(values.email);

  // Cambiar el tipo reajusta la máscara y conserva los dígitos que siguen siendo válidos; se vuelve a validar solo.
  const changeType = (type: IdType) =>
    setValues((v) => ({ ...v, idType: type, idNumber: changeIdType(v.idNumber, type) }));

  const setField = <K extends RegistrationField>(field: K, value: RegistrationValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerCodes((c) => {
      const next = { ...c };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const touch = (field: RegistrationField) => setTouched((s) => ({ ...s, [field]: true }));

  const restart = () => {
    setStep(1);
    setValues((v) => ({ ...v, password: "" }));
    setTouched({});
    setServerCodes({});
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
    const res = await post("start", { ...values, email: normalizeEmail(values.email), captchaToken });
    setSubmitting(false);

    if (res.status === 200 && typeof (res.body as { attemptId?: unknown } | null)?.attemptId === "string") {
      setAttemptId((res.body as { attemptId: string }).attemptId);
      setEmail(normalizeEmail(values.email));
      setValues((v) => ({ ...v, password: "" }));
      setCode("");
      setCodeError(null);
      setStep(2);
      return;
    }

    const error = classifyRegisterError(res.status, res.body);
    setFormError(error.kind);
    setServerCodes(Object.fromEntries(error.fields.map((field) => [field, error.fieldCodes[field] ?? ""])));
    setCaptchaReset((n) => n + 1);
    const firstWithError = FIELD_ORDER.find((field) => error.fields.includes(field));
    if (firstWithError) document.getElementById(`reg-${firstWithError}`)?.focus();
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

          <fieldset className={`flex flex-col ${FIELD}`}>
            <legend className="text-[13px] font-semibold" style={{ color: INK }}>
              {t("fields.idType.label")}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ID_TYPES.map((type) => (
                <label key={type} className="cursor-pointer">
                  <input
                    type="radio"
                    name="idType"
                    value={type}
                    checked={values.idType === type}
                    onChange={() => changeType(type)}
                    className="peer sr-only"
                  />
                  <span
                    className="flex min-h-[44px] items-center justify-center rounded-xl border bg-white px-3 text-center text-[13.5px] font-semibold motion-safe:transition motion-safe:duration-150 peer-checked:border-[#082B5C] peer-checked:bg-[#EAF0F8] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2"
                    style={{ borderColor: RULE, color: INK }}
                  >
                    {type === "fisica" ? t("fields.idType.fisica") : t("fields.idType.juridica")}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <TextField
            field="idNumber"
            label={t("fields.idNumber.label")}
            hint={values.idType === "fisica" ? t("fields.idNumber.hintFisica") : t("fields.idNumber.hintJuridica")}
            placeholder={values.idType === "fisica" ? "0-0000-0000" : "3-000-000000"}
            inputMode="numeric"
            autoComplete="off"
            value={formatIdNumber(values.idNumber, values.idType)}
            invalid={fieldInvalid("idNumber")}
            error={fieldErrorText("idNumber")}
            onChange={(v) => setField("idNumber", normalizeIdInput(v, values.idType))}
            onBlur={() => touch("idNumber")}
          />
          <TextField
            field="name"
            label={values.idType === "fisica" ? t("fields.name.labelFisica") : t("fields.name.labelJuridica")}
            hint={values.idType === "fisica" ? t("fields.name.hintFisica") : undefined}
            autoComplete={values.idType === "fisica" ? "name" : "organization"}
            maxLength={100}
            value={values.name}
            invalid={fieldInvalid("name")}
            error={fieldErrorText("name")}
            onChange={(v) => setField("name", v)}
            onBlur={() => touch("name")}
          />
          <TextField
            field="email"
            label={t("fields.email.label")}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            invalid={fieldInvalid("email")}
            error={fieldErrorText("email")}
            onChange={(v) => setField("email", v.toLowerCase())}
            onBlur={() => {
              setValues((s) => ({ ...s, email: normalizeEmail(s.email) }));
              touch("email");
            }}
          >
            {suggestedEmail && (
              <p role="status" className="flex flex-wrap items-center gap-x-2 text-[13px]" style={{ color: TEXT_MUTED }}>
                <span>{t("suggestions.email", { email: suggestedEmail })}</span>
                <button
                  type="button"
                  onClick={() => setField("email", suggestedEmail)}
                  className={`rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
                  style={{ color: "#075FD8" }}
                >
                  {t("suggestions.use")}
                </button>
              </p>
            )}
          </TextField>
          <TextField
            field="phone"
            label={t("fields.phone.label")}
            hint={t("fields.phone.hint")}
            placeholder="8888-7777"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={formatPhone(values.phone)}
            invalid={fieldInvalid("phone")}
            error={fieldErrorText("phone")}
            onChange={(v) => setField("phone", normalizePhoneInput(v))}
            onBlur={() => touch("phone")}
          />
          <TextField
            field="password"
            label={t("fields.password.label")}
            type="password"
            autoComplete="new-password"
            value={values.password}
            invalid={fieldInvalid("password")}
            error={fieldErrorText("password")}
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
            {fieldInvalid("acceptedTerms") && <FieldError id="reg-acceptedTerms-error">{fieldErrorText("acceptedTerms")}</FieldError>}
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
  placeholder,
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
  placeholder?: string;
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
        placeholder={placeholder}
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
