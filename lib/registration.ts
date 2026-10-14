// Lógica pura del registro de clientes (sin React ni Next, para probarla con el test runner de Node).
//
// Las reglas de campos son IDÉNTICAS a las del servidor (homex-api, RegistrationValidator.cs) y se prueban con las
// mismas tablas de casos en los dos lados (lib/__tests__/registration.test.mjs y MercasaVIP.Tests/RegistrationTests.cs).
// El servidor es la autoridad; aquí sirven para las máscaras y para validar en vivo.
//
//   Cédula    física: 9 dígitos, el primero de 1 a 9 (máscara 0-0000-0000)
//             jurídica: 10 dígitos que empiezan por 3 (máscara 3-000-000000)
//             DIMEX/pasaporte: NO se aceptan (decisión pendiente para extranjeros).
//   Teléfono  8 dígitos que empiezan por 2, 4, 5, 6, 7 u 8 (máscara 8888-7777)
//   Correo    sin espacios alrededor, en minúsculas, hasta 254 caracteres, una sola @, dominio con punto
//   Nombre    3 a 100 caracteres; física: solo letras (más espacio ' - .), sin dígitos y al menos dos palabras;
//             jurídica: letras, números, espacio y . , & -
//   Contraseña 8 a 64 con mayúscula, minúscula y número

export type RegistrationField = "name" | "idNumber" | "email" | "phone" | "password" | "acceptedTerms";

export type IdType = "fisica" | "juridica";

export const ID_TYPES: IdType[] = ["fisica", "juridica"];

export interface RegistrationValues {
  name: string;
  idType: IdType;
  // Solo dígitos (la máscara se aplica al mostrarlos).
  idNumber: string;
  email: string;
  // Solo dígitos (la máscara se aplica al mostrarlos).
  phone: string;
  password: string;
  acceptedTerms: boolean;
}

export const EMPTY_VALUES: RegistrationValues = {
  name: "",
  idType: "fisica",
  idNumber: "",
  email: "",
  phone: "",
  password: "",
  acceptedTerms: false,
};

export const FIELD_ORDER: RegistrationField[] = ["idNumber", "name", "email", "phone", "password", "acceptedTerms"];

export const CODE_LENGTH = 6;

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

// ---- Cédula ----

// Largo y agrupación de la máscara por tipo (0-0000-0000 y 3-000-000000).
export const ID_RULES: Record<IdType, { length: number; groups: number[] }> = {
  fisica: { length: 9, groups: [1, 4, 4] },
  juridica: { length: 10, groups: [1, 3, 6] },
};

export const isIdType = (value: unknown): value is IdType => value === "fisica" || value === "juridica";

// Lo que se escribe o se pega (con espacios, guiones, letras): solo dígitos y sin pasar del largo del tipo.
export const normalizeIdInput = (raw: string, type: IdType): string => digitsOnly(raw).slice(0, ID_RULES[type].length);

// Dígitos -> texto con la máscara del tipo ("1-1111-1111" / "3-000-000000"), sin guiones de más mientras se escribe.
export function formatIdNumber(digits: string, type: IdType): string {
  const parts: string[] = [];
  let at = 0;
  for (const size of ID_RULES[type].groups) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  return parts.join("-");
}

// null = válida. "length": largo distinto del que pide el tipo (también vacía). "prefix": primer dígito no válido
// (física no empieza por 0; jurídica empieza por 3).
export function idNumberError(digits: string, type: IdType): "length" | "prefix" | null {
  if (digits.length !== ID_RULES[type].length) return "length";
  const validFirst = type === "fisica" ? digits[0] !== "0" : digits[0] === "3";
  return validFirst ? null : "prefix";
}

// Al cambiar el tipo se conservan los dígitos que siguen siendo válidos: se recortan al largo nuevo y, si el tipo
// nuevo es jurídica y el primer dígito no es 3, no queda ninguno (ninguno serviría).
export function changeIdType(digits: string, next: IdType): string {
  const trimmed = digits.slice(0, ID_RULES[next].length);
  if (next === "juridica" && trimmed.length > 0 && trimmed[0] !== "3") return "";
  if (next === "fisica" && trimmed.length > 0 && trimmed[0] === "0") return "";
  return trimmed;
}

// ---- Teléfono ----

// Solo dígitos, máximo 8 (también al pegar). Si pegan +506 y 8 dígitos (11 en total) se quita el 506.
export function normalizePhoneInput(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("506")) digits = digits.slice(3);
  return digits.slice(0, 8);
}

export const formatPhone = (digits: string): string => (digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits);

// null = válido. "length": no son 8 dígitos (falta o sobra). "prefix": no empieza por 2, 4, 5, 6, 7 u 8.
export function phoneError(digits: string): "length" | "prefix" | null {
  if (digits.length !== 8) return "length";
  return "245678".includes(digits[0]) ? null : "prefix";
}

// ---- Correo ----

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

// Recibe el correo ya normalizado (normalizeEmail).
export function isValidEmail(normalized: string): boolean {
  if (normalized.length < 6 || normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) return false;
  const local = normalized.slice(0, normalized.indexOf("@"));
  return local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !normalized.includes("..");
}

// Errores de dominio frecuentes -> dominio correcto. Solo sugiere; nunca bloquea el envío.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
};

// Correo completo sugerido ("persona@gmail.com") o null si el dominio no es un error conocido.
export function emailSuggestion(value: string): string | null {
  const email = normalizeEmail(value);
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = DOMAIN_TYPOS[email.slice(at + 1)];
  return fixed ? `${email.slice(0, at)}@${fixed}` : null;
}

