// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithOneRetry, isRetryableStatus, retryDelayMs, RETRY_DEFAULT_DELAY_MS, RETRY_MAX_DELAY_MS } from "../retry.ts";
import { pagesLoadingImages, shouldLoadPageImages } from "../image-window.ts";

const res = (status, retryAfter) => ({ status, headers: { get: (n) => (n.toLowerCase() === "retry-after" ? retryAfter ?? null : null) } });
const sequence = (...responses) => {
  const calls = { n: 0, sleeps: [] };
  const doFetch = async () => responses[Math.min(calls.n++, responses.length - 1)];
  const sleep = async (ms) => { calls.sleeps.push(ms); };
  return { calls, doFetch, sleep };
};

test("reintento: solo 429 y 503 son reintentables", () => {
  assert.deepEqual([200, 400, 401, 404, 429, 502, 503].map(isRetryableStatus), [false, false, false, false, true, false, true]);
});

test("429 y luego 200: reintenta UNA vez y devuelve el éxito (sin aviso de fallo)", async () => {
  const { calls, doFetch, sleep } = sequence(res(429, "2"), res(200));
  const out = await fetchWithOneRetry(doFetch, sleep);
  assert.equal(out.status, 200);
  assert.equal(calls.n, 2);
  assert.deepEqual(calls.sleeps, [2000]); // respeta Retry-After
});

test("429 dos veces: devuelve el segundo 429 (el que llama muestra el aviso) y NO reintenta más", async () => {
  const { calls, doFetch, sleep } = sequence(res(429), res(429));
  const out = await fetchWithOneRetry(doFetch, sleep);
  assert.equal(out.status, 429);
  assert.equal(calls.n, 2);
});

test("503 también se reintenta una vez", async () => {
  const { calls, doFetch, sleep } = sequence(res(503), res(200));
  assert.equal((await fetchWithOneRetry(doFetch, sleep)).status, 200);
  assert.equal(calls.n, 2);
});

test("401 (sesión vencida) NO se reintenta", async () => {
  const { calls, doFetch, sleep } = sequence(res(401), res(200));
  const out = await fetchWithOneRetry(doFetch, sleep);
  assert.equal(out.status, 401);
  assert.equal(calls.n, 1);
  assert.deepEqual(calls.sleeps, []);
});

test("200 y otros códigos no esperan ni repiten", async () => {
  for (const status of [200, 400, 404, 502]) {
    const { calls, doFetch, sleep } = sequence(res(status), res(200));
    assert.equal((await fetchWithOneRetry(doFetch, sleep)).status, status);
    assert.equal(calls.n, 1);
  }
});

test("si la espera se cancela (AbortError) el reintento no ocurre", async () => {
  let n = 0;
  const doFetch = async () => { n++; return res(429); };
  const sleep = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(fetchWithOneRetry(doFetch, sleep), { name: "AbortError" });
  assert.equal(n, 1);
});

test("retryDelayMs: segundos, fecha HTTP, sin valor, inválido y tope", () => {
  assert.equal(retryDelayMs("3"), 3000);
  assert.equal(retryDelayMs(null), RETRY_DEFAULT_DELAY_MS);
  assert.equal(retryDelayMs(""), RETRY_DEFAULT_DELAY_MS);
  assert.equal(retryDelayMs("basura"), RETRY_DEFAULT_DELAY_MS);
  assert.equal(retryDelayMs("60"), RETRY_MAX_DELAY_MS); // el 60 s de mercasa-api se recorta al tope
  const now = Date.parse("2026-10-10T12:00:00Z");
  assert.equal(retryDelayMs("Sat, 10 Oct 2026 12:00:02 GMT", now), 2000);
  assert.equal(retryDelayMs("Sat, 10 Oct 2026 11:00:00 GMT", now), 0);
});

test("fotos: solo piden las páginas del spread visible y las vecinas", () => {
  const loading = Array.from({ length: 20 }, (_, i) => i).filter((i) => shouldLoadPageImages(i, 10));
  assert.deepEqual(loading, [8, 9, 10, 11, 12, 13]);
  assert.equal(shouldLoadPageImages(0, 0), true);
  assert.equal(shouldLoadPageImages(30, 0), false);
});

test("fotos: con un libro de 126 páginas (Alimentos) solo ~6 páginas piden foto a la vez", () => {
  assert.equal(pagesLoadingImages(126, 0), 4); // portada: páginas 0-3
  assert.equal(pagesLoadingImages(126, 60), 6);
  assert.equal(pagesLoadingImages(126, 125), 3);
});
