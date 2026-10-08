// Prueba con el test runner de Node (npm test). Importa el .ts directamente: Node 22.6+ quita los
// tipos al cargarlo. Sin dependencias de React ni de Next.
import test from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_UNAVAILABLE_CODE,
  isServiceUnavailable,
  isServiceUnavailableStatus,
} from "../login-errors.ts";

test("503 y 504 cuentan como servicio no disponible", () => {
  assert.equal(isServiceUnavailableStatus(503), true);
  assert.equal(isServiceUnavailableStatus(504), true);
});

test("el 401 de credenciales incorrectas NO es servicio no disponible", () => {
  assert.equal(isServiceUnavailableStatus(401), false);
  assert.equal(isServiceUnavailable(401, { error: "Usuario o contraseña incorrectos." }), false);
});

test("502 (falla genérica o de configuración) y 400 tampoco", () => {
  assert.equal(isServiceUnavailable(502, { error: "x" }), false);
  assert.equal(isServiceUnavailable(400, { error: "x" }), false);
});

test("200 sin cuerpo no es servicio no disponible", () => {
  assert.equal(isServiceUnavailable(200), false);
  assert.equal(isServiceUnavailable(200, null), false);
});

test("el código del cuerpo también lo marca, aunque el estado sea otro", () => {
  assert.equal(isServiceUnavailable(502, { code: SERVICE_UNAVAILABLE_CODE }), true);
});

test("un código distinto o un cuerpo que no es objeto no lo marca", () => {
  assert.equal(isServiceUnavailable(502, { code: "otro" }), false);
  assert.equal(isServiceUnavailable(502, "service_unavailable"), false);
});
