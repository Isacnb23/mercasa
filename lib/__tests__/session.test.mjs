// Sesión con refresh token: renovación silenciosa, un solo refresh a la vez, fallo -> cookies limpias, cookies httpOnly/Strict
// separadas, CSRF, mapeo de errores, IP real y que los tokens nunca salgan en logs ni lleguen al navegador. Todo con dobles:
// NADA contra mercasa-api, homex-api, AX ni el bridge reales. Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadFromRoot } from "./helpers/load-tsx.mjs";

const core = loadFromRoot("lib/session-core.ts");
const { clientIp } = loadFromRoot("lib/client-ip.ts");
const { installSessionExpiryGuard, isSessionExpiryCandidate } = loadFromRoot("lib/session-client.ts");
const cookiesLib = loadFromRoot("lib/auth-cookies.ts");

const {
  createRefresher,
  createSessionService,
  decodeRefreshBundle,
  encodeRefreshBundle,
  gateReply,
  isSameOriginRequest,
  refreshUpstream,
  setSessionCookies,
  clearSessionCookies,
  tokenSecondsLeft,
} = core;

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

// JWT sin firma con `exp` (la web solo lee el payload).
const jwt = (secondsFromNow, now = Date.now()) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ exp: Math.floor(now / 1000) + secondsFromNow })}.firma`;
};

const BUNDLE = { customerId: "1-0234-0567", refreshToken: "refresh-viejo-secreto" };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cookies falsas: guardan lo que se les escribe.
function fakeJar(initial = {}) {
  const map = new Map(Object.entries(initial).map(([name, value]) => [name, { value, options: {} }]));
  return {
    map,
    get: (name) => map.get(name),
    set: (name, value, options) => (value === "" && options?.maxAge === 0 ? map.delete(name) : map.set(name, { value, options })),
    delete: (name) => map.delete(name),
  };
}

// Almacén de sesión sobre cookies falsas, igual que el adaptador de lib/session.ts.
function storeOver(jar) {
  return async () => ({
    access: () => jar.map.get(cookiesLib.SESSION_COOKIE)?.value,
    refreshCookie: () => jar.map.get(cookiesLib.REFRESH_COOKIE)?.value,
    setSession: (session) => setSessionCookies(jar, session),
    clear: () => clearSessionCookies(jar),
  });
}

function serviceWith(jar, call, now = Date.now) {
  const refresher = createRefresher({ call, now });
  return createSessionService({ store: storeOver(jar), refresher, now });
}

const okResult = (token = jwt(300), refreshToken = "refresh-nuevo-secreto") => ({ kind: "ok", token, refreshToken, customerId: BUNDLE.customerId });

// ── cookies ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("el refresh va en OTRA cookie, httpOnly, SameSite=Strict y con path restringido a /api; el JWT en la suya", () => {
  const jar = fakeJar();
  setSessionCookies(jar, { token: jwt(300), refreshToken: "refresh-1", customerId: "1-0234-0567" });

  const access = jar.map.get(cookiesLib.SESSION_COOKIE);
  const refresh = jar.map.get(cookiesLib.REFRESH_COOKIE);

  assert.notEqual(cookiesLib.SESSION_COOKIE, cookiesLib.REFRESH_COOKIE);
  assert.equal(access.options.httpOnly, true);
  assert.equal(access.options.sameSite, "lax");
  assert.equal(access.options.path, "/");
  assert.ok(access.options.maxAge > 0 && access.options.maxAge <= 300);

  assert.equal(refresh.options.httpOnly, true);
  assert.equal(refresh.options.sameSite, "strict");
  assert.equal(refresh.options.path, "/api");
  assert.equal(refresh.options.maxAge, 7 * 24 * 60 * 60);
  assert.equal(refresh.options.secure, process.env.NODE_ENV === "production");
  // El valor de la cookie del refresh no lleva el JWT, y el del JWT no lleva el refresh.
  assert.ok(!access.value.includes("refresh-1"));
  assert.deepEqual(decodeRefreshBundle(refresh.value), { customerId: "1-0234-0567", refreshToken: "refresh-1" });
});

test("sin refresh (mercasa-api viejo) solo se guarda el JWT, como antes", () => {
  const jar = fakeJar();
  setSessionCookies(jar, { token: jwt(300) });

  assert.ok(jar.map.has(cookiesLib.SESSION_COOKIE));
  assert.ok(!jar.map.has(cookiesLib.REFRESH_COOKIE));
});

test("limpiar borra las DOS cookies (la del refresh con el mismo path con que se creó)", () => {
  const jar = fakeJar();
  setSessionCookies(jar, { token: jwt(300), refreshToken: "r", customerId: "c" });
  const calls = [];
  const spy = { set: (...args) => { calls.push(["set", ...args]); jar.set(...args); }, delete: (name) => { calls.push(["delete", name]); jar.delete(name); } };

  clearSessionCookies(spy);

  assert.equal(jar.map.size, 0);
  const refreshClear = calls.find((c) => c[0] === "set" && c[1] === cookiesLib.REFRESH_COOKIE);
  assert.equal(refreshClear[3].path, "/api");
  assert.equal(refreshClear[3].maxAge, 0);
});

test("hasSessionCookies cuenta el refresh: con el JWT vencido (ya no está en el navegador) todavía hay sesión que renovar", () => {
  const only = (name) => ({ get: (n) => (n === name ? { value: "x" } : undefined) });
  assert.equal(cookiesLib.hasSessionCookies(only(cookiesLib.SESSION_COOKIE)), true);
  assert.equal(cookiesLib.hasSessionCookies(only(cookiesLib.REFRESH_COOKIE)), true);
  assert.equal(cookiesLib.hasSessionCookies({ get: () => undefined }), false);
});

test("ida y vuelta de la cookie del refresh; valores dañados se descartan", () => {
  assert.deepEqual(decodeRefreshBundle(encodeRefreshBundle(BUNDLE)), BUNDLE);
  for (const bad of [undefined, null, "", "no-es-base64-json", Buffer.from("{}").toString("base64url"), Buffer.from('{"c":"x"}').toString("base64url")]) {
    assert.equal(decodeRefreshBundle(bad), null);
  }
});

test("vigencia del JWT", () => {
  const now = Date.now();
  assert.ok(tokenSecondsLeft(jwt(120, now), now) <= 120);
  assert.ok(tokenSecondsLeft(jwt(-5, now), now) <= 0);
  assert.equal(tokenSecondsLeft("basura"), null);
  assert.equal(tokenSecondsLeft(undefined), null);
});

// ── renovación silenciosa ─────────────────────────────────────────────────────────────────────────────────────────────────

test("JWT vigente: se usa tal cual, sin llamar al refresh", async () => {
  const access = jwt(200);
  const jar = fakeJar({ [cookiesLib.SESSION_COOKIE]: access, [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  let calls = 0;

  const session = await serviceWith(jar, async () => { calls++; return okResult(); }).resolveSession();

  assert.deepEqual(session, { kind: "ok", token: access, renewed: false });
  assert.equal(calls, 0);
});

test("JWT vencido (la cookie ya no está) con refresh: renueva en silencio y deja las dos cookies nuevas", async () => {
  const jar = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const fresh = jwt(300);
  const seen = [];

  const session = await serviceWith(jar, async (bundle) => { seen.push(bundle); return okResult(fresh, "refresh-2"); }).resolveSession();

  assert.deepEqual(session, { kind: "ok", token: fresh, renewed: true });
  assert.deepEqual(seen, [BUNDLE]);
  assert.equal(jar.map.get(cookiesLib.SESSION_COOKIE).value, fresh);
  assert.equal(decodeRefreshBundle(jar.map.get(cookiesLib.REFRESH_COOKIE).value).refreshToken, "refresh-2"); // el refresh ROTÓ
});

test("JWT por vencer (menos de 30 s) también se renueva antes de usarlo", async () => {
  const jar = fakeJar({ [cookiesLib.SESSION_COOKIE]: jwt(10), [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  let calls = 0;

  const session = await serviceWith(jar, async () => { calls++; return okResult(); }).resolveSession();

  assert.equal(session.kind, "ok");
  assert.equal(session.renewed, true);
  assert.equal(calls, 1);
});

test("una petición con JWT vencido: el 401 renueva UNA vez y repite la misma petición con el JWT nuevo", async () => {
  const jar = fakeJar({ [cookiesLib.SESSION_COOKIE]: "jwt-vencido", [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const fresh = jwt(300);
  let refreshes = 0;
  const service = serviceWith(jar, async () => { refreshes++; return okResult(fresh); });
  const used = [];

  const response = await service.withSessionRetry("jwt-vencido", async (token) => {
    used.push(token);
    return { status: token === fresh ? 200 : 401 };
  });

  assert.equal(response.status, 200);
  assert.deepEqual(used, ["jwt-vencido", fresh]);
  assert.equal(refreshes, 1);
});

test("si tras renovar sigue el 401, no se repite más (una sola repetición)", async () => {
  const jar = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const service = serviceWith(jar, async () => okResult(jwt(300)));
  let runs = 0;

  const response = await service.withSessionRetry("viejo", async () => { runs++; return { status: 401 }; });

  assert.equal(response.status, 401);
  assert.equal(runs, 2);
});

test("un resultado que no es 401 no dispara renovación", async () => {
  const jar = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  let refreshes = 0;
  const service = serviceWith(jar, async () => { refreshes++; return okResult(); });

  for (const status of [200, 400, 404, 429, 503]) assert.equal((await service.withSessionRetry("t", async () => ({ status }))).status, status);
  assert.equal(refreshes, 0);
});

// ── un solo refresh a la vez ──────────────────────────────────────────────────────────────────────────────────────────────

test("peticiones simultáneas con el mismo refresh: UNA sola llamada y todas reciben el mismo resultado", async () => {
  const jar = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  let calls = 0;
  const service = serviceWith(jar, async () => { calls++; await delay(20); return okResult(jwt(300), "refresh-2"); });

  const results = await Promise.all(Array.from({ length: 6 }, () => service.resolveSession()));

  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.kind === "ok" && r.token === results[0].token));
});

test("la petición que salió con la cookie vieja y llega DESPUÉS de renovar recibe el mismo resultado, sin un segundo refresh que falle", async () => {
  const refresher = createRefresher({ call: async () => okResult(jwt(300), "refresh-2"), graceMs: 60_000 });

  const first = await refresher.refresh(BUNDLE);
  const late = await refresher.refresh(BUNDLE);

  assert.equal(first.kind, "ok");
  assert.deepEqual(late, first);
});

test("pasado el período de gracia se vuelve a llamar", async () => {
  let t = 1_000;
  let calls = 0;
  const refresher = createRefresher({ call: async () => { calls++; return okResult(); }, now: () => t, graceMs: 1_000 });

  await refresher.refresh(BUNDLE);
  t += 1_001;
  await refresher.refresh(BUNDLE);

  assert.equal(calls, 2);
});

test("sesiones distintas no comparten renovación", async () => {
  let calls = 0;
  const refresher = createRefresher({ call: async () => { calls++; return okResult(); } });

  await Promise.all([refresher.refresh(BUNDLE), refresher.refresh({ ...BUNDLE, refreshToken: "otro-refresh" })]);

  assert.equal(calls, 2);
});

test("los fallos transitorios NO se recuerdan (se puede reintentar); el vencido sí, para no insistir", async () => {
  let calls = 0;
  const transient = createRefresher({ call: async () => { calls++; return { kind: "unavailable" }; } });
  await transient.refresh(BUNDLE);
  await transient.refresh(BUNDLE);
  assert.equal(calls, 2);

  calls = 0;
  const definitive = createRefresher({ call: async () => { calls++; return { kind: "expired" }; } });
  await definitive.refresh(BUNDLE);
  await definitive.refresh(BUNDLE);
  assert.equal(calls, 1);
});

test("una excepción al renovar se vuelve 'unavailable' y no deja la renovación colgada", async () => {
  let calls = 0;
  const refresher = createRefresher({ call: async () => { calls++; throw new Error("boom"); } });

  assert.deepEqual(await refresher.refresh(BUNDLE), { kind: "unavailable" });
  assert.deepEqual(await refresher.refresh(BUNDLE), { kind: "unavailable" });
  assert.equal(calls, 2);
});

// ── fallo del refresh ─────────────────────────────────────────────────────────────────────────────────────────────────────

test("refresh vencido, inválido o revocado: se limpian las DOS cookies y se responde 401 session_expired (el carrito no es de la sesión)", async () => {
  const jar = fakeJar({ [cookiesLib.SESSION_COOKIE]: "jwt-vencido", [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });

  const session = await serviceWith(jar, async () => ({ kind: "expired" })).resolveSession();

  assert.deepEqual(session, { kind: "expired" });
  assert.equal(jar.map.size, 0);
  const reply = gateReply(session, "Iniciá sesión para guardar la dirección.");
  assert.equal(reply.status, 401);
  assert.equal(reply.body.code, "session_expired");
  assert.equal(reply.body.error, "Iniciá sesión para guardar la dirección.");

  // El carrito vive en localStorage y nada de la sesión lo toca.
  assert.ok(!/cart|carrito/i.test(read("lib/session-core.ts").replace(/\/\/.*$/gm, "")));
  assert.match(read("lib/cart-context.tsx"), /localStorage/);
});

test("sin cookies de sesión: 401 sin code; la 'expired' lleva code; límite y servicio caído tienen su respuesta", () => {
  assert.deepEqual(gateReply({ kind: "none" }).body, { error: "Sesión requerida." });
  assert.equal(gateReply({ kind: "none" }).status, 401);

  const limited = gateReply({ kind: "rate_limited", retryAfter: 12 });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["Retry-After"], "12");
  assert.equal(limited.body.code, "rate_limited");

  const down = gateReply({ kind: "unavailable" });
  assert.equal(down.status, 503);
  assert.equal(down.body.code, "service_unavailable");
  for (const reply of [limited, down, gateReply({ kind: "none" })]) assert.equal(reply.headers["Cache-Control"], "no-store");
});

test("un fallo transitorio del refresh conserva las cookies y, si el JWT aún sirve, lo usa; si no, 503 (no 'sesión vencida')", async () => {
  const stillGood = jwt(20);
  const jarA = fakeJar({ [cookiesLib.SESSION_COOKIE]: stillGood, [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const a = await serviceWith(jarA, async () => ({ kind: "unavailable" })).resolveSession();
  assert.deepEqual(a, { kind: "ok", token: stillGood, renewed: false });
  assert.equal(jarA.map.size, 2);

  const jarB = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const b = await serviceWith(jarB, async () => ({ kind: "unavailable" })).resolveSession();
  assert.deepEqual(b, { kind: "unavailable" });
  assert.ok(jarB.map.has(cookiesLib.REFRESH_COOKIE));

  const jarC = fakeJar({ [cookiesLib.REFRESH_COOKIE]: encodeRefreshBundle(BUNDLE) });
  const c = await serviceWith(jarC, async () => ({ kind: "rate_limited", retryAfter: 9 })).resolveSession();
  assert.deepEqual(c, { kind: "rate_limited", retryAfter: 9 });
});

test("sin ninguna cookie: none; solo JWT sin refresh (mercasa-api viejo): se usa mientras sirva", async () => {
  const none = await serviceWith(fakeJar(), async () => okResult()).resolveSession();
  assert.deepEqual(none, { kind: "none" });

  const access = jwt(100);
  const only = await serviceWith(fakeJar({ [cookiesLib.SESSION_COOKIE]: access }), async () => okResult()).resolveSession();
  assert.deepEqual(only, { kind: "ok", token: access, renewed: false });
});

// ── logout ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("el logout borra ambas cookies y solo acepta peticiones del mismo sitio; no inventa una revocación en homex-api", () => {
  const source = read("app/api/auth/logout/route.ts");
  assert.match(source, /clearSessionCookies/);
  assert.match(source, /isSameOriginRequest/);
  assert.doesNotMatch(source, /fetch\(/); // homex-api no ofrece cómo revocar: no se llama a nada
});

// ── CSRF ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("CSRF: Sec-Fetch-Site same-origin o, si falta, Origin igual al host; todo lo demás se rechaza", () => {
  assert.equal(isSameOriginRequest({ secFetchSite: "same-origin", origin: null, host: "mercasacr.com" }), true);
  assert.equal(isSameOriginRequest({ secFetchSite: "cross-site", origin: "https://mercasacr.com", host: "mercasacr.com" }), false);
  assert.equal(isSameOriginRequest({ secFetchSite: "same-site", origin: "https://otra.mercasacr.com", host: "mercasacr.com" }), false);
  assert.equal(isSameOriginRequest({ secFetchSite: "none", origin: null, host: "mercasacr.com" }), false);

  assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "https://mercasacr.com", host: "mercasacr.com" }), true);
  assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "https://malo.example", host: "mercasacr.com" }), false);
  assert.equal(isSameOriginRequest({ secFetchSite: null, origin: null, host: "mercasacr.com" }), false);
  assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "no-es-url", host: "mercasacr.com" }), false);
});

test("la ruta de refresh exige el mismo sitio (403 si no) y nunca devuelve tokens en el cuerpo", () => {
  const source = read("app/api/auth/refresh/route.ts");
  assert.match(source, /isSameOriginRequest/);
  assert.match(source, /status: 403/);
  assert.doesNotMatch(source, /token:/);
  assert.doesNotMatch(source, /console\./);
});

// ── mapeo de errores del refresh contra mercasa-api ───────────────────────────────────────────────────────────────────────

const reply = (status, body = {}, headers = {}) => async () => new Response(JSON.stringify(body), { status, headers });

test("mapeo: 200 -> ok con tokens; 401/400/404 -> expired; 429 -> rate_limited con su espera; 5xx, red y cuerpos raros -> unavailable", async () => {
  const deps = (fetchFn) => ({ apiBase: "http://api.test", apiKey: "llave-inventada", fetchFn });

  const ok = await refreshUpstream(BUNDLE, deps(reply(200, { token: "jwt-n", refreshToken: "ref-n", expiresAtUtc: null })));
  assert.deepEqual(ok, { kind: "ok", token: "jwt-n", refreshToken: "ref-n", customerId: BUNDLE.customerId });

  for (const status of [401, 400, 404]) assert.deepEqual(await refreshUpstream(BUNDLE, deps(reply(status, { code: "session_expired" }))), { kind: "expired" });

  assert.deepEqual(await refreshUpstream(BUNDLE, deps(reply(429, {}, { "Retry-After": "42" }))), { kind: "rate_limited", retryAfter: 42 });
  assert.deepEqual(await refreshUpstream(BUNDLE, deps(reply(429))), { kind: "rate_limited", retryAfter: 60 });

  for (const status of [500, 502, 503, 504]) assert.deepEqual(await refreshUpstream(BUNDLE, deps(reply(status))), { kind: "unavailable" });
  assert.deepEqual(await refreshUpstream(BUNDLE, deps(reply(200, { token: "solo-jwt" }))), { kind: "unavailable" });
  assert.deepEqual(await refreshUpstream(BUNDLE, deps(async () => { throw new Error("sin red"); })), { kind: "unavailable" });
  assert.deepEqual(await refreshUpstream(BUNDLE, { apiBase: undefined, apiKey: undefined }), { kind: "unavailable" });
});

test("el refresh va a /api/auth/refresh con la API key y la IP real del visitante en X-Client-Ip", async () => {
  let seen;
  await refreshUpstream(BUNDLE, {
    apiBase: "http://api.test",
    apiKey: "llave-inventada",
    ip: "203.0.113.7",
    fetchFn: async (url, init) => { seen = { url, init }; return new Response("{}", { status: 401 }); },
  });

  assert.equal(seen.url, "http://api.test/api/auth/refresh");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["X-Api-Key"], "llave-inventada");
  assert.equal(seen.init.headers["X-Client-Ip"], "203.0.113.7");
  assert.deepEqual(JSON.parse(seen.init.body), { customerId: BUNDLE.customerId, refreshToken: BUNDLE.refreshToken });
});

test("sin IP no se manda X-Client-Ip", async () => {
  let headers;
  await refreshUpstream(BUNDLE, { apiBase: "http://api.test", apiKey: "k", fetchFn: async (_url, init) => { headers = init.headers; return new Response("{}", { status: 401 }); } });
  assert.ok(!("X-Client-Ip" in headers));
});

// ── IP real ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("la IP del visitante sale de x-forwarded-for (primer valor) o x-real-ip; dos visitantes distintos no comparten IP", () => {
  const h = (map) => ({ get: (name) => map[name] ?? null });

  assert.equal(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIp(h({ "x-forwarded-for": "203.0.113.8" })), "203.0.113.8");
  assert.equal(clientIp(h({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientIp(h({})), undefined);
  assert.notEqual(clientIp(h({ "x-forwarded-for": "203.0.113.7" })), clientIp(h({ "x-forwarded-for": "203.0.113.8" })));
});

test("el login de la web manda X-Client-Ip como el registro, con la misma función", () => {
  const login = read("app/api/auth/login/route.ts");
  assert.match(login, /clientIp\(await headers\(\)\)/);
  assert.match(login, /X-Client-Ip/);
  assert.match(read("lib/registration-proxy.ts"), /clientIp\(request\.headers\)/);
  assert.match(login, /status: 429/); // el límite de intentos llega a la pantalla con Retry-After
});

// ── aviso en el navegador ─────────────────────────────────────────────────────────────────────────────────────────────────

test("el guardián avisa una vez al recibir 401 de /api/ con sesión; ignora /api/auth/*, otros estados y 'sin sesión'", async () => {
  let loggedIn = true;
  let expired = 0;
  const host = { fetch: async (input) => new Response("{}", { status: String(input).includes("login") ? 401 : String(input).includes("ok") ? 200 : 401 }) };
  const restore = installSessionExpiryGuard(host, { baseHref: "https://mercasacr.com/", isLoggedIn: () => loggedIn, onExpired: () => expired++ });

  await host.fetch("/api/auth/login");            // credenciales malas: no es sesión perdida
  await host.fetch("/api/addresses/ok");          // 200
  assert.equal(expired, 0);

  await host.fetch("/api/addresses");             // 401 con sesión
  assert.equal(expired, 1);

  loggedIn = false;
  await host.fetch("/api/addresses");             // sin sesión: no avisa
  assert.equal(expired, 1);

  restore();
});

test("el guardián se desinstala y no toca otras URLs", async () => {
  const original = async () => new Response("{}", { status: 401 });
  const host = { fetch: original };
  let expired = 0;
  const restore = installSessionExpiryGuard(host, { baseHref: "https://mercasacr.com/", isLoggedIn: () => true, onExpired: () => expired++ });

  await host.fetch("https://otro-sitio.example/api/x");
  await host.fetch("/pagina");
  assert.equal(expired, 0);

  restore();
  assert.equal(host.fetch, original);
  assert.equal(isSessionExpiryCandidate("/api/orders", "https://mercasacr.com/"), true);
  assert.equal(isSessionExpiryCandidate("/api/auth/session", "https://mercasacr.com/"), false);
});

// ── tokens nunca en logs ni al navegador ──────────────────────────────────────────────────────────────────────────────────

test("el código de sesión no registra nada (ni tokens) y los tokens no salen en respuestas", () => {
  for (const file of ["lib/session-core.ts", "lib/session.ts", "lib/client-ip.ts", "app/api/auth/session/route.ts", "app/api/auth/refresh/route.ts", "app/api/auth/logout/route.ts"]) {
    const code = read(file).replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /console\./, `${file} no debe usar console`);
  }

  // Las rutas de /api/auth devuelven `user`, nunca `token` ni `refreshToken`.
  for (const file of ["app/api/auth/login/route.ts", "app/api/auth/session/route.ts", "app/api/auth/refresh/route.ts"]) {
    const code = read(file).replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /NextResponse\.json\(\{[^}]*(token|refreshToken)/i, `${file} no debe devolver tokens`);
  }

  // Y el contexto del navegador nunca los lee.
  const client = (read("lib/auth-context.tsx") + read("lib/session-client.ts")).replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(client, /document\.cookie|localStorage|sessionStorage|refreshToken/);
});

test("el guardián del navegador no deja de mostrar el carrito: no toca localStorage", () => {
  assert.doesNotMatch(read("lib/session-client.ts"), /localStorage/);
  assert.doesNotMatch(read("lib/auth-context.tsx"), /CART_STORAGE_KEY|cart-context/);
});

test("el aviso 'Tu sesión expiró' existe en español e inglés", () => {
  const es = JSON.parse(read("messages/es.json"));
  const en = JSON.parse(read("messages/en.json"));
  assert.match(es.Profile.sessionExpiredNotice, /sesión expiró, iniciá sesión de nuevo/);
  assert.ok(en.Profile.sessionExpiredNotice.length > 0);
});

// ── todas las rutas con sesión usan el mismo camino ───────────────────────────────────────────────────────────────────────

test("las rutas que usan el JWT pasan por sessionGate / withSessionRetry y ya no leen la cookie del JWT a mano", () => {
  for (const file of ["lib/checkout-proxy.ts", "lib/orders-proxy.ts", "app/api/addresses/route.ts", "app/api/directions/route.ts", "app/api/directions/[id]/route.ts"]) {
    const code = read(file);
    assert.match(code, /sessionGate/, `${file} usa sessionGate`);
    assert.match(code, /withSessionRetry/, `${file} usa withSessionRetry`);
    assert.doesNotMatch(code, /store\.get\(SESSION_COOKIE\)/, `${file} no lee la cookie del JWT a mano`);
  }

  for (const file of ["app/api/catalog/prices/route.ts", "app/api/checkout/delivery-dates/route.ts", "app/api/checkout/order/route.ts", "app/api/checkout/order/validate/route.ts"]) {
    assert.match(read(file), /hasSessionCookies/, `${file} cuenta también el refresh`);
  }
});
