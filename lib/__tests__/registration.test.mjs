// Registro de clientes: validaciones de campos, clasificación de respuestas, cuerpos permitidos, captcha, render del
// paso 1 (es/en con los textos reales), llaves es/en iguales y garantías de seguridad/accesibilidad en el código.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, stubModule, React } from "./helpers/load-tsx.mjs";
import {
  ID_TYPES,
  changeIdType,
  classifyRegisterError,
  completeOutcome,
  emailSuggestion,
  fieldError,
  formatIdNumber,
  formatPhone,
  idNumberError,
  invalidFields,
  isCodeComplete,
  isValidEmail,
  isValidPassword,
  maskIdNumber,
  nameError,
  normalizeEmail,
  normalizeIdInput,
  normalizePhoneInput,
  parseFieldCodes,
  passwordChecks,
  phoneError,
  pickAllowedResponse,
  sanitizeRegisterBody,
  serverErrorKind,
} from "../registration.ts";
import { DEV_DISABLED_TOKEN, resolveCaptchaMode } from "../captcha-config.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

// Datos inventados y claramente falsos.
const valid = { name: "Persona Ejemplo", idType: "fisica", idNumber: "111111111", email: "persona@ejemplo.com", phone: "88887777", password: "Clave1234", acceptedTerms: true };

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

const NAME_CASES = [
  ["fisica", "Persona Ejemplo", true],
  ["fisica", "Persona Ejemplo Tercero", true],
  ["fisica", "María-José Pérez", true],
  ["fisica", "O'Brien Ejemplo", true],
  ["fisica", "Persona   Ejemplo", true],
  ["fisica", "A B", true],
  ["fisica", "Persona", false],
  ["fisica", "Per2 Ejemplo", false],
  ["fisica", "Persona 2", false],
  ["fisica", "Ana", false],
  ["fisica", "ab", false],
  ["fisica", "", false],
  ["fisica", "Ejemplo & Hijos", false],
  ["juridica", "Ejemplo S.A.", true],
  ["juridica", "Ejemplo 24 & Hijos, S.A.", true],
  ["juridica", "Ejemplo", true],
  ["juridica", "Ejemplo-Uno Ltda.", true],
  ["juridica", "12345", false],
  ["juridica", "Ejemplo @ S.A.", false],
  ["juridica", "ab", false],
];

test("nombre por tipo: mismos casos que el servidor", () => {
  for (const [type, name, ok] of NAME_CASES) assert.equal(nameError(name, type) === null, ok, `${type} ${name}`);
  assert.equal(nameError("a".repeat(49) + " " + "b".repeat(50), "fisica"), null); // 100
  assert.notEqual(nameError("a".repeat(50) + " " + "b".repeat(50), "fisica"), null); // 101
});

test("nombre: mensaje por causa (números, falta el apellido, otro)", () => {
  assert.equal(nameError("Per2 Ejemplo", "fisica"), "digits");
  assert.equal(nameError("Persona", "fisica"), "surname");
  assert.equal(nameError("ab", "fisica"), "invalid");
  assert.equal(nameError("Ejemplo @ S.A.", "juridica"), "invalid");
});

test("contraseña: requisitos visibles (largo, mayúscula, minúscula y número)", () => {
  assert.deepEqual(passwordChecks("Clave1234"), { length: true, upper: true, lower: true, digit: true });
  assert.deepEqual(passwordChecks("clave"), { length: false, upper: false, lower: true, digit: false });
  assert.equal(isValidPassword("Clave1234"), true);
  for (const bad of ["clave1234", "CLAVE1234", "ClaveClave", "Cl1"]) assert.equal(isValidPassword(bad), false, bad);
  assert.equal(isValidPassword("A1" + "a".repeat(63)), false); // más de 64
});

