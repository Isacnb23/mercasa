// Detección, en el navegador, de que la sesión dejó de servir. Sin React ni Next (se prueba con el test runner de Node).
//
// Las rutas del servidor (/api/...) ya renuevan el JWT vencido con el refresh y repiten la petición; si aun así responden 401, la
// sesión no se pudo recuperar (refresh vencido, revocado por un cambio de contraseña o sesión cerrada en otro lado). El navegador
// no ve ningún token: solo el estado HTTP. Este guardián mira cada fetch hacia /api/ y avisa UNA vez por pérdida de sesión.

type FetchFn = typeof fetch;

export interface FetchHost {
  fetch: FetchFn;
}

// Rutas propias de la sesión (login, logout, session, refresh): un 401 ahí NO es "sesión perdida" (login con clave mala,
// por ejemplo) y no debe disparar el aviso.
export function isSessionExpiryCandidate(input: RequestInfo | URL, baseHref: string): boolean {
  let url: URL;
  try {
    url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, baseHref);
  } catch {
    return false;
  }
  // Solo las rutas de este mismo sitio: un 401 de otro origen no tiene que ver con la sesión.
  if (url.origin !== new URL(baseHref).origin) return false;
  return url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth/");
}

export function installSessionExpiryGuard(
  host: FetchHost,
  options: { baseHref: string; isLoggedIn: () => boolean; onExpired: () => void },
): () => void {
  const original = host.fetch;

  const guarded: FetchFn = async (input, init) => {
    const response = await original.call(host, input, init);
    if (response.status === 401 && options.isLoggedIn() && isSessionExpiryCandidate(input, options.baseHref)) {
      options.onExpired();
    }
    return response;
  };

  host.fetch = guarded;

  return () => {
    // Solo se restaura si nadie más envolvió fetch después de nosotros.
    if (host.fetch === guarded) host.fetch = original;
  };
}
