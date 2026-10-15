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
  EMPTY_COMPLETION,
  EMPTY_VALUES,
  ID_TYPES,
  NAME_LIMITS,
  PROCESSING_RETRIES,
  PROCESSING_RETRY_MS,
  applyIdType,
  buildCompleteBody,
  buildStartBody,
  classifyRegisterError,
  completeOutcome,
  completionError,
  digitsOnly,
  emailSuggestion,
  fieldError,
  fieldsClearedByType,
  fieldsFor,
  formatIdNumber,
  formatPhone,
  invalidCompletionFields,
  invalidFields,
  isCodeComplete,
  normalizeEmail,
  normalizeIdInput,
  normalizePhoneInput,
  passwordChecks,
  serverErrorKind,
  type CompleteField,
  type CompleteOutcome,
  type CompletionValues,
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

// Los botones del paso 1 y del paso 3 (formulario de contraseña) viven en el pie del panel (fuera del formulario en el
// DOM) y se asocian con form=.
const START_FORM_ID = "registration-start-form";
const COMPLETE_FORM_ID = "registration-complete-form";

// Estado del paso 3: "form" (contraseña, confirmación y términos), "working" (enviando), "processing" (AX todavía crea la
// cuenta: se reintenta solo), y los resultados finales.
type Phase = "form" | "working" | "processing" | "created" | "disabled" | "failed" | "restart" | "retry";

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
// La contraseña se pide en el último paso, vive solo en el estado de este componente (nunca en almacenamiento del navegador)
// y se borra al terminar o al volver a empezar.
export default function RegistrationFlow({
  onBackToLogin,
  footerTarget,
  initialValues,
  initialStep,
}: {
  onBackToLogin: () => void;
  // Elemento del panel (fuera de la zona con scroll) donde se pinta el pie con el botón del paso 1. Sin esta prop
  // (undefined) el pie va al final del formulario; con null (el panel aún no lo montó) no se pinta nada todavía.
  footerTarget?: HTMLElement | null;
  // Valores con los que arranca el formulario (por ejemplo el tipo de cédula); solo lo usan las pruebas de pantalla.
  initialValues?: Partial<RegistrationValues>;
  // Paso con el que arranca (1 por defecto); solo lo usan las pruebas de pantalla para ver el paso 3.
  initialStep?: 1 | 2 | 3;
}) {
  const t = useTranslations("Registration");

  const [step, setStep] = useState<Step>(initialStep ?? 1);
  const [values, setValues] = useState<RegistrationValues>({ ...EMPTY_VALUES, ...initialValues });
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

  // Paso 3: contraseña, confirmación y términos (solo en el estado del componente), y en qué va la creación de la cuenta.
  const [completion, setCompletion] = useState<CompletionValues>(EMPTY_COMPLETION);
  const [completionTouched, setCompletionTouched] = useState<Partial<Record<CompleteField, boolean>>>({});
  const [completionServerCodes, setCompletionServerCodes] = useState<ServerFieldCodes>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [processingRetries, setProcessingRetries] = useState(0);
  const [completeError, setCompleteError] = useState<RegisterErrorKind | null>(null);
  // La última contraseña escrita, para que un reintento automático (con la pantalla ya en "processing") no use una copia vieja.
  const completionRef = useRef(completion);
  useEffect(() => {
    completionRef.current = completion;
  }, [completion]);

  // Cada paso (y cada resultado del paso 3) recibe el foco en su título (lectores de pantalla y teclado).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, phase]);

  // Un error se muestra al salir del campo (blur) o al enviar, no en cada tecla; una vez mostrado se actualiza en vivo.
  const fieldInvalid = (field: RegistrationField) =>
    (touched[field] || serverFields.includes(field)) && (fieldError(field, values) !== null || serverFields.includes(field));

  // Mensaje del campo según SU tipo de error (y el tipo de cédula); si solo lo rechazó el servidor, según su código.
  const fieldErrorText = (field: RegistrationField): string => {
    const kind = fieldError(field, values) ?? serverErrorKind(field, serverCodes[field], "invalid");
    switch (field) {
      case "firstName":
        return kind === "required" ? t("errors.firstName.required") : t("errors.firstName.invalid");
      case "lastName1":
        return kind === "required" ? t("errors.lastName1.required") : t("errors.lastName1.invalid");
      case "lastName2":
        return t("errors.lastName2.invalid");
      case "legalName":
        return kind === "required" ? t("errors.legalName.required") : t("errors.legalName.invalid");
      case "tradeName":
        return t("errors.tradeName.invalid");
      case "idNumber":
        if (values.idType === "juridica") return t("errors.idNumber.juridica");
        return kind === "prefix" ? t("errors.idNumber.fisicaPrefix") : t("errors.idNumber.fisicaLength");
      case "email":
        return t("errors.email");
      case "phone":
        return kind === "prefix" ? t("errors.phone.prefix") : t("errors.phone.length");
    }
  };

  // Paso 3: el error se muestra al salir del campo o al enviar, y se actualiza en vivo una vez mostrado; también si el
  // servidor rechazó la contraseña o los términos.
  const completeFieldInvalid = (field: CompleteField) =>
    (completionTouched[field] || (field in completionServerCodes)) &&
    (completionError(field, completion) !== null || field in completionServerCodes);

  const completeErrorText = (field: CompleteField): string => {
    const kind = completionError(field, completion);
    switch (field) {
      case "password":
        return t("errors.password");
      case "confirmPassword":
        return kind === "mismatch" ? t("errors.confirmPassword.mismatch") : t("errors.confirmPassword.required");
      case "acceptedTerms":
        return t("errors.acceptedTerms");
    }
  };

  const setCompletionField = <K extends keyof CompletionValues>(field: K, value: CompletionValues[K]) => {
    setCompletion((c) => ({ ...c, [field]: value }));
    setCompletionServerCodes((c) => {
      const next = { ...c };
      delete next[field as "password" | "acceptedTerms"];
      return next;
    });
    setCompleteError(null);
  };

  const touchCompletion = (field: CompleteField) => setCompletionTouched((s) => ({ ...s, [field]: true }));

  const suggestedEmail = emailSuggestion(values.email);

  // Cambiar el tipo reajusta la máscara y conserva los dígitos que siguen siendo válidos y lo escrito en lo que sigue
  // aplicando (correo, teléfono...); vacía los campos del otro tipo (y sus errores). Se vuelve a validar solo.
  const changeType = (type: IdType) => {
    if (type === values.idType) return;
    const cleared = fieldsClearedByType(type);
    setValues((v) => applyIdType(v, type));
    setTouched((s) => Object.fromEntries(Object.entries(s).filter(([field]) => !cleared.includes(field as RegistrationField))));
    setServerCodes((c) => Object.fromEntries(Object.entries(c).filter(([field]) => !cleared.includes(field as RegistrationField))));
    setFormError(null);
  };

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
    setTouched({});
    setServerCodes({});
    setFormError(null);
    setAttemptId("");
    setCode("");
    setCodeError(null);
    clearCompletion();
    setCaptchaReset((n) => n + 1);
  };

  // Borra la contraseña (y todo el estado del paso 3) del componente.
  const clearCompletion = () => {
    setCompletion(EMPTY_COMPLETION);
    setCompletionTouched({});
    setCompletionServerCodes({});
    setShowPassword(false);
    setShowConfirm(false);
    setPhase("form");
    setProcessingRetries(0);
    setCompleteError(null);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setTouched(Object.fromEntries(fieldsFor(values.idType).map((f) => [f, true])));
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
    const res = await post("start", buildStartBody(values, captchaToken));
    setSubmitting(false);

    if (res.status === 200 && typeof (res.body as { attemptId?: unknown } | null)?.attemptId === "string") {
      setAttemptId((res.body as { attemptId: string }).attemptId);
      setEmail(normalizeEmail(values.email));
      setCode("");
      setCodeError(null);
      setStep(2);
      return;
    }

    const error = classifyRegisterError(res.status, res.body);
    setFormError(error.kind);
    setServerCodes(Object.fromEntries(error.fields.map((field) => [field, error.fieldCodes[field] ?? ""])));
    setCaptchaReset((n) => n + 1);
    const firstWithError = fieldsFor(values.idType).find((field) => error.fields.includes(field));
    if (firstWithError) document.getElementById(`reg-${firstWithError}`)?.focus();
  };

  // Envía register/complete con la contraseña del estado. Resultados: created / processing (se reintenta solo hasta
  // PROCESSING_RETRIES veces, cada PROCESSING_RETRY_MS) / validation (el servidor rechazó un campo) / el resto.
  const runComplete = async () => {
    setPhase("working");
    setCompleteError(null);
    const res = await post("complete", buildCompleteBody(attemptId, completionRef.current));
    const outcome: CompleteOutcome = completeOutcome(res.status, res.body);

    if (outcome === "created") {
      setCompletion(EMPTY_COMPLETION); // la contraseña ya no hace falta: se borra
      setShowPassword(false);
      setShowConfirm(false);
      setPhase("created");
      return;
    }
    if (outcome === "processing") {
      setPhase("processing");
      return;
    }
    if (outcome === "validation") {
      const error = classifyRegisterError(res.status, res.body);
      setCompletionServerCodes(
        Object.fromEntries(error.fields.filter((f) => f === "password" || f === "acceptedTerms").map((f) => [f, error.fieldCodes[f] ?? ""])),
      );
      setCompleteError("validation");
      setPhase("form");
      const first = (["password", "acceptedTerms"] as const).find((f) => error.fields.includes(f));
      if (first) document.getElementById(`reg-${first}`)?.focus();
      return;
    }
    if (outcome === "failed" || outcome === "restart" || outcome === "disabled") {
      setCompletion(EMPTY_COMPLETION); // sin posibilidad de reintentar a ciegas: se borra la contraseña
    }
    setPhase(outcome);
  };

  // AX todavía está creando la cuenta (registration_processing): reintenta solo, hasta PROCESSING_RETRIES veces cada
  // PROCESSING_RETRY_MS conservando la contraseña SOLO en el estado del componente; luego ofrece "Reintentar".
  useEffect(() => {
    if (phase !== "processing") return;
    const exhausted = processingRetries >= PROCESSING_RETRIES;
    const timer = setTimeout(
      () => {
        if (exhausted) {
          setPhase("retry"); // se agotaron los reintentos automáticos: se ofrece "Reintentar"
          return;
        }
        setProcessingRetries((n) => n + 1);
        void runComplete();
      },
      exhausted ? 0 : PROCESSING_RETRY_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, processingRetries]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "working") return;

    setCompletionTouched(Object.fromEntries(["password", "confirmPassword", "acceptedTerms"].map((f) => [f, true])));
    const bad = invalidCompletionFields(completion);
    if (bad.length > 0) {
      setCompleteError("validation");
      document.getElementById(`reg-${bad[0]}`)?.focus();
      return;
    }
    setProcessingRetries(0);
    await runComplete();
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
      clearCompletion();
      setStep(3);
      return;
    }

    setCodeError(classifyRegisterError(res.status, res.body).kind);
    document.getElementById("reg-code")?.focus();
  };

  const passwordRules = passwordChecks(completion.password);

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

  // Pie del paso 3 (formulario de contraseña): error general + botón principal "Crear mi cuenta". Fuera del scroll (ver footerTarget).
  const completeFooter = (
    <>
      {completeError === "validation" && <FormAlert>{t("errors.form.validation")}</FormAlert>}
      <button
        type="submit"
        form={COMPLETE_FORM_ID}
        disabled={phase === "working"}
        className={PRIMARY_BUTTON}
        style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
      >
        {phase === "working" ? t("step3.submitting") : t("step3.submit")}
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
            required
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
          {values.idType === "fisica" ? (
            <>
              <TextField
                field="firstName"
                label={t("fields.firstName.label")}
                hint={t("fields.firstName.hint")}
                autoComplete="given-name"
                maxLength={NAME_LIMITS.firstName.max}
                required
                value={values.firstName}
                invalid={fieldInvalid("firstName")}
                error={fieldErrorText("firstName")}
                onChange={(v) => setField("firstName", v)}
                onBlur={() => touch("firstName")}
              />
              <TextField
                field="lastName1"
                label={t("fields.lastName1.label")}
                autoComplete="family-name"
                maxLength={NAME_LIMITS.lastName1.max}
                required
                value={values.lastName1}
                invalid={fieldInvalid("lastName1")}
                error={fieldErrorText("lastName1")}
                onChange={(v) => setField("lastName1", v)}
                onBlur={() => touch("lastName1")}
              />
              <TextField
                field="lastName2"
                label={t("fields.lastName2.label")}
                hint={t("fields.lastName2.hint")}
                autoComplete="additional-name"
                maxLength={NAME_LIMITS.lastName2.max}
                value={values.lastName2}
                invalid={fieldInvalid("lastName2")}
                error={fieldErrorText("lastName2")}
                onChange={(v) => setField("lastName2", v)}
                onBlur={() => touch("lastName2")}
              />
            </>
          ) : (
            <>
              <TextField
                field="legalName"
                label={t("fields.legalName.label")}
                hint={t("fields.legalName.hint")}
                autoComplete="organization"
                maxLength={NAME_LIMITS.legalName.max}
                required
                value={values.legalName}
                invalid={fieldInvalid("legalName")}
                error={fieldErrorText("legalName")}
                onChange={(v) => setField("legalName", v)}
                onBlur={() => touch("legalName")}
              />
              <TextField
                field="tradeName"
                label={t("fields.tradeName.label")}
                hint={t("fields.tradeName.hint")}
                autoComplete="off"
                maxLength={NAME_LIMITS.tradeName.max}
                value={values.tradeName}
                invalid={fieldInvalid("tradeName")}
                error={fieldErrorText("tradeName")}
                onChange={(v) => setField("tradeName", v)}
                onBlur={() => touch("tradeName")}
              />
            </>
          )}
          <TextField
            field="email"
            required
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
            required
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

          {/* Mismo texto siempre: la pantalla no puede distinguir un registro nuevo de uno con datos que ya existían. */}
          <p className="text-[13px] leading-snug" style={{ color: TEXT_MUTED }}>
            {t("step2.noCode")}
          </p>

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

      {step === 3 && (phase === "form" || phase === "working") && (
        <form id={COMPLETE_FORM_ID} onSubmit={handleComplete} noValidate aria-busy={phase === "working"} className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-corp-ink outline-none"
              style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
            >
              {t("step3.title")}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("step3.intro")}
            </p>
          </div>

          <TextField
            field="password"
            required
            label={t("fields.password.label")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={completion.password}
            invalid={completeFieldInvalid("password")}
            error={completeErrorText("password")}
            describedBy="reg-password-rules"
            onChange={(v) => setCompletionField("password", v)}
            onBlur={() => touchCompletion("password")}
          >
            <button
              type="button"
              aria-pressed={showPassword}
              aria-controls="reg-password"
              onClick={() => setShowPassword((s) => !s)}
              className={`self-start rounded text-[13px] font-semibold underline underline-offset-4 ${FOCUS_RING}`}
              style={{ color: "#075FD8" }}
            >
              {showPassword ? t("fields.password.hide") : t("fields.password.show")}
            </button>
            <div id="reg-password-rules" className={`flex flex-col ${LABEL} text-[13px]`} style={{ color: TEXT_MUTED }}>
              <p className="font-semibold">{t("passwordRules.title")}</p>
              <ul className={`flex flex-col ${LABEL}`}>
                {(["length", "letter", "digit", "edges"] as const).map((rule) => (
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

          <TextField
            field="confirmPassword"
            required
            label={t("fields.confirmPassword.label")}
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={completion.confirmPassword}
            invalid={completeFieldInvalid("confirmPassword")}
            error={completeErrorText("confirmPassword")}
            onChange={(v) => setCompletionField("confirmPassword", v)}
            onBlur={() => touchCompletion("confirmPassword")}
          >
            <button
              type="button"
              aria-pressed={showConfirm}
              aria-controls="reg-confirmPassword"
              onClick={() => setShowConfirm((s) => !s)}
              className={`self-start rounded text-[13px] font-semibold underline underline-offset-4 ${FOCUS_RING}`}
              style={{ color: "#075FD8" }}
            >
              {showConfirm ? t("fields.password.hide") : t("fields.password.show")}
            </button>
          </TextField>

          <div className={`flex flex-col ${FIELD}`}>
            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-snug" style={{ color: INK }}>
              <input
                id="reg-acceptedTerms"
                type="checkbox"
                checked={completion.acceptedTerms}
                aria-required="true"
                aria-invalid={completeFieldInvalid("acceptedTerms") || undefined}
                aria-describedby={completeFieldInvalid("acceptedTerms") ? "reg-acceptedTerms-error" : undefined}
                onChange={(e) => {
                  setCompletionField("acceptedTerms", e.target.checked);
                  touchCompletion("acceptedTerms");
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
            {completeFieldInvalid("acceptedTerms") && <FieldError id="reg-acceptedTerms-error">{completeErrorText("acceptedTerms")}</FieldError>}
          </div>

          {footerTarget === undefined ? <div className={`flex flex-col ${FIELD}`}>{completeFooter}</div> : null}
        </form>
      )}

      {step === 3 && (phase === "form" || phase === "working") && footerTarget ? createPortal(completeFooter, footerTarget) : null}

      {step === 3 && phase === "processing" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.processingTitle")}
          </h3>
          <div role="status" aria-live="polite" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.processingBody")}
          </div>
        </div>
      )}

      {step === 3 && phase === "created" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.createdTitle")}
          </h3>
          <div role="status" aria-live="polite" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.createdBody")}
          </div>
          {/* Sin iniciar sesión automáticamente: la persona entra con su cédula y la contraseña que eligió. */}
          <button
            type="button"
            onClick={onBackToLogin}
            className={PRIMARY_BUTTON}
            style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
          >
            {t("step3.login")}
          </button>
        </div>
      )}

      {step === 3 && phase === "retry" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.retryTitle")}
          </h3>
          <div role="alert" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.retryBody")}
          </div>
          <button
            type="button"
            onClick={() => {
              setProcessingRetries(0);
              void runComplete();
            }}
            className={PRIMARY_BUTTON}
            style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
          >
            {t("step3.retry")}
          </button>
        </div>
      )}

      {step === 3 && phase === "failed" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.failedTitle")}
          </h3>
          <div role="alert" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.failedBody")}
          </div>
          <button type="button" onClick={onBackToLogin} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("step3.login")}
          </button>
          <button type="button" onClick={restart} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("step2.restart")}
          </button>
        </div>
      )}

      {step === 3 && phase === "restart" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.restartTitle")}
          </h3>
          <div role="alert" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.restartBody")}
          </div>
          <button type="button" onClick={restart} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("step2.restart")}
          </button>
        </div>
      )}

      {step === 3 && phase === "disabled" && (
        <div className={`${STEP_TOP} flex flex-col ${BLOCK}`}>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-corp-ink outline-none"
            style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("step3.disabledTitle")}
          </h3>
          <div role="status" aria-live="polite" className="text-[15px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("step3.disabledBody")}
          </div>
          <button type="button" onClick={onBackToLogin} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("step3.home")}
          </button>
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
  required = false,
  children,
}: {
  field: RegistrationField | CompleteField | "code";
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
  // Obligatorio (aria-required). El código, el correo, el teléfono, etc. lo son por defecto en su llamada; los
  // opcionales (segundo apellido, nombre comercial) no lo pasan.
  required?: boolean;
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
        aria-required={required || undefined}
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
