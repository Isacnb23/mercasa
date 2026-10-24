// Registro de clientes: validaciones de campos, clasificación de respuestas, cuerpos permitidos, captcha, render del
// paso 1 (es/en con los textos reales), llaves es/en iguales y garantías de seguridad/accesibilidad en el código.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, stubModule, React } from "./helpers/load-tsx.mjs";
import {
  ID_TYPES,
  applyIdType,
  buildStartBody,
  changeIdType,
  classifyRegisterError,
  completeOutcome,
  emailSuggestion,
  fieldError,
  fieldsClearedByType,
  fieldsFor,
  firstNameError,
  formatIdNumber,
  formatPhone,
  idNumberError,
  invalidFields,
  isCodeComplete,
  isValidEmail,
  invalidCompletionFields,
  completionError,
  buildCompleteBody,
  isValidPassword,
  PASSWORD_LIMITS,
  PROCESSING_RETRIES,
  PROCESSING_RETRY_MS,
  FORWARDED_STATUSES,
  lastName1Error,
  lastName2Error,
  legalNameError,
  maskIdNumber,
  normalizeEmail,
  normalizeIdInput,
  normalizeName,
  normalizePhoneInput,
  parseFieldCodes,
  passwordChecks,
  phoneError,
  pickAllowedResponse,
  sanitizeRegisterBody,
  serverErrorKind,
  tradeNameError,
} from "../registration.ts";
import { DEV_DISABLED_TOKEN, resolveCaptchaMode } from "../captcha-config.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

// Datos inventados y claramente falsos.
const valid = {
  idType: "fisica",
  idNumber: "111111111",
  firstName: "Persona",
  lastName1: "Ejemplo",
  lastName2: "Prueba",
  legalName: "",
  tradeName: "",
  email: "persona@ejemplo.com",
  phone: "88887777",
};
// Paso 3 (datos inventados).
const validCompletion = { password: "Clave-Inventada1", confirmPassword: "Clave-Inventada1", acceptedTerms: true };
const validJuridica = { ...valid, idType: "juridica", idNumber: "3000000000", firstName: "", lastName1: "", lastName2: "", legalName: "Ejemplo S.A.", tradeName: "Ejemplo Tienda" };

// ---- Campos: TABLAS DE CASOS COMPARTIDAS con homex-api (MercasaVIP.Tests/RegistrationTests.cs) ----
// Los mismos casos y los mismos resultados en los dos lados. Si cambia una regla, cambian las dos tablas.

// [tipo, texto escrito, código del servidor que le corresponde (null = válida)]
const ID_CASES = [
  ["fisica", "1-1111-1111", null],
  ["fisica", "111111111", null],
  ["fisica", "1 1111 1111", null],
  ["fisica", "911111111", null],
  ["fisica", "011111111", "invalid_id"],
  ["fisica", "11111111", "invalid_id_length"],
  ["fisica", "1111111111", "invalid_id_length"],
  ["fisica", "11111111111", "invalid_id_length"],
  ["fisica", "", "invalid_id_length"],
  ["juridica", "3-000-000000", null],
  ["juridica", "3000000000", null],
  ["juridica", "4000000000", "invalid_id"],
  ["juridica", "1111111111", "invalid_id"],
  ["juridica", "300000000", "invalid_id_length"],
  ["juridica", "30000000000", "invalid_id_length"],
];

// La web nunca guarda más dígitos que el largo del tipo: se compara el texto ya normalizado "como se escribe"
// (el servidor recibe los dígitos completos, por eso aquí se usa el largo sin recortar).
const idErrorLikeServer = (type, text) => {
  const digits = text.replace(/\D/g, "");
  if (digits.length !== (type === "fisica" ? 9 : 10)) return "invalid_id_length";
  return idNumberError(digits, type) === null ? null : "invalid_id";
};

test("cédula por tipo: mismos casos y mismos códigos que el servidor", () => {
  for (const [type, input, expected] of ID_CASES) assert.equal(idErrorLikeServer(type, input), expected, `${type} ${input}`);
});

test("cédula: tipo físico/jurídico, máscara, tope de dígitos (también al pegar) y sin letras", () => {
  assert.deepEqual(ID_TYPES, ["fisica", "juridica"]);
  assert.equal(formatIdNumber("111111111", "fisica"), "1-1111-1111");
  assert.equal(formatIdNumber("3000000000", "juridica"), "3-000-000000");
  assert.equal(formatIdNumber("1111", "fisica"), "1-111"); // sin guiones de más mientras se escribe
  assert.equal(formatIdNumber("", "fisica"), "");
  assert.equal(normalizeIdInput("1-1111-1111-9999", "fisica"), "111111111"); // pegado largo: se corta en 9
  assert.equal(normalizeIdInput("  3 000 000000 99 ", "juridica"), "3000000000"); // espacios y guiones se limpian
  assert.equal(normalizeIdInput("1a1b1", "fisica"), "111"); // solo dígitos
  assert.equal(idNumberError("", "fisica"), "length");
  assert.equal(idNumberError("011111111", "fisica"), "prefix");
  assert.equal(idNumberError("4000000000", "juridica"), "prefix");
});

test("cambiar el tipo conserva los dígitos que siguen siendo válidos y reajusta el largo", () => {
  assert.equal(changeIdType("111111111", "juridica"), ""); // empieza por 1: ninguno sirve en jurídica
  assert.equal(changeIdType("3000000000", "fisica"), "300000000"); // se recorta a 9
  assert.equal(changeIdType("3000", "juridica"), "3000"); // sigue siendo válido
  assert.equal(changeIdType("3000", "fisica"), "3000");
  assert.equal(changeIdType("", "juridica"), "");
  assert.equal(formatIdNumber(changeIdType("3000000000", "fisica"), "fisica"), "3-0000-0000");
});

const PHONE_CASES = [
  ["88887777", true],
  ["8888-7777", true],
  ["+506 8888-7777", true],
  ["22223333", true],
  ["45556666", true],
  ["18887777", false],
  ["38887777", false],
  ["98887777", false],
  ["8888777", false],
  ["888877770", false],
  ["8888777700", false],
  ["", false],
];

test("teléfono: mismos casos que el servidor", () => {
  for (const [input, ok] of PHONE_CASES) {
    // El servidor valida los 8 dígitos del cuerpo; la web valida lo ya normalizado (nunca más de 8). Un teléfono de
    // más de 8 dígitos no se puede escribir, así que esos casos se rechazan por largo en el servidor.
    const digits = input.replace(/\D/g, "");
    const normalized = digits.length === 11 && digits.startsWith("506") ? digits.slice(3) : digits;
    assert.equal(phoneError(normalized) === null, ok, input);
  }
});

test("teléfono: máscara 8888-7777, tope de 8 dígitos (también al pegar), +506 se quita, mensajes por causa", () => {
  assert.equal(formatPhone("8888"), "8888");
  assert.equal(formatPhone("88887"), "8888-7");
  assert.equal(formatPhone("88887777"), "8888-7777");
  assert.equal(normalizePhoneInput("8888-7777"), "88887777");
  assert.equal(normalizePhoneInput("8888777712345"), "88887777"); // pegado largo: se corta en 8
  assert.equal(normalizePhoneInput("+506 8888-7777"), "88887777"); // 506 + 8 dígitos
  assert.equal(normalizePhoneInput("506"), "506"); // un 506 escrito a mano no se toca (puede ser el inicio del número)
  assert.equal(normalizePhoneInput("abc8x8"), "88");
  assert.equal(phoneError("8888777"), "length"); // falta
  assert.equal(phoneError("18887777"), "prefix");
});

const EMAIL_CASES = [
  ["persona@ejemplo.com", true],
  ["  Persona@Ejemplo.COM  ", true],
  ["a.b+c@sub.ejemplo.co.cr", true],
  ["a@b.co", true],
  ["sin-arroba.ejemplo.com", false],
  ["a@b", false],
  ["a@@ejemplo.com", false],
  ["a b@ejemplo.com", false],
  ["a@ejemplo..com", false],
  [".a@ejemplo.com", false],
  ["a.@ejemplo.com", false],
  ["a@-ejemplo.com", false],
  ["a@ejemplo.c", false],
  ["a@ejemplo.com ", true],
];

test("correo: mismos casos que el servidor (se recorta y pasa a minúsculas antes de validar)", () => {
  for (const [input, ok] of EMAIL_CASES) assert.equal(isValidEmail(normalizeEmail(input)), ok, input);
  assert.equal(normalizeEmail("  Persona@Ejemplo.COM "), "persona@ejemplo.com");
  assert.equal(isValidEmail("a".repeat(64) + "@ejemplo.com"), true);
  assert.equal(isValidEmail("a".repeat(65) + "@ejemplo.com"), false); // parte local > 64
  assert.equal(isValidEmail("a@" + Array(5).fill("b".repeat(50)).join(".") + ".com"), false); // > 254
});