// ---- Nombre ----

export const normalizeName = (value: string): string => value.trim().replace(/\s+/g, " ");

// null = válido. "digits": física con dígitos. "surname": física con una sola palabra (falta el apellido).
// "invalid": largo, caracteres no permitidos o sin letras.
export function nameError(value: string, type: IdType): "invalid" | "digits" | "surname" | null {
  const name = normalizeName(value);
  if (name.length < 3 || name.length > 100 || !/\p{L}/u.test(name)) return "invalid";

  if (type === "juridica") return /^[\p{L}\p{N} .,&-]+$/u.test(name) ? null : "invalid";

  if (/\p{N}/u.test(name)) return "digits";
  if (!/^[\p{L} '.-]+$/u.test(name)) return "invalid";
  const words = name.split(" ").filter((word) => /\p{L}/u.test(word)).length;
  return words >= 2 ? null : "surname";
}

// ---- Contraseña ----

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

// ---- Campos del formulario ----

// Tipo de error de un campo (null = válido). Cada tipo tiene su propio mensaje en la pantalla.
export type FieldErrorKind = "invalid" | "length" | "prefix" | "digits" | "surname";

export function fieldError(field: RegistrationField, values: RegistrationValues): FieldErrorKind | null {
  switch (field) {
    case "name":
      return nameError(values.name, values.idType);
    case "idNumber":
      return idNumberError(values.idNumber, values.idType);
    case "email":
      return isValidEmail(normalizeEmail(values.email)) ? null : "invalid";
    case "phone":
      return phoneError(values.phone);
    case "password":
      return isValidPassword(values.password) ? null : "invalid";
    case "acceptedTerms":
      return values.acceptedTerms ? null : "invalid";
  }
}

// true si el campo es válido.
export const validateField = (field: RegistrationField, values: RegistrationValues): boolean => fieldError(field, values) === null;

export const invalidFields = (values: RegistrationValues): RegistrationField[] =>
  FIELD_ORDER.filter((field) => !validateField(field, values));

export const isCodeComplete = (value: string) => digitsOnly(value).length === CODE_LENGTH;

// ---- Respuestas del servidor ----

// Tipos de resultado que la pantalla sabe mostrar.
export type RegisterErrorKind =
  | "validation" // 400 validation_failed (con `fields` y `fieldErrors`)
  | "duplicate" // 409 registration_unavailable (genérico: no dice si es cédula o correo)
  | "codeInvalid" // 400 code_invalid
  | "codeExpired" // 410
  | "notVerified" // 409 not_verified
  | "rateLimited" // 429
  | "captcha" // captcha_failed
  | "captchaUnavailable"
  | "disabled" // 503 registration_disabled o registration_not_available
  | "unavailable"; // cualquier otra falla

// Códigos de error por campo del servidor ("campo:codigo"), ya separados.
export type ServerFieldCodes = Partial<Record<RegistrationField, string>>;

export interface RegisterApiError {
  kind: RegisterErrorKind;
  fields: RegistrationField[];
  fieldCodes: ServerFieldCodes;
}

function knownFields(value: unknown): RegistrationField[] {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is RegistrationField => typeof f === "string" && (FIELD_ORDER as string[]).includes(f));
}

// ["idNumber:invalid_id_length", ...] -> { idNumber: "invalid_id_length" }. Ignora lo que no sea un campo conocido.
export function parseFieldCodes(value: unknown): ServerFieldCodes {
  const out: ServerFieldCodes = {};
  if (!Array.isArray(value)) return out;
  for (const item of value) {
    if (typeof item !== "string") continue;
    const [field, code] = item.split(":");
    if ((FIELD_ORDER as string[]).includes(field) && code && !(field in out)) out[field as RegistrationField] = code;
  }
  return out;
}

// Código del servidor -> tipo de error del campo (el mismo que calcula el navegador). Un código que el navegador
// no conoce cae en `fallback` (el campo igual se marca como inválido).
export function serverErrorKind(field: RegistrationField, code: string | undefined, fallback: FieldErrorKind): FieldErrorKind {
  if (field === "idNumber") return code === "invalid_id_length" ? "length" : code === "invalid_id" ? "prefix" : fallback;
  return fallback;
}

export function classifyRegisterError(status: number, body: unknown): RegisterApiError {
  const code = typeof (body as { code?: unknown } | null)?.code === "string" ? (body as { code: string }).code : "";
  const fields = knownFields((body as { fields?: unknown } | null)?.fields);
  const fieldCodes = parseFieldCodes((body as { fieldErrors?: unknown } | null)?.fieldErrors);
  const result = (kind: RegisterErrorKind): RegisterApiError => ({ kind, fields, fieldCodes });

  if (code === "captcha_failed") return result("captcha");
  if (code === "captcha_unavailable") return result("captchaUnavailable");
  if (status === 429 || code === "rate_limited") return result("rateLimited");
  if (code === "validation_failed" || (status === 400 && code === "")) return result("validation");
  if (code === "code_invalid") return result("codeInvalid");
  if (status === 410 || code === "code_expired") return result("codeExpired");
  if (code === "not_verified") return result("notVerified");
  if (code === "registration_unavailable" || status === 409) return result("duplicate");
  if (code === "registration_disabled" || code === "registration_not_available") return result("disabled");
  return result("unavailable");
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
const ALLOWED_RESPONSE_KEYS = ["code", "message", "fields", "fieldErrors", "attemptId", "expiresInSeconds", "verified", "status"] as const;

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
      idType: text(body.idType, 12),
      idNumber: text(body.idNumber, 20),
      email: text(body.email, 260),
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
