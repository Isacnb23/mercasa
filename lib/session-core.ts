// Lógica pura de la sesión con refresh token (sin Next ni cookies: se prueba con el test runner de Node).
// Los tokens NUNCA se registran en el log ni se devuelven al navegador; aquí no hay ningún console.*.
import { createHash } from "node:crypto";
import {
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_DEFAULT,
  SESSION_COOKIE,
  SESSION_MAX_AGE_FALLBACK,
  refreshCookieOptions,
  sessionCookieOptions,
} from "./auth-cookies";

// ── Cookie del refresh: { cédula con la que se inició sesión, refresh token } ────────────────────────────────────────────
// homex-api guarda la sesión por (cédula tal como se escribió al iniciar sesión, app) y ROTA el refresh en cada renovación,
// así que para renovar hacen falta los dos valores. Solo viaja en una cookie httpOnly.
export interface RefreshBundle {
  customerId: string;
  refreshToken: string;
}

export function encodeRefreshBundle(bundle: RefreshBundle): string {
  return Buffer.from(JSON.stringify({ c: bundle.customerId, r: bundle.refreshToken }), "utf8").toString("base64url");
}

export function decodeRefreshBundle(value: string | undefined | null): RefreshBundle | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { c?: unknown; r?: unknown };
    if (typeof raw.c !== "string" || typeof raw.r !== "string" || !raw.c || !raw.r) return null;
    return { customerId: raw.c, refreshToken: raw.r };
  } catch {
    return null;
  }
}

// ── Vigencia del JWT de acceso ───────────────────────────────────────────────────────────────────────────────────────────
// Segundos que le quedan al token (negativo/0 = vencido; null = no se pudo leer). No valida la firma: solo lee `exp`.
export function tokenSecondsLeft(token: string | undefined | null, nowMs: number = Date.now()): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { exp?: unknown };
    return typeof claims.exp === "number" ? Math.floor(claims.exp - nowMs / 1000) : null;
  } catch {
    return null;
  }
}

// Con menos de esto de vida el JWT se renueva antes de usarlo (para no mandarlo a homex-api justo cuando vence).
export const REFRESH_SKEW_SECONDS = 30;

// ── CSRF de las rutas que renuevan o cierran la sesión ───────────────────────────────────────────────────────────────────
// Sin depender solo de SameSite: se exige que la petición venga de este mismo sitio. Sec-Fetch-Site lo manda el navegador y
// no lo puede falsear una página; si falta, se compara el Origin con el host. Sin ninguno de los dos, se rechaza.
export interface OriginHeaders {
  secFetchSite: string | null;
  origin: string | null;
  host: string | null;
}