test("correo: sugerencia por dominios con error frecuente, sin bloquear (el correo sigue siendo válido)", () => {
  for (const [typo, fixed] of [["gmial.com", "gmail.com"], ["gmai.com", "gmail.com"], ["hotmial.com", "hotmail.com"], ["outlok.com", "outlook.com"], ["yaho.com", "yahoo.com"]]) {
    assert.equal(emailSuggestion(`persona@${typo}`), `persona@${fixed}`, typo);
    assert.equal(isValidEmail(`persona@${typo}`), true, typo);
  }
  assert.equal(emailSuggestion("  Persona@GMIAL.com "), "persona@gmail.com");
  assert.equal(emailSuggestion("persona@gmail.com"), null);
  assert.equal(emailSuggestion("persona@ejemplo.com"), null);
  assert.equal(emailSuggestion("sin-arroba"), null);
});

// [campo, texto escrito, ¿válido?] — MISMA tabla que NameFields en MercasaVIP.Tests/RegistrationTests.cs (homex-api).
const NAME_CASES = [
  // nombre(s): obligatorio, 2 a 50
  ["firstName", "Persona", true],
  ["firstName", "María José", true],
  ["firstName", "Ana", true],
  ["firstName", "Pe", true],
  ["firstName", "O'Brien", true],
  ["firstName", "Jean-Luc", true],
  ["firstName", "Núñez Peña", true],
  ["firstName", "Müller", true],
  ["firstName", "  Persona  ", true],
  ["firstName", "Persona   Dos", true],
  ["firstName", "O’Brien", true],
  ["firstName", "P", false],
  ["firstName", "", false],
  ["firstName", "   ", false],
  ["firstName", "Persona2", false],
  ["firstName", "12", false],
  ["firstName", "Per$ona", false],
  ["firstName", "Ejemplo & Hijos", false],
  ["firstName", "Ana.", false],
  ["firstName", "-", false],
  ["firstName", "'", false],
  // primer apellido: obligatorio, 2 a 40
  ["lastName1", "Ejemplo", true],
  ["lastName1", "De la Cruz", true],
  ["lastName1", "Peña-Núñez", true],
  ["lastName1", "D'Ejemplo", true],
  ["lastName1", "Ng", true],
  ["lastName1", "  Ejemplo  ", true],
  ["lastName1", "E", false],
  ["lastName1", "", false],
  ["lastName1", "   ", false],
  ["lastName1", "Ejemplo2", false],
  ["lastName1", "Ejemplo_", false],
  // segundo apellido: opcional (vacío es válido), si se escribe 2 a 40
  ["lastName2", "", true],
  ["lastName2", "   ", true],
  ["lastName2", "Mora", true],
  ["lastName2", "Mora  Rojas", true],
  ["lastName2", "M", false],
  ["lastName2", "Mora2", false],
  ["lastName2", "Mora@", false],
  // razón social: obligatoria, 3 a 100
  ["legalName", "Ejemplo S.A.", true],
  ["legalName", "Ejemplo 24 & Hijos, S.A.", true],
  ["legalName", "Ejemplo", true],
  ["legalName", "Ejemplo-Uno Ltda.", true],
  ["legalName", "Ejemplo (CR) S.A.", true],
  ["legalName", "O'Brien e Hijos", true],
  ["legalName", "Ejemplo   Uno", true],
  ["legalName", "Año Nuevo S.A.", true],
  ["legalName", "12345", false],
  ["legalName", "Ejemplo @ S.A.", false],
  ["legalName", "Ejemplo/Uno", false],
  ["legalName", "Ejemplo; S.A.", false],
  ["legalName", "ab", false],
  ["legalName", "", false],
  ["legalName", "   ", false],
  // nombre comercial: opcional (vacío es válido), si se escribe 3 a 100
  ["tradeName", "", true],
  ["tradeName", "   ", true],
  ["tradeName", "Ejemplo Tienda", true],
  ["tradeName", "(Ejemplo) Express", true],
  ["tradeName", "Ejemplo & Hijos", true],
  ["tradeName", "ab", false],
  ["tradeName", "Tienda @1", false],
  ["tradeName", "123", false],
];

const NAME_VALIDATORS = { firstName: firstNameError, lastName1: lastName1Error, lastName2: lastName2Error, legalName: legalNameError, tradeName: tradeNameError };

test("nombres: mismos casos que el servidor (nombre(s), apellidos, razón social y nombre comercial)", () => {
  for (const [field, input, ok] of NAME_CASES) assert.equal(NAME_VALIDATORS[field](input) === null, ok, `${field} ${JSON.stringify(input)}`);
});

test("nombres: largos máximos (50 / 40 / 40 / 100 / 100) medidos tras recortar y colapsar espacios", () => {
  assert.equal(firstNameError("a".repeat(50)), null);
  assert.notEqual(firstNameError("a".repeat(51)), null);
  assert.equal(lastName1Error("a".repeat(40)), null);
  assert.notEqual(lastName1Error("a".repeat(41)), null);
  assert.equal(lastName2Error("a".repeat(40)), null);
  assert.notEqual(lastName2Error("a".repeat(41)), null);
  assert.equal(legalNameError("a".repeat(100)), null);
  assert.notEqual(legalNameError("a".repeat(101)), null);
  assert.equal(tradeNameError("a".repeat(100)), null);
  assert.notEqual(tradeNameError("a".repeat(101)), null);
  assert.equal(firstNameError("  " + "a".repeat(50) + "  "), null);
  assert.equal(firstNameError("a".repeat(25) + "     " + "b".repeat(20)), null);
});

test("nombres: normalización (NFC, apóstrofo tipográfico, espacios) sin cambiar mayúsculas — igual que el servidor", () => {
  assert.equal(normalizeName("  María   José  "), "María José");
  assert.equal(normalizeName("María"), "María"); // i + acento combinado -> í
  assert.equal(normalizeName("O’Brien"), "O'Brien");
  assert.equal(normalizeName("mARÍA"), "mARÍA");
  assert.equal(firstNameError("María"), null);
});

test("nombres: obligatorio vacío = 'required'; inválido por caracteres o largo = 'invalid'; opcionales vacíos son válidos", () => {
  assert.equal(firstNameError(""), "required");
  assert.equal(firstNameError("   "), "required");
  assert.equal(firstNameError("P"), "invalid");
  assert.equal(firstNameError("Per2"), "invalid");
  assert.equal(lastName1Error(""), "required");
  assert.equal(lastName1Error("E"), "invalid");
  assert.equal(lastName2Error(""), null);
  assert.equal(lastName2Error("M"), "invalid");
  assert.equal(legalNameError(""), "required");
  assert.equal(legalNameError("Ejemplo @ S.A."), "invalid");
  assert.equal(tradeNameError(""), null);
  assert.equal(tradeNameError("ab"), "invalid");
});

// MISMA tabla que PasswordRules en MercasaVIP.Tests/RegistrationTests.cs (homex-api): 8 a 20, una letra y un número, sin espacios al inicio ni al final.
const PASSWORD_CASES = [
  ["Clave1234", true],
  ["clave1234", true],
  ["CLAVE1234", true],
  ["12345678a", true],
  ["abcdefg1", true],
  ["Clave 1234", true],
  ["Clave1234!", true],
  ["Ñandú1234", true],
  ["ClaveClave", false],
  ["12345678", false],
  ["Cl1", false],
  ["abcdefg", false],
  ["", false],
  [" Clave1234", false],
  ["Clave1234 ", false],
  ["        ", false],
];

test("contraseña: requisitos visibles (8 a 20, una letra, un número, sin espacios en los bordes) — mismos casos que el servidor", () => {
  assert.deepEqual(passwordChecks("Clave1234"), { length: true, letter: true, digit: true, edges: true });
  assert.deepEqual(passwordChecks("clave"), { length: false, letter: true, digit: false, edges: true });
  assert.deepEqual(passwordChecks(" 1234567 a"), { length: true, letter: true, digit: true, edges: false });
  assert.equal(isValidPassword("Clave1234"), true);
  assert.deepEqual(PASSWORD_LIMITS, { min: 8, max: 20 });
  for (const [password, ok] of PASSWORD_CASES) assert.equal(isValidPassword(password), ok, JSON.stringify(password));
  assert.equal(isValidPassword("a1" + "x".repeat(6)), true); // 8
  assert.equal(isValidPassword("a1" + "x".repeat(18)), true); // 20
  assert.equal(isValidPassword("a1" + "x".repeat(5)), false); // 7
  assert.equal(isValidPassword("a1" + "x".repeat(19)), false); // 21 (HE_ResetPassword corta a 20)
});

