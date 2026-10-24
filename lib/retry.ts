// Reintento único ante límite de peticiones (429) o servicio no disponible (503), sin React (probado con
// `npm test`). Respeta Retry-After pero con tope de unos segundos: es para que un pico pase, no para bloquear
// la pantalla. 401 (sesión vencida) y cualquier otro código NO se reintentan.
export const RETRY_DEFAULT_DELAY_MS = 1500;
export const RETRY_MAX_DELAY_MS = 5000;

interface ResponseLike {
  status: number;
  headers: { get(name: string): string | null };
}

export const isRetryableStatus = (status: number): boolean => status === 429 || status === 503;

// Retry-After en segundos (o fecha HTTP); sin valor usable, el valor por defecto. Siempre dentro del tope.
export function retryDelayMs(headerValue: string | null | undefined, now: number = Date.now()): number {
  const raw = headerValue?.trim();
  if (!raw) return RETRY_DEFAULT_DELAY_MS;

  let ms: number;
  if (/^\d+$/.test(raw)) {
    ms = Number(raw) * 1000;
  } else {
    const date = Date.parse(raw);
    if (Number.isNaN(date)) return RETRY_DEFAULT_DELAY_MS;
    ms = date - now;
  }

  return Math.min(Math.max(ms, 0), RETRY_MAX_DELAY_MS);
}

// Hace la petición; si responde 429 o 503 espera y la repite UNA vez. Devuelve la última respuesta (el que
// llama decide si es un fallo). `sleep` rechaza si se cancela (AbortSignal) y eso corta todo.
export async function fetchWithOneRetry<R extends ResponseLike>(
  doFetch: () => Promise<R>,
  sleep: (ms: number) => Promise<void>,
): Promise<R> {
  const first = await doFetch();
  if (!isRetryableStatus(first.status)) return first;

  await sleep(retryDelayMs(first.headers.get("Retry-After")));
  return doFetch();
}
