// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { addToCart, cartLineKey, changeLineUnit, parseStoredCart, removeLine, setLineQuantity } from "../cart-logic.ts";

const beer = { id: "MTTHBE07", name: "Cerveza 5.0" };
const oats = { id: "MTMSGR205", name: "Avena" };

test("cartLineKey: ítem|presentación, sin distinguir mayúsculas", () => {
  assert.equal(cartLineKey("mtthbe07", " caja "), "MTTHBE07|CAJA");
  assert.equal(cartLineKey("MTTHBE07"), "MTTHBE07|");
});

test("addToCart: el mismo ítem con dos presentaciones son dos líneas; la misma se suma", () => {
  let cart = addToCart([], beer, 2);
  cart = addToCart(cart, beer, 1, "CAJA");
  cart = addToCart(cart, beer, 3, "caja");
  cart = addToCart(cart, beer, 1);
  assert.equal(cart.length, 2);
  assert.deepEqual(cart.map((l) => [l.unitId, l.quantity]), [[undefined, 3], ["CAJA", 4]]);
});

test("addToCart: tope de 9999 por línea", () => {
  assert.equal(addToCart(addToCart([], beer, 9990), beer, 50)[0].quantity, 9999);
});

test("setLineQuantity y removeLine actúan solo sobre la línea de esa presentación", () => {
  const cart = addToCart(addToCart([], beer, 2), beer, 5, "CAJA");
  assert.deepEqual(setLineQuantity(cart, "MTTHBE07", 9, "CAJA").map((l) => l.quantity), [2, 9]);
  assert.deepEqual(setLineQuantity(cart, "MTTHBE07", 0, "CAJA").map((l) => l.unitId), [undefined]);
  assert.deepEqual(removeLine(cart, "MTTHBE07").map((l) => l.unitId), ["CAJA"]);
});

test("changeLineUnit: conserva posición; suma si ya existe la presentación destino; vuelve a la por defecto", () => {
  let cart = addToCart(addToCart([], beer, 2), oats, 1);
  cart = changeLineUnit(cart, "MTTHBE07", undefined, "CAJA");
  assert.deepEqual(cart.map((l) => [l.id, l.unitId]), [["MTTHBE07", "CAJA"], ["MTMSGR205", undefined]]);

  const two = addToCart(addToCart([], beer, 2), beer, 3, "CAJA");
  const merged = changeLineUnit(two, "MTTHBE07", "CAJA", undefined);
  assert.deepEqual(merged.map((l) => [l.unitId, l.quantity]), [[undefined, 5]]);

  assert.equal(changeLineUnit(two, "MTTHBE07", "CAJA", "caja"), two); // misma presentación: sin cambios
  assert.equal(Object.hasOwn(changeLineUnit(two, "MTTHBE07", "CAJA", undefined)[0], "unitId"), false);
});

test("parseStoredCart: carritos viejos sin unitId siguen valiendo; descarta basura y une repetidas", () => {
  const cart = parseStoredCart([
    { id: "A", name: "A", quantity: 2 },
    { id: "A", name: "A", quantity: 1, unitId: "" },
    { id: "A", name: "A", quantity: 4, unitId: "CAJA", packSize: "500 ml" },
    { id: 7, name: "x", quantity: 1 },
    { id: "B", name: "B", quantity: 0 },
    null,
  ]);
  assert.deepEqual(cart.map((l) => [l.id, l.unitId, l.quantity]), [["A", undefined, 3], ["A", "CAJA", 4]]);
  assert.deepEqual(parseStoredCart("nope"), []);
});