test("formulario completo: sin campos inválidos; con errores devuelve cuáles, en el orden de la pantalla (foco al primero)", () => {
  assert.deepEqual(invalidFields(valid), []);
  assert.deepEqual(invalidFields({ ...valid, email: "x", firstName: "a" }), ["firstName", "email"]);
  assert.deepEqual(invalidFields({ ...valid, idNumber: "1111", phone: "1" }), ["idNumber", "phone"]);
  assert.equal(fieldError("idNumber", { ...valid, idType: "juridica" }), "length"); // los dígitos de una física no sirven como jurídica
  assert.equal(fieldError("firstName", { ...valid, firstName: "" }), "required");
  assert.equal(fieldError("lastName1", { ...valid, lastName1: "E" }), "invalid");
  assert.equal(fieldError("lastName2", { ...valid, lastName2: "" }), null); // segundo apellido vacío: válido
  assert.equal(invalidFields({ ...valid, lastName2: "" }).length, 0);
  assert.equal(invalidFields(validJuridica).length, 0);
  assert.equal(invalidFields({ ...validJuridica, tradeName: "" }).length, 0); // nombre comercial vacío: válido
  // en jurídica solo cuentan razón social y nombre comercial; en física, las tres partes de la persona
  assert.deepEqual(invalidFields({ ...validJuridica, legalName: "", firstName: "%%%" }), ["legalName"]);
  assert.deepEqual(invalidFields({ ...valid, legalName: "%%%", tradeName: "x" }), []);
  assert.deepEqual(fieldsFor("fisica"), ["idNumber", "firstName", "lastName1", "lastName2", "email", "phone"]);
  assert.deepEqual(fieldsFor("juridica"), ["idNumber", "legalName", "tradeName", "email", "phone"]);
  assert.equal(isCodeComplete("123456"), true);
  assert.equal(isCodeComplete("12345"), false);
});

// ---- Respuestas ----

test("clasificación de errores del servidor: duplicado genérico, código, límites, interruptor y fallas", () => {
  assert.equal(classifyRegisterError(409, { code: "registration_unavailable" }).kind, "duplicate");
  assert.equal(classifyRegisterError(400, { code: "code_invalid" }).kind, "codeInvalid");
  assert.equal(classifyRegisterError(410, { code: "code_expired" }).kind, "codeExpired");
  assert.equal(classifyRegisterError(429, { code: "rate_limited" }).kind, "rateLimited");
  assert.equal(classifyRegisterError(503, { code: "registration_disabled" }).kind, "disabled");
  assert.equal(classifyRegisterError(503, { code: "registration_not_available" }).kind, "disabled");
  assert.equal(classifyRegisterError(400, { code: "captcha_failed" }).kind, "captcha");
  assert.equal(classifyRegisterError(503, { code: "captcha_unavailable" }).kind, "captchaUnavailable");
  assert.equal(classifyRegisterError(503, { code: "service_unavailable" }).kind, "unavailable");
  assert.equal(classifyRegisterError(0, null).kind, "unavailable");
  const v = classifyRegisterError(400, { code: "validation_failed", fields: ["email", "bogus", "phone"], fieldErrors: ["email:invalid_email", "x:y", "phone:invalid_phone", 5] });
  assert.deepEqual([v.kind, v.fields], ["validation", ["email", "phone"]]);
  assert.deepEqual(v.fieldCodes, { email: "invalid_email", phone: "invalid_phone" });
});

test("paso 3: created / processing / validación / apagado / failed / vencido / reintentar, cada código estable con su resultado", () => {
  assert.equal(completeOutcome(200, { status: "created" }), "created");
  assert.equal(completeOutcome(503, { code: "registration_disabled" }), "disabled");
  assert.equal(completeOutcome(503, { code: "registration_not_available" }), "disabled");
  assert.equal(completeOutcome(410, { code: "code_expired" }), "restart");
  assert.equal(completeOutcome(409, { code: "not_verified" }), "restart");
  assert.equal(completeOutcome(503, { code: "service_unavailable" }), "retry");
  assert.equal(completeOutcome(0, null), "retry");
  assert.equal(completeOutcome(202, { code: "registration_processing" }), "processing");
  assert.equal(completeOutcome(400, { code: "validation_failed", fields: ["password"], fieldErrors: ["password:invalid_password"] }), "validation");
  assert.equal(completeOutcome(502, { code: "registration_failed" }), "failed");
  assert.equal(completeOutcome(503, { code: "registration_busy" }), "retry");
  assert.equal(completeOutcome(503, { code: "registration_unavailable" }), "retry"); // bridge con escrituras apagadas: no es un duplicado
  assert.equal(completeOutcome(429, { code: "rate_limited" }), "retry");
  assert.equal(completeOutcome(409, { code: "x" }), "failed");
  // el 503 registration_unavailable ya no se confunde con el duplicado genérico de start (409)
  assert.equal(classifyRegisterError(503, { code: "registration_unavailable" }).kind, "unavailable");
  assert.equal(classifyRegisterError(409, { code: "registration_unavailable" }).kind, "duplicate");
  assert.equal(classifyRegisterError(202, { code: "registration_processing" }).kind, "processing");
  assert.equal(classifyRegisterError(503, { code: "registration_busy" }).kind, "busy");
  assert.equal(classifyRegisterError(502, { code: "registration_failed" }).kind, "failed");
  assert.deepEqual([PROCESSING_RETRIES, PROCESSING_RETRY_MS], [3, 5000]); // hasta 3 reintentos cada 5 s
  assert.ok(FORWARDED_STATUSES.includes(202) && FORWARDED_STATUSES.includes(502));
});

