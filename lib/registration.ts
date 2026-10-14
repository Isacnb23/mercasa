// Lógica pura del registro de clientes (sin React ni Next, para probarla con el test runner de Node).
// Las reglas de campos repiten las del servidor (homex-api RegistrationValidator): el servidor es la
// autoridad; aquí solo sirven para validar en vivo y no mandar datos que seguro se rechazan.

export type RegistrationField = "name" | "idNumber" | "email" | "phone" | "password" | "acceptedTerms";

export interface RegistrationValues {
  name: string;
  idNumber: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
}

export const EMPTY_VALUES: RegistrationValues = {
  name: "",
  idNumber: "",
  email: "",
  phone: "",
  password: "",
  acceptedTerms: false,
};

export const FIELD_ORDER: RegistrationField[] = ["name", "idNumber", "email", "phone", "password", "acceptedTerms"];

export const CODE_LENGTH = 6;

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

// Física: 9 dígitos (no empieza con 0). Jurídica: 10 dígitos que empiezan con 3.
export function isValidIdNumber(value: string): boolean {
  const digits = digitsOnly(value);
  return (digits.length === 9 && digits[0] !== "0") || (digits.length === 10 && digits[0] === "3");
}

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length >= 6 && email.length <= 120 && EMAIL_PATTERN.test(email);
}

// Teléfono de Costa Rica: 8 dígitos que empiezan con 2, 4, 5, 6, 7 u 8; admite +506 delante.
export function isValidPhone(value: string): boolean {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("506")) digits = digits.slice(3);
  return digits.length === 8 && "245678".includes(digits[0]);
}

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
}

export function passwordChecks(value: string): PasswordChecks {
  return {
    length: value.length >= 8 && value.length <= 64,
    upper: /\p{Lu}/u.test(value),
    lower: /\p{Ll}/u.test(value),
    digit: /\d/.test(value),
  };
}

export const isValidPassword = (value: string) => Object.values(passwordChecks(value)).every(Boolean);

export function isValidName(value: string): boolean {
  const name = value.trim();
  return name.length >= 3 && name.length <= 100 && /\p{L}/u.test(name);
}

// true si el campo es válido.
export function validateField(field: RegistrationField, values: RegistrationValues): boolean {
  switch (field) {
    case "name":
      return isValidName(values.name);
    case "idNumber":
      return isValidIdNumber(values.idNumber);
    case "email":
      return isValidEmail(values.email);
    case "phone":
      return isValidPhone(values.phone);
    case "password":
      return isValidPassword(values.password);
    case "acceptedTerms":
      return values.acceptedTerms;
  }
}

export const invalidFields = (values: RegistrationValues): RegistrationField[] =>
  FIELD_ORDER.filter((field) => !validateField(field, values));

export const isCodeComplete = (value: string) => digitsOnly(value).length === CODE_LENGTH;

// ---- Respuestas del servidor ----

// Tipos de resultado que la pantalla sabe mostrar.
export type RegisterErrorKind =
  | "validation" // 400 validation_failed (con `fields`)
  | "duplicate" // 409 registration_unavailable (genérico: no dice si es cédula o correo)
  | "codeInvalid" // 400 code_invalid
  | "codeExpired" // 410
  | "notVerified" // 409 not_verified
  | "rateLimited" // 429
  | "captcha" // captcha_failed
  | "captchaUnavailable"
  | "disabled" // 503 registration_disabled o registration_not_available
  | "unavailable"; // cualquier otra falla

export interface RegisterApiError {
  kind: RegisterErrorKind;
  fields: RegistrationField[];
}

function knownFields(value: unknown): RegistrationField[] {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is RegistrationField => typeof f === "string" && (FIELD_ORDER as string[]).includes(f));
}

export function classifyRegisterError(status: number, body: unknown): RegisterApiError {
  const code = typeof (body as { code?: unknown } | null)?.code === "string" ? (body as { code: string }).code : "";
  const fields = knownFields((body as { fields?: unknown } | null)?.fields);

  if (code === "captcha_failed") return { kind: "captcha", fields };
  if (code === "captcha_unavailable") return { kind: "captchaUnavailable", fields };
  if (status === 429 || code === "rate_limited") return { kind: "rateLimited", fields };
  if (code === "validation_failed" || (status === 400 && code === "")) return { kind: "validation", fields };
  if (code === "code_invalid") return { kind: "codeInvalid", fields };
  if (status === 410 || code === "code_expired") return { kind: "codeExpired", fields };
  if (code === "not_verified") return { kind: "notVerified", fields };
  if (code === "registration_unavailable" || status === 409) return { kind: "duplicate", fields };
  if (code === "registration_disabled" || code === "registration_not_available") return { kind: "disabled", fields };
  return { kind: "unavailable", fields };
}

// Qué muestra el paso 3 según la respuesta de complete.
export type CompleteOutcome = "pending" | "disabled" | "retry" | "restart";

export function completeOutcome(status: number, body: unknown): CompleteOutcome {
  if (status === 200) return "pending";
  const { kind } = classifyRegisterError(status, body);
  if (kind === "disabled") return "disabled";
  if (kind === "codeExpired" || kind === "notVerified") return "restart";
  return "retry";
}

// Claves del cuerpo que la web deja pasar de mercasa-api al navegador.
const ALLOWED_RESPONSE_KEYS = ["code", "message", "fields", "attemptId", "expiresInSeconds", "verified", "status"] as const;

export function pickAllowedResponse(body: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body !== "object" || body === null || Array.isArray(body)) return out;
  for (const key of ALLOWED_RESPONSE_KEYS) {
    const value = (body as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (Array.isArray(value)) out[key] = value.filter((v) => typeof v === "string");
  }
  return out;
}

// Estados que se reenvían tal cual al navegador; todo lo demás sale como 503 service_unavailable.
export const FORWARDED_STATUSES = [200, 400, 409, 410, 429, 503];

// Cuerpos de entrada por paso: solo los campos conocidos y con tope de tamaño (lo demás se descarta).
const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export type RegisterStep = "start" | "verify" | "complete";

export function sanitizeRegisterBody(step: RegisterStep, raw: unknown): Record<string, unknown> {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (step === "start") {
    return {
      name: text(body.name, 120),
      idNumber: text(body.idNumber, 20),
      email: text(body.email, 130),
      phone: text(body.phone, 20),
      password: text(body.password, 80),
      acceptedTerms: body.acceptedTerms === true,
    };
  }
  if (step === "verify") return { attemptId: text(body.attemptId, 64), code: text(body.code, 12) };
  return { attemptId: text(body.attemptId, 64) };
}

// Cédula enmascarada para registros (últimos 3 dígitos).
export function maskIdNumber(value: string): string {
  const digits = digitsOnly(value);
  return digits.length <= 3 ? "***" : "*".repeat(digits.length - 3) + digits.slice(-3);
}
