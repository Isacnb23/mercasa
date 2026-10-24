// Foco del drawer (lógica de atrapar Tab) y carga del carrito desde localStorage (migración v1 → v2, sin datos,
// doble lectura como la que hace StrictMode en next dev).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { trapTarget } from "../focus-trap.ts";
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, loadPersistedCart } from "../cart-logic.ts";

test("Tab en el último vuelve al primero; Shift+Tab en el primero va al último; en medio sigue normal", () => {
  const list = ["a", "b", "c"];
  assert.equal(trapTarget(list, "c", false), "a");
  assert.equal(trapTarget(list, "a", true), "c");
  assert.equal(trapTarget(list, "b", false), null);
  assert.equal(trapTarget(list, "b", true), null);
});

test("foco fuera de la lista (o en el panel): Tab entra al primero, Shift+Tab al último; sin enfocables queda en el panel", () => {
  assert.equal(trapTarget(["a", "b"], null, false, "panel"), "a");
  assert.equal(trapTarget(["a", "b"], "fuera", true, "panel"), "b");
  assert.equal(trapTarget([], null, false, "panel"), "panel");
});

const fakeStorage = (data) => ({ getItem: (k) => (k in data ? data[k] : null) });
const line = { id: "p1", name: "Arroz", quantity: 2 };

test("sin datos guardados: carrito vacío; con almacenamiento roto: null (se sigue en memoria)", () => {
  assert.deepEqual(loadPersistedCart(fakeStorage({})), { items: [], pickupSiteId: null });
  assert.equal(loadPersistedCart({ getItem: () => { throw new Error("blocked"); } }), null);
  assert.equal(loadPersistedCart(fakeStorage({ [CART_STORAGE_KEY]: "{no json" })), null);
});

test("carga v2 y migración v1 → v2 sin borrar la clave vieja; leer dos veces da lo mismo (doble efecto)", () => {
  const data = { [LEGACY_CART_STORAGE_KEY]: JSON.stringify([line]) };
  const first = loadPersistedCart(fakeStorage(data));
  const second = loadPersistedCart(fakeStorage(data));
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].channel, "delivery");
  assert.deepEqual(first, second);
  assert.ok(LEGACY_CART_STORAGE_KEY in data);

  const v2 = { version: 2, items: [{ ...line, channel: "pickup" }], pickupSiteId: "ALA" };
  const loaded = loadPersistedCart(fakeStorage({ [CART_STORAGE_KEY]: JSON.stringify(v2), [LEGACY_CART_STORAGE_KEY]: JSON.stringify([line]) }));
  assert.equal(loaded.pickupSiteId, "ALA");
  assert.equal(loaded.items[0].channel, "pickup");
});

test("el contexto lee una sola vez y guarda solo después de hidratar (guardas presentes en el código)", () => {
  const src = fs.readFileSync(new URL("../cart-context.tsx", import.meta.url), "utf8");
  assert.match(src, /if \(hydrationStarted\.current\) return;/);
  assert.match(src, /if \(!hydrated\) return;/);
  assert.doesNotMatch(src, /hasHydrated/);
});