test("solo pasan al navegador las claves conocidas y valores simples", () => {
  const out = pickAllowedResponse({ code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email", 5], fieldErrors: ["email:invalid_email"], secret: "no", nested: { a: 1 }, message: { a: 1 } });
  assert.deepEqual(out, { code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email"], fieldErrors: ["email:invalid_email"] });
  assert.deepEqual(pickAllowedResponse(null), {});
  assert.deepEqual(pickAllowedResponse([1, 2]), {});
});

test("cuerpo hacia mercasa-api: solo campos conocidos (sin el token del captcha), con tope de tamaño", () => {
  const start = sanitizeRegisterBody("start", { ...valid, captchaToken: "t", isAdmin: true, name: "viejo", firstName: "x".repeat(500) });
  assert.deepEqual(Object.keys(start).sort(), [
    "email", "firstName", "idNumber", "idType", "lastName1", "lastName2", "legalName", "phone", "tradeName",
  ]);
  assert.equal("name" in start, false); // el campo único de nombre ya no existe
  assert.equal(start.idType, "fisica");
  assert.equal(start.firstName.length, 120);
  // start ya no lleva contraseña ni términos (van en el paso 3)
  const withSecrets = sanitizeRegisterBody("start", { ...valid, password: "Clave1234", acceptedTerms: true });
  assert.equal("password" in withSecrets, false);
  assert.equal("acceptedTerms" in withSecrets, false);
  // complete sí: id del registro, contraseña (con tope) y términos; nada más
  const complete = sanitizeRegisterBody("complete", { attemptId: "a", password: "x".repeat(200), acceptedTerms: true, code: "1", extra: 1 });
  assert.deepEqual(Object.keys(complete).sort(), ["acceptedTerms", "attemptId", "password"]);
  assert.equal(complete.password.length, 80);
  assert.equal(sanitizeRegisterBody("complete", { attemptId: "a", password: "p", acceptedTerms: "true" }).acceptedTerms, false);
  assert.deepEqual(sanitizeRegisterBody("verify", { attemptId: "a", code: "123456", extra: 1 }), { attemptId: "a", code: "123456" });
  assert.deepEqual(sanitizeRegisterBody("complete", { attemptId: "a", code: "123456" }), { attemptId: "a", password: "", acceptedTerms: false });
  assert.deepEqual(sanitizeRegisterBody("complete", null), { attemptId: "", password: "", acceptedTerms: false });
});

test("cédula enmascarada: solo los últimos 3 dígitos", () => {
  assert.equal(maskIdNumber("1-1111-1111"), "******111");
  assert.equal(maskIdNumber("12"), "***");
});

// ---- Captcha ----

test("captcha: sin proveedor solo se acepta fuera de producción; en producción sin proveedor falla cerrado", () => {
  assert.equal(resolveCaptchaMode(undefined, "development", false), "disabled-dev");
  assert.equal(resolveCaptchaMode("none", "development", false), "disabled-dev");
  assert.equal(resolveCaptchaMode(undefined, "production", false), "unavailable");
  assert.equal(resolveCaptchaMode("none", "production", true), "unavailable");
  assert.equal(resolveCaptchaMode("turnstile", "production", true), "turnstile");
  assert.equal(resolveCaptchaMode("turnstile", "production", false), "unavailable");
  assert.ok(DEV_DISABLED_TOKEN.length > 0);
});

// ---- Pantalla ----

// next-intl/navigation no carga fuera de Next: un Link mínimo que antepone /en en inglés (como as-needed).
let currentLocale = "es";
stubModule("i18n/navigation", {
  Link: ({ href, children, ...rest }) => React.createElement("a", { href: currentLocale === "en" ? `/en${href}` : href, ...rest }, children),
});
const RegistrationFlow = loadFromRoot("components/registration/RegistrationFlow.tsx").default;
const withIntl = (element, locale) => (currentLocale = locale) && React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("paso 1 (es): un solo objetivo, campos con etiqueta, requisitos de contraseña, términos con enlace y botón", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  assert.match(html, /<h3[^>]*tabindex="-1"[^>]*>Creá tu cuenta<\/h3>/);
  assert.match(text(html), /Paso 1 de 3/);
  for (const field of ["idNumber", "firstName", "lastName1", "lastName2", "email", "phone"]) {
    assert.match(html, new RegExp(`<label for="reg-${field}"`), field); // etiqueta asociada
    assert.match(html, new RegExp(`id="reg-${field}"`), field);
  }
  // el paso 1 ya no pide contraseña ni términos (van en el paso 3)
  assert.doesNotMatch(html, /id="reg-(password|confirmPassword|acceptedTerms)"/);
  assert.doesNotMatch(html, /new-password/);
  assert.doesNotMatch(html, /reg-password-rules/);
  assert.doesNotMatch(html, /terminos-y-condiciones|politica-de-privacidad/);
  assert.match(text(html), /Enviarme el código/);
  assert.doesNotMatch(html, /role="alert"/); // sin errores antes de interactuar
  assert.doesNotMatch(html, /aria-invalid/);
});

test("paso 1 (en): mismos campos y estructura que en español", () => {
  const es = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  const en = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "en"));
  assert.match(en, /<h3[^>]*>Create your account<\/h3>/);
  assert.match(text(en), /Step 1 of 3/);
  assert.match(text(en), /Email me the code/);
  const ids = (html) => [...html.matchAll(/id="(reg-[A-Za-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(en), ids(es));
});

test("llaves de Registration y de Profile.createAccountCta iguales en es y en", () => {
  const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  assert.deepEqual(keys(messages.es.Registration).sort(), keys(messages.en.Registration).sort());
  assert.ok(messages.es.Profile.createAccountCta && messages.en.Profile.createAccountCta);
  for (const lang of ["es", "en"]) {
    const empties = keys(messages[lang].Registration).filter((k) => !String(k.split(".").reduce((o, p) => o[p], messages[lang].Registration)).trim());
    assert.deepEqual(empties, []);
  }
});

// ---- Garantías en el código ----

test("flujo: foco al cambiar de paso, errores asociados a campos, teclado (formularios con submit), código de un solo uso", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  assert.match(src, /headingRef\.current\?\.focus\(\)/);
  assert.match(src, /aria-invalid=/);
  assert.match(src, /aria-describedby=/);
  assert.match(src, /<form id=\{START_FORM_ID\} onSubmit=\{handleStart\}/);
  assert.match(src, /<form onSubmit=\{handleVerify\}/);
  assert.match(src, /autoComplete="one-time-code"/);
  assert.match(src, /role="status" aria-live="polite"/);
  // la contraseña vive solo en el estado (paso 3) y se borra al terminar o al volver a empezar
  assert.match(src, /setCompletion\(EMPTY_COMPLETION\)/);
  assert.match(src, /const clearCompletion = \(\) => \{/);
  // ninguna ruta lleva datos en la URL
  assert.doesNotMatch(src, /fetch\(`\/api\/register\/\$\{step\}\?/);
});

test("rutas del servidor: apagadas sin la bandera (404), sin registrar cuerpos, contraseña solo en el cuerpo", () => {
  const proxy = read("lib/registration-proxy.ts");
  assert.match(proxy, /NEXT_PUBLIC_ENABLE_REGISTRATION !== "true"[\s\S]{0,80}status: 404/);
  assert.doesNotMatch(proxy, /console\.(log|info|warn|error)\([^)]*(raw|body|password|code\b)/);
  assert.doesNotMatch(proxy, /\?.*password|searchParams/);
  assert.match(proxy, /method: "POST"/);
  for (const step of ["start", "verify", "complete"]) {
    assert.match(read(`app/api/register/${step}/route.ts`), new RegExp(`proxyRegister\\("${step}"`));
  }
});

test("botón 'Crear cuenta' dentro del panel de perfil, detrás de la bandera (apagada por defecto)", () => {
  assert.match(read("lib/feature-flags.ts"), /REGISTRATION_ENABLED = process\.env\.NEXT_PUBLIC_ENABLE_REGISTRATION === "true"/);
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /REGISTRATION_ENABLED && \(\s*<button\s+type="button"\s+onClick=\{\(\) => setRegistering\(true\)\}/);
  assert.match(drawer, /registering \? \(\s*<RegistrationFlow onBackToLogin=\{\(\) => setRegistering\(false\)\} footerTarget=\{registrationFooter\} \/>/);
  assert.match(drawer, /setRegistering\(false\);(\s*set\w+\((null|false)\);)*\s*\}\s*\}/); // al cerrar el panel se vuelve al ingreso y se borra lo escrito
  assert.equal(fs.existsSync(new URL("../../app/[locale]/registro", import.meta.url)), false); // ya no es una página aparte
});

// ---- Pulido visual: título del panel, alto, espacios ----

test("título del panel: Crear cuenta / Create account solo en el flujo de registro; el Perfil conserva el suyo", () => {
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /showingRegistration = registering && !user && !isLoading/);
  assert.match(drawer, /eyebrow=\{showingRegistration \? tRegistration\("eyebrow"\) : t\("eyebrow"\)\}/);
  assert.match(drawer, /title=\{showingRegistration \? tRegistration\("panelTitle"\) : user \? user\.name \|\| user\.accountNum : t\("title"\)\}/);
  assert.equal(messages.es.Registration.panelTitle, "Crear cuenta");
  assert.equal(messages.en.Registration.panelTitle, "Create account");
  assert.ok(messages.es.Registration.eyebrow && messages.en.Registration.eyebrow);
  assert.equal(messages.es.Profile.title, "Perfil"); // el Perfil real no cambia
});

test("alto del panel: pegado arriba y abajo con tope dvh (sin vh), sin esquina inferior redondeada, con safe-area en cuerpo y pie", () => {
  const drawer = read("components/ui/Drawer.tsx");
  assert.match(drawer, /fixed inset-y-0 right-0 z-\[310\] flex max-h-dvh/); // pegado arriba y abajo y nunca más alto que el visible
  assert.doesNotMatch(drawer, /md:rounded-l-\[28px\]|\b\d+vh\b/);
  assert.match(drawer, /md:rounded-tl-\[28px\]/);
  assert.equal([...drawer.matchAll(/env\(safe-area-inset-bottom\)/g)].length, 2);
  assert.match(drawer, /scroll-pt-6/); // la etiqueta del primer campo no queda bajo el borde al enfocar o hacer scroll
  assert.match(drawer, /min-h-0 flex-1 scroll-pb-6 scroll-pt-6 overflow-y-auto/); // cuerpo con scroll propio dentro de la columna
});

test("registro: una sola escala de espacios (bloque 20px, campo 8px, ayuda 4px) y pie fijo con el botón", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  assert.match(src, /const BLOCK = "gap-5"/);
  assert.match(src, /const FIELD = "gap-2"/);
  assert.match(src, /const LABEL = "gap-1"/);
  assert.match(src, /const STEP_TOP = "mt-6"/);
  // todas las pantallas (3 pasos y los resultados del paso 3) usan la misma escala
  assert.equal([...src.matchAll(/\$\{STEP_TOP\} flex flex-col \$\{BLOCK\}/g)].length, 9);
  assert.doesNotMatch(src, /-mt-2|mt-1\.5/); // sin los espacios sueltos anteriores
  assert.match(src, /scroll-mt-6/);
  assert.doesNotMatch(src, /sticky/); // el pie ya no es sticky dentro del scroll
  assert.match(src, /type="submit"\s+form=\{START_FORM_ID\}/); // el botón del pie envía el formulario del cuerpo
  assert.match(src, /createPortal\(startFooter, footerTarget\)/);
  const drawerSrc = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawerSrc, /ref=\{setRegistrationFooter\}[\s\S]{0,400}empty:hidden/); // pie hermano del cuerpo, desaparece vacío
  assert.match(drawerSrc, /<\/DrawerBody>\s*\{\/\*[\s\S]*?\*\/\}\s*\{showingRegistration/); // después del cuerpo, fuera del scroll
  assert.match(drawerSrc, /background: BODY_BG, borderColor: RULE/); // mismo crema y borde fino, sin franja blanca
  assert.doesNotMatch(drawerSrc.match(/ref=\{setRegistrationFooter\}[\s\S]{0,500}/)[0], /shadow/);
  assert.match(src, /<\/FieldError>\}\s*\{children\}/); // error y requisitos siguen en el mismo bloque del campo
});

test("campo con ayuda y sin ayuda comparten estructura (ayuda a 4px de su etiqueta, campo a 8px)", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  for (const id of ["firstName", "lastName1", "lastName2", "idNumber", "email", "phone"]) {
    assert.ok(html.includes(`<div class="flex scroll-mt-6 flex-col gap-2"><div class="flex flex-col gap-1"><label for="reg-${id}"`), id);
  }
  assert.match(html, /id="reg-idNumber-hint"/);
  assert.doesNotMatch(html, /id="reg-email-hint"/); // el correo no lleva ayuda fija (solo la sugerencia al equivocarse de dominio)
});

// ---- Llaves de textos: ninguna puede quedar sin resolver (se vería "Registration.panelTitle" crudo) ----

const lookup = (lang, namespace, key) => `${namespace}.${key}`.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), messages[lang]);

test("encabezado del registro: Registration.eyebrow y Registration.panelTitle existen y dicen lo esperado en es y en", () => {
  // ProfileDrawer las pide con useTranslations("Registration") -> tRegistration("eyebrow") / tRegistration("panelTitle")
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /useTranslations\("Registration"\)/);
  assert.match(drawer, /tRegistration\("eyebrow"\)/);
  assert.match(drawer, /tRegistration\("panelTitle"\)/);
  assert.equal(lookup("es", "Registration", "eyebrow"), "Registro");
  assert.equal(lookup("es", "Registration", "panelTitle"), "Crear cuenta");
  assert.equal(lookup("en", "Registration", "eyebrow"), "Sign up");
  assert.equal(lookup("en", "Registration", "panelTitle"), "Create account");
});

test("toda llave que piden RegistrationFlow y ProfileDrawer existe, con texto, en es y en", () => {
  const rules = ["length", "letter", "digit", "edges"];
  const requested = []; // [archivo, namespace, llave]

  const flow = read("components/registration/RegistrationFlow.tsx");
  for (const m of flow.matchAll(/\bt\("([^"]+)"/g)) requested.push(["RegistrationFlow", "Registration", m[1]]);
  for (const m of flow.matchAll(/\bt\(`([^`$]+)\$\{rule\}`/g)) for (const rule of rules) requested.push(["RegistrationFlow", "Registration", `${m[1]}${rule}`]);
  assert.ok(requested.length > 40, "no se encontraron las llaves del flujo");

  const drawer = read("components/profile/ProfileDrawer.tsx");
  for (const m of drawer.matchAll(/\btRegistration\("([^"]+)"/g)) requested.push(["ProfileDrawer", "Registration", m[1]]);
  for (const m of drawer.matchAll(/(?<![A-Za-z])t\("([^"]+)"/g)) requested.push(["ProfileDrawer", "Profile", m[1]]);

  const missing = [];
  for (const [file, namespace, key] of requested) {
    for (const lang of ["es", "en"]) {
      const value = lookup(lang, namespace, key);
      if (typeof value !== "string" || !value.trim()) missing.push(`${lang}: ${namespace}.${key} (${file})`);
    }
  }
  assert.deepEqual(missing, []);
});

test("el registro no deja llaves huérfanas: toda llave de Registration se usa en el código (o es una de las dinámicas)", () => {
  const flow = read("components/registration/RegistrationFlow.tsx");
  const drawer = read("components/profile/ProfileDrawer.tsx");
  const used = new Set();
  for (const m of flow.matchAll(/\bt\("([^"]+)"/g)) used.add(m[1]);
  for (const m of drawer.matchAll(/\btRegistration\("([^"]+)"/g)) used.add(m[1]);
  for (const rule of ["length", "letter", "digit", "edges"]) used.add(`passwordRules.${rule}`);

  const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const unused = keys(messages.es.Registration).filter((k) => !used.has(k));
  assert.deepEqual(unused, []);
});

// ---- Validaciones por campo en pantalla ----

test("paso 1 (es): selector de tipo de cédula accesible (radios en fieldset), Física por defecto, máscara y ayuda del tipo", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  assert.match(html, /<fieldset[^>]*><legend[^>]*>Tipo de cédula<\/legend>/);
  assert.equal([...html.matchAll(/<input type="radio"[^>]*name="idType"/g)].length, 2);
  assert.match(html, /<input type="radio"[^>]*name="idType" checked="" value="fisica"/); // por defecto Física
  assert.match(html, /Persona física/);
  assert.match(html, /Persona jurídica/);
  assert.match(html, /placeholder="0-0000-0000"/);
  assert.match(text(html), /9 dígitos\. Ej\. 1-1111-1111/);
  // física: tres campos (nombre(s), primer apellido, segundo apellido opcional) y ninguno de jurídica
  assert.match(html, /<label for="reg-firstName"[^>]*>Nombre\(s\)<\/label>/);
  assert.match(html, /<label for="reg-lastName1"[^>]*>Primer apellido<\/label>/);
  assert.match(html, /<label for="reg-lastName2"[^>]*>Segundo apellido \(opcional\)<\/label>/);
  assert.match(text(html), /Como aparece en tu cédula/);
  assert.match(text(html), /Si no tenés segundo apellido, dejalo vacío/);
  assert.doesNotMatch(html, /id="reg-(name|legalName|tradeName)"/);
});

test("paso 1: teléfono numérico con autocomplete tel-national y máscara; correo type=email con tope de 254", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  assert.match(html, /<input id="reg-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="8888-7777"/);
  assert.match(html, /<input id="reg-email" type="email" inputMode="email" autoComplete="email" maxLength="254"/);
  assert.match(html, /<input id="reg-idNumber" type="text" inputMode="numeric"/);
  assert.match(html, /<input id="reg-firstName" type="text" autoComplete="given-name" maxLength="50"/);
  assert.match(html, /<input id="reg-lastName1" type="text" autoComplete="family-name" maxLength="40"/);
  assert.match(html, /<input id="reg-lastName2" type="text" autoComplete="additional-name" maxLength="40"/);
});

test("paso 1 (en): tipo de cédula, ayudas y etiquetas en inglés con los mismos campos", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "en"));
  assert.match(html, /<legend[^>]*>ID type<\/legend>/);
  assert.match(html, /Individual/);
  assert.match(html, /Company/);
  assert.match(text(html), /9 digits\. E\.g\. 1-1111-1111/);
  assert.match(html, /<label for="reg-firstName"[^>]*>First name\(s\)<\/label>/);
  assert.match(html, /<label for="reg-lastName1"[^>]*>First last name<\/label>/);
  assert.match(html, /<label for="reg-lastName2"[^>]*>Second last name \(optional\)<\/label>/);
});

test("errores del servidor por campo: el código decide el mensaje y el campo se marca", () => {
  assert.equal(serverErrorKind("idNumber", "invalid_id_length", "invalid"), "length");
  assert.equal(serverErrorKind("idNumber", "invalid_id", "invalid"), "prefix");
  assert.equal(serverErrorKind("idNumber", "algo_nuevo", "invalid"), "invalid");
  assert.equal(serverErrorKind("phone", "invalid_phone", "invalid"), "invalid");
  assert.deepEqual(parseFieldCodes(["idNumber:invalid_id_length", "phone:invalid_phone", "idNumber:otro", "nope:x", "sinpuntos", 3]), {
    idNumber: "invalid_id_length",
    phone: "invalid_phone",
  });
  const err = classifyRegisterError(400, { code: "validation_failed", fields: ["idNumber"], fieldErrors: ["idNumber:invalid_id_length"] });
  assert.deepEqual([err.kind, err.fields, err.fieldCodes], ["validation", ["idNumber"], { idNumber: "invalid_id_length" }]);
  // el duplicado sigue siendo genérico (no cambia)
  assert.deepEqual(classifyRegisterError(409, { code: "registration_unavailable" }), { kind: "duplicate", fields: [], fieldCodes: {} });
});

test("flujo: máscaras al escribir, tipo con reajuste, errores por causa, foco al primer error y a lo que rechaza el servidor", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  // las máscaras actúan mientras se escribe
  assert.match(src, /value=\{formatIdNumber\(values\.idNumber, values\.idType\)\}/);
  assert.match(src, /onChange=\{\(v\) => setField\("idNumber", normalizeIdInput\(v, values\.idType\)\)\}/);
  assert.match(src, /value=\{formatPhone\(values\.phone\)\}/);
  assert.match(src, /onChange=\{\(v\) => setField\("phone", normalizePhoneInput\(v\)\)\}/);
  // el tipo reajusta los dígitos y se vuelve a validar solo (los errores salen de los valores actuales)
  assert.match(src, /setValues\(\(v\) => applyIdType\(v, type\)\)/);
  // el correo se normaliza al salir del campo y al enviar; la sugerencia no bloquea el envío
  assert.match(src, /email: normalizeEmail\(s\.email\)/);
  assert.match(src, /post\("start", buildStartBody\(values, captchaToken\)\)/);
  assert.doesNotMatch(src, /suggestedEmail[^\n]*(return|setFormError)/);
  // errores: al salir del campo o al enviar (no por tecla); una vez mostrados se actualizan en vivo
  assert.match(src, /touched\[field\] \|\| serverFields\.includes\(field\)/);
  assert.match(src, /onBlur=\{\(\) => touch\("phone"\)\}/);
  assert.match(src, /setTouched\(Object\.fromEntries\(fieldsFor\(values\.idType\)\.map/);
  // foco al primer campo inválido al enviar y al primero que rechaza el servidor
  assert.match(src, /document\.getElementById\(`reg-\$\{bad\[0\]\}`\)\?\.focus\(\)/);
  assert.match(src, /fieldsFor\(values\.idType\)\.find\(\(field\) => error\.fields\.includes\(field\)\)/);
  // cada error asociado a su campo
  assert.match(src, /aria-invalid=\{invalid \|\| undefined\}/);
  assert.match(src, /aria-describedby=\{described\}/);
  // al servidor viaja solo el tipo y los dígitos (sin máscara), con los nombres ya normalizados (buildStartBody)
});

test("el orden de los campos (y del foco al error) es el de la pantalla: cédula, nombres, correo, teléfono, contraseña, términos", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  const order = ["idNumber", "firstName", "lastName1", "lastName2", "legalName", "tradeName", "email", "phone", "password", "confirmPassword"].map((f) => src.indexOf(`field="${f}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  // física: cédula, nombre(s), primer apellido (el segundo es opcional), correo, teléfono, contraseña, términos
  assert.deepEqual(
    invalidFields({ ...valid, idNumber: "", firstName: "", lastName1: "", lastName2: "", email: "", phone: "" }),
    ["idNumber", "firstName", "lastName1", "email", "phone"],
  );
  // jurídica: cédula, razón social (el nombre comercial es opcional), correo, teléfono, contraseña, términos
  assert.deepEqual(
    invalidFields({ ...validJuridica, idNumber: "", legalName: "", tradeName: "", email: "", phone: "" }),
    ["idNumber", "legalName", "email", "phone"],
  );
});

test("el servidor recibe el tipo y los dígitos: la web no manda máscara ni espacios", () => {
  const body = sanitizeRegisterBody("start", { ...valid, idNumber: "111111111", phone: "88887777" });
  assert.equal(body.idType, "fisica");
  assert.equal(body.idNumber, "111111111");
  assert.equal(body.phone, "88887777");
  assert.equal(normalizeEmail(" Persona@Ejemplo.com "), "persona@ejemplo.com");
});

// ---- Sin enumeración: el paso 2 es el mismo para datos nuevos y para duplicados ----

test("paso 2: texto neutro ('Si los datos son válidos...') y ayuda por si no llega el código, igual en es y en", () => {
  assert.match(messages.es.Registration.step2.intro, /^Si los datos son válidos, te enviamos un código de 6 dígitos a \{email\}/);
  assert.match(messages.en.Registration.step2.intro, /^If the details are valid, we sent a 6-digit code to \{email\}/);
  assert.ok(messages.es.Registration.step2.noCode && messages.en.Registration.step2.noCode);
  const src = read("components/registration/RegistrationFlow.tsx");
  assert.match(src, /t\("step2\.noCode"\)/);
  assert.match(src, /t\("step2\.intro", \{ email \}\)/);
  // el servidor ya no responde distinto a un duplicado: la web avanza al paso 2 con cualquier 200 de start
  assert.match(src, /res\.status === 200 && typeof \(res\.body as \{ attemptId\?: unknown \} \| null\)\?\.attemptId === "string"/);
});

test("los textos del paso 2 no revelan si los datos ya existían", () => {
  for (const lang of ["es", "en"]) {
    const step2 = JSON.stringify(messages[lang].Registration.step2).toLowerCase();
    assert.doesNotMatch(step2, /ya existe|already exist|ya está registrad|already registered|cuenta existente/);
  }
});

// ---- Nombre, primer y segundo apellido (física) / razón social y nombre comercial (jurídica) ----

const inputTag = (html, id) => html.match(new RegExp(`<input id="${id}"[^>]*>`))?.[0] ?? "";
const renderFlow = (locale, initialValues) =>
  renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {}, initialValues }), locale));

test("jurídica (es): razón social y nombre comercial; sin los campos de persona física", () => {
  const html = renderFlow("es", { idType: "juridica" });
  assert.match(html, /<label for="reg-legalName"[^>]*>Razón social<\/label>/);
  assert.match(html, /<label for="reg-tradeName"[^>]*>Nombre comercial \(opcional\)<\/label>/);
  assert.match(text(html), /Como aparece en la cédula jurídica/);
  assert.match(text(html), /Si no tiene, dejalo vacío/);
  assert.match(inputTag(html, "reg-legalName"), /autoComplete="organization" maxLength="100"/);
  assert.match(inputTag(html, "reg-tradeName"), /maxLength="100"/);
  assert.doesNotMatch(html, /id="reg-(firstName|lastName1|lastName2|name)"/);
  assert.match(html, /<input type="radio"[^>]*name="idType" checked="" value="juridica"/);
  assert.doesNotMatch(html, /role="alert"/); // sin errores antes de interactuar
});

test("jurídica (en): mismos campos que en español", () => {
  const html = renderFlow("en", { idType: "juridica" });
  assert.match(html, /<label for="reg-legalName"[^>]*>Legal name<\/label>/);
  assert.match(html, /<label for="reg-tradeName"[^>]*>Trade name \(optional\)<\/label>/);
  const ids = (h) => [...h.matchAll(/id="(reg-[A-Za-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(html), ids(renderFlow("es", { idType: "juridica" })));
  const fisica = (locale) => ids(renderFlow(locale));
  assert.deepEqual(fisica("en"), fisica("es"));
});

test("autocompletado: given-name / family-name / additional-name en física y organization en la razón social", () => {
  const fisica = renderFlow("es");
  assert.match(inputTag(fisica, "reg-firstName"), /autoComplete="given-name"/);
  assert.match(inputTag(fisica, "reg-lastName1"), /autoComplete="family-name"/);
  assert.match(inputTag(fisica, "reg-lastName2"), /autoComplete="additional-name"/);
  assert.match(inputTag(renderFlow("es", { idType: "juridica" }), "reg-legalName"), /autoComplete="organization"/);
});

test("aria-required solo en los obligatorios: nombre(s), primer apellido y razón social sí; segundo apellido y nombre comercial no", () => {
  const fisica = renderFlow("es");
  assert.match(inputTag(fisica, "reg-firstName"), /aria-required="true"/);
  assert.match(inputTag(fisica, "reg-lastName1"), /aria-required="true"/);
  assert.doesNotMatch(inputTag(fisica, "reg-lastName2"), /aria-required/);
  const juridica = renderFlow("es", { idType: "juridica" });
  assert.match(inputTag(juridica, "reg-legalName"), /aria-required="true"/);
  assert.doesNotMatch(inputTag(juridica, "reg-tradeName"), /aria-required/);
  for (const id of ["reg-idNumber", "reg-email", "reg-phone"]) assert.match(inputTag(fisica, id), /aria-required="true"/, id);
});

test("ayudas: segundo apellido y nombre comercial asociadas por aria-describedby (la ayuda y, si hay error, su error)", () => {
  const fisica = renderFlow("es");
  assert.match(inputTag(fisica, "reg-firstName"), /aria-describedby="reg-firstName-hint"/);
  assert.match(inputTag(fisica, "reg-lastName2"), /aria-describedby="reg-lastName2-hint"/);
  assert.doesNotMatch(inputTag(fisica, "reg-lastName1"), /aria-describedby/); // sin ayuda y sin error
  assert.match(inputTag(renderFlow("es", { idType: "juridica" }), "reg-tradeName"), /aria-describedby="reg-tradeName-hint"/);
});

test("cambio de tipo: se conserva cédula válida, correo, teléfono, contraseña y términos; se vacían los campos del otro tipo", () => {
  const filled = { ...valid, idNumber: "311111111" };
  const toJuridica = applyIdType(filled, "juridica");
  assert.equal(toJuridica.idType, "juridica");
  assert.deepEqual([toJuridica.firstName, toJuridica.lastName1, toJuridica.lastName2], ["", "", ""]);
  assert.deepEqual([toJuridica.email, toJuridica.phone], [valid.email, valid.phone]);
  assert.equal(toJuridica.idNumber, "311111111"); // empieza por 3 y cabe en 10: se conserva

  const back = applyIdType({ ...toJuridica, legalName: "Ejemplo S.A.", tradeName: "Ejemplo Tienda" }, "fisica");
  assert.deepEqual([back.legalName, back.tradeName], ["", ""]);
  assert.deepEqual([back.email, back.phone], [valid.email, valid.phone]);
  assert.equal(applyIdType(valid, "juridica").idNumber, ""); // la cédula 1... no sirve como jurídica (como antes)

  const same = applyIdType(valid, "fisica"); // mismo tipo: nada cambia
  assert.deepEqual(same, valid);
  assert.deepEqual(fieldsClearedByType("juridica"), ["firstName", "lastName1", "lastName2"]);
  assert.deepEqual(fieldsClearedByType("fisica"), ["legalName", "tradeName"]);
});

test("cuerpo de start: solo los campos del tipo, nombres normalizados, sin el campo 'name' y con el token del captcha", () => {
  const fisica = buildStartBody({ ...valid, firstName: "  María   José ", lastName1: "O’Brien", lastName2: "   ", legalName: "Debe ignorarse", tradeName: "Ignorado" }, "tok");
  assert.deepEqual(Object.keys(fisica).sort(), ["captchaToken", "email", "firstName", "idNumber", "idType", "lastName1", "lastName2", "phone"]);
  assert.deepEqual([fisica.firstName, fisica.lastName1, fisica.lastName2], ["María José", "O'Brien", ""]);
  assert.equal(fisica.captchaToken, "tok");
  assert.equal("name" in fisica, false);

  const juridica = buildStartBody({ ...validJuridica, legalName: "  Ejemplo   S.A. ", firstName: "Ignorado" }, "tok");
  assert.deepEqual(Object.keys(juridica).sort(), ["captchaToken", "email", "idNumber", "idType", "legalName", "phone", "tradeName"]);
  assert.deepEqual([juridica.legalName, juridica.tradeName], ["Ejemplo S.A.", "Ejemplo Tienda"]);
  assert.equal(buildStartBody({ ...valid, email: " Persona@Ejemplo.com " }, "t").email, "persona@ejemplo.com");
});

test("errores del servidor por campo de nombre: el código estable marca el campo y la pantalla lo muestra en ese campo", () => {
  const codes = ["firstName:invalid_first_name", "lastName1:invalid_last_name1", "lastName2:invalid_last_name2", "legalName:invalid_legal_name", "tradeName:invalid_trade_name"];
  assert.deepEqual(parseFieldCodes(codes), {
    firstName: "invalid_first_name",
    lastName1: "invalid_last_name1",
    lastName2: "invalid_last_name2",
    legalName: "invalid_legal_name",
    tradeName: "invalid_trade_name",
  });
  const err = classifyRegisterError(400, { code: "validation_failed", fields: ["lastName1", "firstName", "name"], fieldErrors: codes });
  assert.deepEqual([err.kind, err.fields], ["validation", ["lastName1", "firstName"]]); // el viejo "name" ya no es un campo conocido
  assert.equal(parseFieldCodes(["name:invalid_name"]).name, undefined);
  // un código que el navegador no conoce igual marca el campo como inválido (mensaje genérico del campo)
  assert.equal(serverErrorKind("firstName", "invalid_first_name", "invalid"), "invalid");
  const src = read("components/registration/RegistrationFlow.tsx");
  for (const key of [
    "errors.firstName.required", "errors.firstName.invalid", "errors.lastName1.required", "errors.lastName1.invalid",
    "errors.lastName2.invalid", "errors.legalName.required", "errors.legalName.invalid", "errors.tradeName.invalid",
  ]) assert.ok(src.includes(`t("${key}")`), key);
});

test("flujo con nombres: foco al primer campo visible inválido, errores asociados a su campo, al cambiar el tipo se limpian los del otro", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  // al enviar se marcan y enfocan solo los campos del tipo elegido
  assert.match(src, /setTouched\(Object\.fromEntries\(fieldsFor\(values\.idType\)\.map/);
  assert.match(src, /document\.getElementById\(`reg-\$\{bad\[0\]\}`\)\?\.focus\(\)/);
  assert.match(src, /fieldsFor\(values\.idType\)\.find\(\(field\) => error\.fields\.includes\(field\)\)/);
  // cada campo: aria-invalid y aria-describedby con su error (id reg-<campo>-error), y el error con role="alert"
  assert.match(src, /aria-invalid=\{invalid \|\| undefined\}/);
  assert.match(src, /const errorId = `\$\{id\}-error`/);
  assert.match(src, /<FieldError id=\{errorId\}>/);
  // el cambio de tipo vacía también los errores (tocados y del servidor) de los campos que desaparecen
  assert.match(src, /const cleared = fieldsClearedByType\(type\)/);
  assert.match(src, /setTouched\(\(s\) => Object\.fromEntries/);
  assert.match(src, /setServerCodes\(\(c\) => Object\.fromEntries/);
  // se siguen mostrando los errores al salir del campo o al enviar, y en vivo una vez mostrados
  assert.match(src, /touched\[field\] \|\| serverFields\.includes\(field\)/);
  for (const field of ["firstName", "lastName1", "lastName2", "legalName", "tradeName"]) {
    assert.match(src, new RegExp(`onBlur=\\{\\(\\) => touch\\("${field}"\\)\\}`), field);
  }
});

test("mensajes de nombres: llaves nuevas con texto en es y en, y sin las llaves viejas del nombre único", () => {
  for (const lang of ["es", "en"]) {
    const reg = messages[lang].Registration;
    assert.equal(reg.fields.name, undefined, `${lang}: fields.name`);
    assert.equal(reg.errors.name, undefined, `${lang}: errors.name`);
    for (const key of ["firstName.label", "firstName.hint", "lastName1.label", "lastName2.label", "lastName2.hint", "legalName.label", "legalName.hint", "tradeName.label", "tradeName.hint"]) {
      assert.ok(String(lookup(lang, "Registration", `fields.${key}`)).trim(), `${lang}: fields.${key}`);
    }
    for (const key of ["firstName.required", "firstName.invalid", "lastName1.required", "lastName1.invalid", "lastName2.invalid", "legalName.required", "legalName.invalid", "tradeName.invalid"]) {
      assert.ok(String(lookup(lang, "Registration", `errors.${key}`)).trim(), `${lang}: errors.${key}`);
    }
  }
  assert.equal(messages.es.Registration.errors.firstName.required, "Escribí tu nombre como aparece en tu cédula");
  assert.equal(messages.es.Registration.errors.lastName1.required, "El primer apellido es obligatorio");
  assert.equal(messages.es.Registration.fields.lastName2.hint, "Si no tenés segundo apellido, dejalo vacío");
});

// ---- Paso 3: contraseña, confirmación y términos ----

const renderStep3 = (locale) => renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {}, initialStep: 3 }), locale));

test("paso 3 (es): contraseña, confirmación y términos con etiqueta, mostrar/ocultar, requisitos y botón 'Crear mi cuenta'", () => {
  const html = renderStep3("es");
  assert.match(text(html), /Paso 3 de 3/);
  assert.match(html, /<h3[^>]*tabindex="-1"[^>]*>Elegí tu contraseña<\/h3>/);
  assert.match(html, /<label for="reg-password"[^>]*>Contraseña<\/label>/);
  assert.match(html, /<label for="reg-confirmPassword"[^>]*>Confirmá tu contraseña<\/label>/);
  for (const id of ["reg-password", "reg-confirmPassword"]) {
    const tag = inputTag(html, id);
    assert.match(tag, /type="password"/, id);
    assert.match(tag, /autoComplete="new-password"/, id);
    assert.match(tag, /aria-required="true"/, id);
    assert.doesNotMatch(tag, /maxLength/, id); // no se corta en silencio una contraseña pegada: el error dice 8 a 20
  }
  assert.match(inputTag(html, "reg-password"), /aria-describedby="reg-password-rules"/);
  // mostrar / ocultar (un botón por campo, con aria-pressed y aria-controls)
  assert.equal([...html.matchAll(/<button type="button" aria-pressed="false" aria-controls="reg-(password|confirmPassword)"[^>]*>Mostrar contraseña<\/button>/g)].length, 2);
  // requisitos visibles de la nueva regla
  assert.match(text(html), /Entre 8 y 20 caracteres/);
  assert.match(text(html), /Al menos una letra/);
  assert.match(text(html), /Al menos un número/);
  assert.match(text(html), /Sin espacios al inicio ni al final/);
  assert.doesNotMatch(text(html), /mayúscula|minúscula|64/);
  // términos con enlaces (en el paso 3, no en el 1)
  assert.match(html, /<input id="reg-acceptedTerms" type="checkbox"[^>]*aria-required="true"/);
  assert.match(html, /href="\/legal\/terminos-y-condiciones"/);
  assert.match(html, /href="\/legal\/politica-de-privacidad"/);
  // el botón del pie (sin footerTarget va dentro del formulario) y el formulario con el id que el pie referencia
  assert.match(html, /<form id="registration-complete-form"/);
  assert.match(html, /<button type="submit" form="registration-complete-form"[^>]*>Crear mi cuenta<\/button>/);
  assert.doesNotMatch(html, /role="alert"/); // sin errores antes de interactuar
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /id="reg-(firstName|idNumber|email|phone)"/); // ya no se piden los datos del paso 1
});

test("paso 3 (en): mismos campos y estructura que en español", () => {
  const es = renderStep3("es");
  const en = renderStep3("en");
  assert.match(text(en), /Step 3 of 3/);
  assert.match(en, /<h3[^>]*>Choose your password<\/h3>/);
  assert.match(en, /<label for="reg-password"[^>]*>Password<\/label>/);
  assert.match(en, /<label for="reg-confirmPassword"[^>]*>Confirm your password<\/label>/);
  assert.match(en, /Show password/);
  assert.match(text(en), /Between 8 and 20 characters/);
  assert.match(en, /Create my account<\/button>/);
  assert.match(en, /href="\/en\/legal\/terminos-y-condiciones"/);
  const ids = (h) => [...h.matchAll(/id="(reg-[A-Za-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(en), ids(es));
});

test("reglas del paso 3: confirmación vacía / distinta, términos y contraseña; el primero inválido recibe el foco", () => {
  assert.equal(completionError("password", validCompletion), null);
  assert.equal(completionError("password", { ...validCompletion, password: "corta1" }), "invalid");
  assert.equal(completionError("confirmPassword", { ...validCompletion, confirmPassword: "" }), "required");
  assert.equal(completionError("confirmPassword", { ...validCompletion, confirmPassword: "Otra-Clave-1" }), "mismatch");
  assert.equal(completionError("acceptedTerms", { ...validCompletion, acceptedTerms: false }), "invalid");
  assert.deepEqual(invalidCompletionFields(validCompletion), []);
  assert.deepEqual(invalidCompletionFields({ password: "", confirmPassword: "", acceptedTerms: false }), ["password", "confirmPassword", "acceptedTerms"]);
  assert.deepEqual(invalidCompletionFields({ ...validCompletion, confirmPassword: "x" }), ["confirmPassword"]);
  // la confirmación se compara tal cual (sin recortar): un espacio de más es una diferencia
  assert.equal(completionError("confirmPassword", { ...validCompletion, confirmPassword: validCompletion.password + " " }), "mismatch");
});

test("cuerpo de complete: id, contraseña y términos; la confirmación NO viaja", () => {
  const body = buildCompleteBody("abc", validCompletion);
  assert.deepEqual(body, { attemptId: "abc", password: "Clave-Inventada1", acceptedTerms: true });
  assert.equal("confirmPassword" in body, false);
});

test("la contraseña vive solo en el estado: sin almacenamiento del navegador, sin URL, sin registros", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|document\.cookie|cookieStore/);
  assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/);
  assert.doesNotMatch(src, /\bsearchParams\b|router\.(push|replace)|history\.(push|replace)State|location\.(href|search|hash)/);
  // solo viaja por el cuerpo del POST de register/complete (buildCompleteBody)
  assert.match(src, /post\("complete", buildCompleteBody\(attemptId, completionRef\.current\)\)/);
  assert.doesNotMatch(src, /fetch\(`\/api\/register\/\$\{step\}\?/);
  // se borra al terminar bien, ante un fallo definitivo (failed / restart / disabled) y al empezar de nuevo
  assert.match(src, /setCompletion\(EMPTY_COMPLETION\); \/\/ la contraseña ya no hace falta: se borra/);
  assert.match(src, /outcome === "failed" \|\| outcome === "restart" \|\| outcome === "disabled"/);
  assert.match(src, /const restart = \(\) => \{[\s\S]{0,400}clearCompletion\(\);/);
  // y no pasa por proxy: el proxy del navegador al servidor no la registra
  const proxy = read("lib/registration-proxy.ts");
  assert.doesNotMatch(proxy, /console\.(log|info|warn|error)\([^)]*(password|raw|body)/);
});

test("paso 3: 'enviando', 'estamos terminando', 'listo' con 'Iniciar sesión' (sin sesión automática), error amable con reintento", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  // estados
  assert.match(src, /type Phase = "form" \| "working" \| "processing" \| "created" \| "disabled" \| "failed" \| "restart" \| "retry"/);
  assert.match(src, /phase === "working" \? t\("step3\.submitting"\) : t\("step3\.submit"\)/);
  assert.match(src, /t\("step3\.processingTitle"\)/);
  assert.match(src, /t\("step3\.createdTitle"\)/);
  assert.match(src, /t\("step3\.retryTitle"\)/);
  // 'listo' ofrece iniciar sesión pero NO inicia sesión sola
  assert.match(src, /onClick=\{onBackToLogin\}[\s\S]{0,200}t\("step3\.login"\)/);
  assert.doesNotMatch(src, /\/api\/auth\/login|signIn\(|login\(/);
  // reintento automático: hasta PROCESSING_RETRIES veces cada PROCESSING_RETRY_MS, y luego 'Reintentar'
  assert.match(src, /PROCESSING_RETRY_MS/);
  assert.match(src, /processingRetries >= PROCESSING_RETRIES/);
  assert.match(src, /setPhase\("retry"\)/);
  assert.match(src, /clearTimeout\(timer\)/); // se cancela si el componente se desmonta o cambia de estado
  // accesibilidad: lo informativo role="status"; los errores role="alert"; foco al título del resultado
  assert.match(src, /role="status" aria-live="polite"[^>]*>\s*\{t\("step3\.processingBody"\)\}/);
  assert.match(src, /role="alert"[^>]*>\s*\{t\("step3\.retryBody"\)\}/);
  assert.match(src, /\}, \[step, phase\]\);/); // el foco va al título cuando cambia el paso o el resultado
  // si el servidor rechaza la contraseña o los términos, se muestran en su campo y se enfoca el primero
  assert.match(src, /document\.getElementById\(`reg-\$\{first\}`\)\?\.focus\(\)/);
  assert.match(src, /document\.getElementById\(`reg-\$\{bad\[0\]\}`\)\?\.focus\(\)/);
});

test("pie fijo del paso 3: el botón vive en el pie del panel (fuera del scroll) igual que el del paso 1", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  assert.match(src, /type="submit"\s+form=\{COMPLETE_FORM_ID\}/);
  assert.match(src, /createPortal\(completeFooter, footerTarget\)/);
  assert.match(src, /footerTarget === undefined \? <div className=\{`flex flex-col \$\{FIELD\}`\}>\{completeFooter\}<\/div> : null/);
  assert.match(src, /createPortal\(startFooter, footerTarget\)/); // el del paso 1 sigue igual
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /ref=\{setRegistrationFooter\}[\s\S]{0,400}empty:hidden/); // el pie desaparece cuando no hay botón
});

test("mensajes del paso 3 y de contraseña: llaves nuevas con texto en es y en; sin las del paso viejo", () => {
  for (const lang of ["es", "en"]) {
    const reg = messages[lang].Registration;
    for (const key of ["title", "intro", "submit", "submitting", "processingTitle", "processingBody", "createdTitle", "createdBody", "login", "failedTitle", "failedBody", "retryTitle", "retryBody", "restartTitle", "restartBody", "retry", "disabledTitle", "disabledBody", "home"]) {
      assert.ok(String(reg.step3[key] ?? "").trim(), `${lang}: step3.${key}`);
    }
    for (const key of ["pendingTitle", "pendingBody", "workingTitle", "workingBody", "errorTitle"]) assert.equal(reg.step3[key], undefined, `${lang}: step3.${key} (viejo)`);
    for (const key of ["length", "letter", "digit", "edges", "met", "pending", "title"]) assert.ok(String(reg.passwordRules[key] ?? "").trim(), `${lang}: passwordRules.${key}`);
    for (const old of ["upper", "lower"]) assert.equal(reg.passwordRules[old], undefined, `${lang}: passwordRules.${old} (viejo)`);
    assert.ok(reg.fields.confirmPassword.label && reg.fields.password.show && reg.fields.password.hide, `${lang}: fields.password/confirmPassword`);
    assert.ok(reg.errors.confirmPassword.required && reg.errors.confirmPassword.mismatch, `${lang}: errors.confirmPassword`);
  }
  assert.equal(messages.es.Registration.step3.submit, "Crear mi cuenta");
  assert.equal(messages.en.Registration.step3.submit, "Create my account");
  assert.match(messages.es.Registration.passwordRules.length, /20/);
  assert.match(messages.en.Registration.passwordRules.length, /20/);
});