export function isSameOriginRequest({ secFetchSite, origin, host }: OriginHeaders): boolean {
  if (secFetchSite) return secFetchSite === "same-origin";
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

// ── Renovación contra mercasa-api ────────────────────────────────────────────────────────────────────────────────────────
export type RefreshResult =
  | { kind: "ok"; token: string; refreshToken: string; customerId: string }
  | { kind: "expired" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "unavailable" };

export interface UpstreamRefreshDeps {
  apiBase: string | undefined;
  apiKey: string | undefined;
  ip?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

// POST {apiBase}/api/auth/refresh. Mapeo (sin detalles internos):
//   200 con token y refreshToken -> ok | 401 / 400 / 404 -> expired (vencida, inválida, ya usada o revocada) |
//   429 -> rate_limited | todo lo demás, timeouts y errores de red -> unavailable
export async function refreshUpstream(bundle: RefreshBundle, deps: UpstreamRefreshDeps): Promise<RefreshResult> {
  if (!deps.apiBase || !deps.apiKey) return { kind: "unavailable" };

  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Api-Key": deps.apiKey };
  if (deps.ip) headers["X-Client-Ip"] = deps.ip;

  let upstream: Response;
  try {
    upstream = await (deps.fetchFn ?? fetch)(`${deps.apiBase}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ customerId: bundle.customerId, refreshToken: bundle.refreshToken }),
      cache: "no-store",
      // Mayor que el timeout de mercasa-api para la renovación (20 s).
      signal: AbortSignal.timeout(deps.timeoutMs ?? 25_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (upstream.status === 200) {
    const data = (await upstream.json().catch(() => null)) as { token?: unknown; refreshToken?: unknown } | null;
    if (typeof data?.token === "string" && data.token && typeof data.refreshToken === "string" && data.refreshToken) {
      return { kind: "ok", token: data.token, refreshToken: data.refreshToken, customerId: bundle.customerId };
    }
    return { kind: "unavailable" };
  }

  if (upstream.status === 401 || upstream.status === 400 || upstream.status === 404) return { kind: "expired" };

  if (upstream.status === 429) {
    const header = upstream.headers.get("Retry-After")?.trim();
    return { kind: "rate_limited", retryAfter: header && /^\d+$/.test(header) ? Number(header) : 60 };
  }

  return { kind: "unavailable" };
}

// ── Un solo refresh a la vez por sesión ──────────────────────────────────────────────────────────────────────────────────
// homex-api ROTA el refresh: el token viejo deja de servir en cuanto se renueva. Si dos peticiones (dos pestañas, o varias
// llamadas en paralelo) renovaran con el MISMO token viejo, la segunda fallaría y se perdería la sesión. Por eso:
//  1. mientras una renovación está en curso, las demás esperan ese mismo resultado (una sola llamada a mercasa-api);
//  2. el resultado queda `graceMs` en memoria, para la petición que ya salió del navegador con la cookie vieja y llega después
//     de que la nueva se guardó. Solo lo recibe quien presenta el refresh token viejo (clave = su hash).
// El caché vive en el proceso: con más de una instancia de la web, cada una renueva aparte (ver docs).
export interface Refresher {
  refresh(bundle: RefreshBundle): Promise<RefreshResult>;
}

export function createRefresher(options: {
  call: (bundle: RefreshBundle) => Promise<RefreshResult>;
  now?: () => number;
  graceMs?: number;
}): Refresher {
  const now = options.now ?? Date.now;
  const graceMs = options.graceMs ?? 60_000;
  const pending = new Map<string, Promise<RefreshResult>>();
  const settled = new Map<string, { result: RefreshResult; until: number }>();

  const keyOf = (bundle: RefreshBundle) => createHash("sha256").update(`${bundle.customerId}\n${bundle.refreshToken}`).digest("hex");

  const sweep = () => {
    const t = now();
    for (const [key, entry] of settled) if (entry.until <= t) settled.delete(key);
  };

  return {
    async refresh(bundle) {
      sweep();
      const key = keyOf(bundle);

      const done = settled.get(key);
      if (done) return done.result;

      const running = pending.get(key);
      if (running) return running;

      const promise = (async () => {
        try {
          const result = await options.call(bundle);
          // Solo lo definitivo se recuerda: un fallo transitorio (503, 429) se puede reintentar.
          if (result.kind === "ok" || result.kind === "expired") settled.set(key, { result, until: now() + graceMs });
          return result;
        } catch {
          return { kind: "unavailable" } as RefreshResult;
        } finally {
          pending.delete(key);
        }
      })();

      pending.set(key, promise);
      return promise;
    },
  };
}

// ── Cookies de la sesión ─────────────────────────────────────────────────────────────────────────────────────────────────
export interface CookieJar {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

function refreshMaxAge(): number {
  const configured = Number(process.env.SESSION_REFRESH_MAX_AGE_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : REFRESH_MAX_AGE_DEFAULT;
}

// Guarda las dos cookies (inicio de sesión y cada renovación). El refresh es opcional: un mercasa-api viejo no lo manda.
export function setSessionCookies(jar: CookieJar, session: { token: string; refreshToken?: string; customerId?: string }): void {
  const secondsLeft = tokenSecondsLeft(session.token);
  jar.set(SESSION_COOKIE, session.token, {
    ...sessionCookieOptions,
    maxAge: secondsLeft !== null && secondsLeft > 0 ? secondsLeft : SESSION_MAX_AGE_FALLBACK,
  });

  if (session.refreshToken && session.customerId) {
    jar.set(REFRESH_COOKIE, encodeRefreshBundle({ customerId: session.customerId, refreshToken: session.refreshToken }), {
      ...refreshCookieOptions,
      maxAge: refreshMaxAge(),
    });
  }
}

export function clearSessionCookies(jar: CookieJar): void {
  jar.delete(SESSION_COOKIE);
  // Para borrarla el navegador exige el mismo path con que se creó.
  jar.set(REFRESH_COOKIE, "", { ...refreshCookieOptions, maxAge: 0 });
}

// ── Servicio de sesión (lo que usan las rutas del servidor) ──────────────────────────────────────────────────────────────
export interface SessionStore {
  access(): string | undefined;
  refreshCookie(): string | undefined;
  setSession(session: { token: string; refreshToken: string; customerId: string }): void;
  clear(): void;
}

export type ResolvedSession =
  | { kind: "ok"; token: string; renewed: boolean }
  | { kind: "none" }
  | { kind: "expired" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "unavailable" };

export interface GateReply {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export function createSessionService(deps: { store: () => Promise<SessionStore>; refresher: Refresher; now?: () => number }) {
  const now = deps.now ?? Date.now;

  // Renueva con el refresh de la cookie y deja las cookies como corresponda. `expired` = ya no hay forma de recuperar la sesión
  // (se limpian las DOS cookies); un fallo transitorio las conserva.
  async function renew(store: SessionStore, bundle: RefreshBundle): Promise<RefreshResult> {
    const result = await deps.refresher.refresh(bundle);
    if (result.kind === "ok") store.setSession({ token: result.token, refreshToken: result.refreshToken, customerId: result.customerId });
    else if (result.kind === "expired") store.clear();
    return result;
  }

  const fromFailure = (result: RefreshResult): ResolvedSession =>
    result.kind === "expired"
      ? { kind: "expired" }
      : result.kind === "rate_limited"
        ? { kind: "rate_limited", retryAfter: result.retryAfter }
        : { kind: "unavailable" };

  // JWT vigente para usar YA. Sin cookies de sesión -> none. Con refresh y JWT vencido o por vencer -> renueva.
  async function resolveSession(): Promise<ResolvedSession> {
    const store = await deps.store();
    const access = store.access();
    const bundle = decodeRefreshBundle(store.refreshCookie());
    const left = tokenSecondsLeft(access, now());

    if (access && left !== null && left > REFRESH_SKEW_SECONDS) return { kind: "ok", token: access, renewed: false };
    if (!bundle) return access && left !== null && left > 0 ? { kind: "ok", token: access, renewed: false } : { kind: "none" };

    const result = await renew(store, bundle);
    if (result.kind === "ok") return { kind: "ok", token: result.token, renewed: true };

    // Falla transitoria: si el JWT todavía sirve unos segundos se usa; si no, el servicio no está disponible.
    if (result.kind !== "expired" && access && left !== null && left > 0) return { kind: "ok", token: access, renewed: false };
    return fromFailure(result);
  }

  // Renovación FORZADA (POST /api/auth/refresh): renueva aunque el JWT todavía sirva.
  async function forceRefresh(): Promise<ResolvedSession> {
    const store = await deps.store();
    const bundle = decodeRefreshBundle(store.refreshCookie());
    if (!bundle) return { kind: "none" };

    const result = await renew(store, bundle);
    return result.kind === "ok" ? { kind: "ok", token: result.token, renewed: true } : fromFailure(result);
  }

  // Tras un 401 con el JWT que se mandó: renueva UNA vez y devuelve el JWT nuevo, o null si no se pudo. Varias peticiones que
  // fallan a la vez comparten la misma renovación (ver createRefresher).
  async function refreshAfterUnauthorized(): Promise<string | null> {
    const store = await deps.store();
    const bundle = decodeRefreshBundle(store.refreshCookie());
    if (!bundle) return null;

    const result = await renew(store, bundle);
    return result.kind === "ok" ? result.token : null;
  }

  // Ejecuta `run` con el JWT; si responde 401 renueva una vez y repite la MISMA petición. Un 401 significa que no se procesó nada,
  // así que repetir es seguro también para el pedido. Si no se pudo renovar, devuelve el 401 original.
  async function withSessionRetry<T extends { status: number }>(token: string, run: (token: string) => Promise<T>): Promise<T> {
    const first = await run(token);
    if (first.status !== 401) return first;

    const next = await refreshAfterUnauthorized();
    return next ? run(next) : first;
  }

  return { resolveSession, forceRefresh, refreshAfterUnauthorized, withSessionRetry };
}

// Respuesta de error de las rutas cuando no hay JWT utilizable:
//   sin sesión / vencida -> 401 (code "session_expired" si había refresh y ya no sirve) | límite -> 429 con Retry-After |
//   servicio de renovación caído -> 503 service_unavailable
export function gateReply(session: Exclude<ResolvedSession, { kind: "ok" }>, unauthorizedMessage = "Sesión requerida."): GateReply {
  const headers = { "Cache-Control": "no-store" };
  switch (session.kind) {
    case "none":
      return { status: 401, body: { error: unauthorizedMessage }, headers };
    case "expired":
      return { status: 401, body: { error: unauthorizedMessage, code: "session_expired" }, headers };
    case "rate_limited":
      return {
        status: 429,
        body: { error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos.", code: "rate_limited" },
        headers: { ...headers, "Retry-After": String(session.retryAfter) },
      };
    default:
      return { status: 503, body: { error: "El servicio no está disponible en este momento.", code: "service_unavailable" }, headers };
  }
}