test("formulario completo: sin campos inválidos; con errores devuelve cuáles, en el orden de la pantalla (foco al primero)", () => {
  assert.deepEqual(invalidFields(valid), []);
  assert.deepEqual(invalidFields({ ...valid, email: "x", acceptedTerms: false, name: "ab" }), ["name", "email", "acceptedTerms"]);
  assert.deepEqual(invalidFields({ ...valid, idNumber: "1111", phone: "1" }), ["idNumber", "phone"]);
  assert.equal(fieldError("idNumber", { ...valid, idType: "juridica" }), "length"); // los dígitos de una física no sirven como jurídica
  assert.equal(fieldError("name", { ...valid, name: "Persona" }), "surname");
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

test("paso 3: 200 = en revisión; registro apagado = mensaje honesto; vencido = empezar de nuevo; otra falla = reintentar", () => {
  assert.equal(completeOutcome(200, { status: "pending_review" }), "pending");
  assert.equal(completeOutcome(503, { code: "registration_disabled" }), "disabled");
  assert.equal(completeOutcome(503, { code: "registration_not_available" }), "disabled");
  assert.equal(completeOutcome(410, { code: "code_expired" }), "restart");
  assert.equal(completeOutcome(409, { code: "not_verified" }), "restart");
  assert.equal(completeOutcome(503, { code: "service_unavailable" }), "retry");
  assert.equal(completeOutcome(0, null), "retry");
});

test("solo pasan al navegador las claves conocidas y valores simples", () => {
  const out = pickAllowedResponse({ code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email", 5], fieldErrors: ["email:invalid_email"], secret: "no", nested: { a: 1 }, message: { a: 1 } });
  assert.deepEqual(out, { code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email"], fieldErrors: ["email:invalid_email"] });
  assert.deepEqual(pickAllowedResponse(null), {});
  assert.deepEqual(pickAllowedResponse([1, 2]), {});
});

test("cuerpo hacia mercasa-api: solo campos conocidos (sin el token del captcha), con tope de tamaño", () => {
  const start = sanitizeRegisterBody("start", { ...valid, captchaToken: "t", isAdmin: true, name: "x".repeat(500) });
  assert.deepEqual(Object.keys(start).sort(), ["acceptedTerms", "email", "idNumber", "idType", "name", "password", "phone"]);
  assert.equal(start.idType, "fisica");
  assert.equal(start.name.length, 120);
  assert.equal(sanitizeRegisterBody("start", { acceptedTerms: "true" }).acceptedTerms, false);
  assert.deepEqual(sanitizeRegisterBody("verify", { attemptId: "a", code: "123456", extra: 1 }), { attemptId: "a", code: "123456" });
  assert.deepEqual(sanitizeRegisterBody("complete", { attemptId: "a", code: "123456" }), { attemptId: "a" });
  assert.deepEqual(sanitizeRegisterBody("complete", null), { attemptId: "" });
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
  for (const field of ["name", "idNumber", "email", "phone", "password"]) {
    assert.match(html, new RegExp(`<label for="reg-${field}"`), field); // etiqueta asociada
    assert.match(html, new RegExp(`id="reg-${field}"`), field);
  }
  assert.match(html, /autoComplete="new-password"|autocomplete="new-password"/);
  assert.match(text(html), /Entre 8 y 64 caracteres/);
  assert.match(text(html), /Una letra mayúscula/);
  assert.match(html, /aria-describedby="[^"]*reg-password-rules/);
  assert.match(html, /href="\/legal\/terminos-y-condiciones"/);
  assert.match(html, /href="\/legal\/politica-de-privacidad"/);
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
  assert.match(en, /href="\/en\/legal\/terminos-y-condiciones"/);
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
  // la contraseña se borra del estado cuando el servidor acepta el paso 1
  assert.match(src, /setValues\(\(v\) => \(\{ \.\.\.v, password: "" \}\)\)/);
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
  assert.equal([...src.matchAll(/\$\{STEP_TOP\} flex flex-col \$\{BLOCK\}/g)].length, 3); // los 3 pasos igual
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
  for (const id of ["name", "idNumber", "email", "phone", "password"]) {
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
  const rules = ["length", "upper", "lower", "digit"];
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
  for (const rule of ["length", "upper", "lower", "digit"]) used.add(`passwordRules.${rule}`);

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
  assert.match(html, /<label for="reg-name"[^>]*>Nombre completo<\/label>/); // física: nombre completo
  assert.match(text(html), /Nombre y al menos un apellido/);
});

test("paso 1: teléfono numérico con autocomplete tel-national y máscara; correo type=email con tope de 254", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "es"));
  assert.match(html, /<input id="reg-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="8888-7777"/);
  assert.match(html, /<input id="reg-email" type="email" inputMode="email" autoComplete="email" maxLength="254"/);
  assert.match(html, /<input id="reg-idNumber" type="text" inputMode="numeric"/);
  assert.match(html, /<input id="reg-name" type="text" autoComplete="name" maxLength="100"/);
});

test("paso 1 (en): tipo de cédula, ayudas y etiquetas en inglés con los mismos campos", () => {
  const html = renderToHtml(withIntl(React.createElement(RegistrationFlow, { onBackToLogin: () => {} }), "en"));
  assert.match(html, /<legend[^>]*>ID type<\/legend>/);
  assert.match(html, /Individual/);
  assert.match(html, /Company/);
  assert.match(text(html), /9 digits\. E\.g\. 1-1111-1111/);
  assert.match(html, /<label for="reg-name"[^>]*>Full name<\/label>/);
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
  assert.match(src, /idNumber: changeIdType\(v\.idNumber, type\)/);
  // el correo se normaliza al salir del campo y al enviar; la sugerencia no bloquea el envío
  assert.match(src, /email: normalizeEmail\(s\.email\)/);
  assert.match(src, /email: normalizeEmail\(values\.email\), captchaToken/);
  assert.doesNotMatch(src, /suggestedEmail[^\n]*(return|setFormError)/);
  // errores: al salir del campo o al enviar (no por tecla); una vez mostrados se actualizan en vivo
  assert.match(src, /touched\[field\] \|\| serverFields\.includes\(field\)/);
  assert.match(src, /onBlur=\{\(\) => touch\("phone"\)\}/);
  assert.match(src, /setTouched\(Object\.fromEntries\(FIELD_ORDER\.map/);
  // foco al primer campo inválido al enviar y al primero que rechaza el servidor
  assert.match(src, /document\.getElementById\(`reg-\$\{bad\[0\]\}`\)\?\.focus\(\)/);
  assert.match(src, /FIELD_ORDER\.find\(\(field\) => error\.fields\.includes\(field\)\)/);
  // cada error asociado a su campo
  assert.match(src, /aria-invalid=\{invalid \|\| undefined\}/);
  assert.match(src, /aria-describedby=\{described\}/);
  // al servidor viaja solo el tipo y los dígitos (sin máscara)
  assert.match(src, /post\("start", \{ \.\.\.values,/);
});

test("el orden de los campos (y del foco al error) es el de la pantalla: cédula, nombre, correo, teléfono, contraseña, términos", () => {
  const src = read("components/registration/RegistrationFlow.tsx");
  const order = ["idNumber", "name", "email", "phone", "password"].map((f) => src.indexOf(`field="${f}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.deepEqual(invalidFields({ ...valid, idNumber: "", name: "", email: "", phone: "", password: "", acceptedTerms: false }), [
    "idNumber", "name", "email", "phone", "password", "acceptedTerms",
  ]);
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
