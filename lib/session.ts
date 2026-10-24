import "server-only";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth-cookies";
import { clientIp } from "@/lib/client-ip";
import {
  clearSessionCookies,
  createRefresher,
  createSessionService,
  gateReply,
  refreshUpstream,
  setSessionCookies,
  type Refresher,
} from "@/lib/session-core";

// Sesión del cliente en el servidor (rutas de /app/api): entrega un JWT vigente y, si venció o está por vencer, lo renueva en
// silencio con el refresh token. La lógica está en lib/session-core.ts (probada sin Next); aquí solo se conecta con las cookies
// de Next y con mercasa-api. Reglas:
//  - los tokens solo viven en cookies httpOnly y en memoria del servidor; nunca se registran ni llegan al JS del navegador;
//  - un solo refresh en curso por sesión (createRefresher);
//  - si el refresh falla de forma definitiva (vencido, inválido, ya usado o revocado por un cambio de clave), se borran las
//    DOS cookies; si falla de forma transitoria (servicio caído, límite), las cookies se conservan.
export { clearSessionCookies, setSessionCookies };

// Una sola instancia por proceso (sobrevive a la recarga de módulos en desarrollo).
const globalState = globalThis as unknown as { __mercasaRefresher?: Refresher };

function refresher(): Refresher {
  globalState.__mercasaRefresher ??= createRefresher({
    call: async (bundle) =>
      refreshUpstream(bundle, {
        apiBase: process.env.MERCASA_API_BASE,
        apiKey: process.env.MERCASA_API_KEY,
        ip: clientIp(await headers()),
      }),
  });
  return globalState.__mercasaRefresher;
}

const service = createSessionService({
  refresher: {
    // El refresher se crea en el primer uso (necesita las variables de entorno y los encabezados de la petición).
    refresh: (bundle) => refresher().refresh(bundle),
  },
  store: async () => {
    const jar = await cookies();
    return {
      access: () => jar.get(SESSION_COOKIE)?.value,
      refreshCookie: () => jar.get(REFRESH_COOKIE)?.value,
      setSession: (session) => setSessionCookies(jar, session),
      clear: () => clearSessionCookies(jar),
    };
  },
});

export const { resolveSession, forceRefresh, withSessionRetry } = service;
export type { ResolvedSession } from "@/lib/session-core";

// Para las rutas: o el JWT a usar, o la respuesta de error ya armada (401, 429 o 503; ver gateReply).
export async function sessionGate(unauthorizedMessage = "Sesión requerida."): Promise<{ token: string } | { response: NextResponse }> {
  const session = await service.resolveSession();
  if (session.kind === "ok") return { token: session.token };

  const reply = gateReply(session, unauthorizedMessage);
  return { response: NextResponse.json(reply.body, { status: reply.status, headers: reply.headers }) };
}
