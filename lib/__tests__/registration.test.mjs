// Registro de clientes: validaciones de campos, clasificación de respuestas, cuerpos permitidos, captcha, render del
// paso 1 (es/en con los textos reales), llaves es/en iguales y garantías de seguridad/accesibilidad en el código.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, stubModule, React } from "./helpers/load-tsx.mjs";
import {
  classifyRegisterError,
  completeOutcome,
  invalidFields,
  isCodeComplete,
  isValidEmail,
  isValidIdNumber,
  isValidPassword,
  isValidPhone,
  maskIdNumber,
  passwordChecks,
  pickAllowedResponse,
  sanitizeRegisterBody,
} from "../registration.ts";
import { DEV_DISABLED_TOKEN, resolveCaptchaMode } from "../captcha-config.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

const valid = { name: "María Jiménez", idNumber: "3-0564-0580", email: "maria@example.com", phone: "8888-7777", password: "Clave1234", acceptedTerms: true };

// ---- Campos ----

test("cédula: física de 9 dígitos y jurídica de 10 que empieza por 3, con o sin guiones", () => {
  for (const ok of ["305640580", "3-0564-0580", "3-101-123456", "3101123456"]) assert.equal(isValidIdNumber(ok), true, ok);
  for (const bad of ["", "12345678", "012345678", "4101123456", "1234567890", "abc"]) assert.equal(isValidIdNumber(bad), false, bad);
});

test("correo y teléfono (8 dígitos de Costa Rica, con +506 opcional)", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("sin-arroba.com"), false);
  assert.equal(isValidEmail("a@b"), false);
  for (const ok of ["88887777", "8888-7777", "+506 8888-7777", "2222 3333"]) assert.equal(isValidPhone(ok), true, ok);
  for (const bad of ["", "1888877", "18887777", "888877"]) assert.equal(isValidPhone(bad), false, bad);
});

test("contraseña: requisitos visibles (largo, mayúscula, minúscula y número)", () => {
  assert.deepEqual(passwordChecks("Clave1234"), { length: true, upper: true, lower: true, digit: true });
  assert.deepEqual(passwordChecks("clave"), { length: false, upper: false, lower: true, digit: false });
  assert.equal(isValidPassword("Clave1234"), true);
  for (const bad of ["clave1234", "CLAVE1234", "ClaveClave", "Cl1"]) assert.equal(isValidPassword(bad), false, bad);
  assert.equal(isValidPassword("A1" + "a".repeat(63)), false); // más de 64
});

test("formulario completo: sin campos inválidos; con errores devuelve cuáles, en orden", () => {
  assert.deepEqual(invalidFields(valid), []);
  assert.deepEqual(invalidFields({ ...valid, email: "x", acceptedTerms: false, name: "ab" }), ["name", "email", "acceptedTerms"]);
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
  const v = classifyRegisterError(400, { code: "validation_failed", fields: ["email", "bogus", "phone"] });
  assert.deepEqual([v.kind, v.fields], ["validation", ["email", "phone"]]);
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
  const out = pickAllowedResponse({ code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email", 5], secret: "no", nested: { a: 1 }, message: { a: 1 } });
  assert.deepEqual(out, { code: "x", attemptId: "a", expiresInSeconds: 600, verified: true, fields: ["email"] });
  assert.deepEqual(pickAllowedResponse(null), {});
  assert.deepEqual(pickAllowedResponse([1, 2]), {});
});

test("cuerpo hacia mercasa-api: solo campos conocidos (sin el token del captcha), con tope de tamaño", () => {
  const start = sanitizeRegisterBody("start", { ...valid, captchaToken: "t", isAdmin: true, name: "x".repeat(500) });
  assert.deepEqual(Object.keys(start).sort(), ["acceptedTerms", "email", "idNumber", "name", "password", "phone"]);
  assert.equal(start.name.length, 120);
  assert.equal(sanitizeRegisterBody("start", { acceptedTerms: "true" }).acceptedTerms, false);
  assert.deepEqual(sanitizeRegisterBody("verify", { attemptId: "a", code: "123456", extra: 1 }), { attemptId: "a", code: "123456" });
  assert.deepEqual(sanitizeRegisterBody("complete", { attemptId: "a", code: "123456" }), { attemptId: "a" });
  assert.deepEqual(sanitizeRegisterBody("complete", null), { attemptId: "" });
});

test("cédula enmascarada: solo los últimos 3 dígitos", () => {
  assert.equal(maskIdNumber("3-0564-0580"), "******580");
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
  assert.match(drawer, /setRegistering\(false\);\s*\}\s*\}/); // al cerrar el panel se vuelve al ingreso y se borra lo escrito
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
  assert.doesNotMatch(html, /id="reg-name-hint"/);
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
