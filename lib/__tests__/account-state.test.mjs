// Carrito y cuenta: dueño del carrito, limpieza al cerrar sesión. Node test runner (npm test). Valores inventados.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  ACCOUNT_STATE_CLEARED_EVENT,
  clearAccountState,
  hashAccount,
  reconcileCartOwner,
  sha256Hex,
} from "../account-state.ts";
import { addToCart, loadPersistedCart, loadPersistedOwner, CART_STORAGE_KEY, readStoredOwner, serializeCart } from "../cart-logic.ts";

const beer = { id: "MTTHBE07", name: "Cerveza 5.0" };
const lines = addToCart([], beer, 3);
const A = hashAccount("C000111");
const B = hashAccount("C000222");

const fakeStorage = (entries = {}) => ({
  data: { ...entries },
  getItem(k) { return k in this.data ? this.data[k] : null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
});

test("sha256Hex coincide con node:crypto (vacío, corto y mensaje de más de un bloque)", () => {
  for (const text of ["", "abc", "x".repeat(55), "x".repeat(56), "x".repeat(200), "ñandú-código"]) {
    assert.equal(sha256Hex(text), createHash("sha256").update(text).digest("hex"));
  }
});

test("hashAccount: estable, sin distinguir mayúsculas ni espacios, distinto por cuenta y sin el código en claro", () => {
  assert.equal(hashAccount(" c000111 "), A);
  assert.notEqual(A, B);
  assert.match(A, /^[0-9a-f]{64}$/);
  assert.ok(!A.includes("c000111"));
});

test("misma cuenta: el carrito se conserva", () => {
  const r = reconcileCartOwner(lines, A, A);
  assert.deepEqual(r, { items: lines, owner: A, emptied: false });
});

test("otra cuenta: el carrito se vacía y pasa a ser de la que entra", () => {
  const r = reconcileCartOwner(lines, A, B);
  assert.deepEqual(r, { items: [], owner: B, emptied: true });
});

test("visitante que luego inicia sesión: se conserva y se asigna", () => {
  const r = reconcileCartOwner(lines, null, A);
  assert.deepEqual(r, { items: lines, owner: A, emptied: false });
});

test("sin sesión no cambia nada (funciona como hoy)", () => {
  assert.deepEqual(reconcileCartOwner(lines, A, null), { items: lines, owner: A, emptied: false });
  assert.deepEqual(reconcileCartOwner(lines, null, null), { items: lines, owner: null, emptied: false });
});

test("logout/login de la misma cuenta pasa por el almacenamiento sin perder las líneas", () => {
  const storage = fakeStorage({ [CART_STORAGE_KEY]: JSON.stringify(serializeCart(lines, "ALA", A)) });
  const stored = loadPersistedCart(storage);
  const r = reconcileCartOwner(stored.items, loadPersistedOwner(storage), A);
  assert.deepEqual(r.items, lines);
  assert.equal(r.emptied, false);
});

test("migración: carritos guardados sin dueño o con dueño inválido se tratan como de visitante", () => {
  assert.equal(readStoredOwner({ version: 2, items: [], pickupSiteId: null }), null);
  assert.equal(readStoredOwner({ version: 2, owner: "1-0234-0567" }), null); // una cédula jamás se acepta como dueño
  assert.equal(readStoredOwner([]), null);
  assert.equal(loadPersistedOwner(fakeStorage({ [CART_STORAGE_KEY]: "{no json" })), null);
  assert.equal(loadPersistedOwner(fakeStorage()), null);
  assert.ok(!("owner" in serializeCart(lines, null)));
  assert.equal(serializeCart(lines, null, A).owner, A);
});

test("clearAccountState: borra la dirección activa, avisa a la memoria y no toca el carrito", () => {
  const session = fakeStorage({ "mercasa.activeAddressId": "7", otra: "x" });
  const local = fakeStorage({ [CART_STORAGE_KEY]: JSON.stringify(serializeCart(lines, "ALA", A)) });
  const events = [];
  clearAccountState({ sessionStorage: session, localStorage: local, dispatchEvent: (e) => events.push(e.type) });
  assert.equal(session.getItem("mercasa.activeAddressId"), null);
  assert.equal(session.getItem("otra"), "x");
  assert.deepEqual(events, [ACCOUNT_STATE_CLEARED_EVENT]);
  assert.deepEqual(loadPersistedCart(local).items, lines); // las líneas siguen
});

test("clearAccountState (sesión expirada): tolera almacenamiento que falla", () => {
  const broken = { removeItem() { throw new Error("blocked"); } };
  const events = [];
  assert.doesNotThrow(() => clearAccountState({ sessionStorage: broken, dispatchEvent: (e) => events.push(e.type) }));
  assert.equal(events.length, 1);
});
