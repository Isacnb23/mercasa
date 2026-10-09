// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  chunk,
  formatUnit,
  parseCatalogPrices,
  sanitizeCatalogPricesBody,
  uniqueItemIds,
} from "../catalog-prices.ts";

test("uniqueItemIds: recorta, descarta vacíos y repetidos (sin distinguir mayúsculas)", () => {
  assert.deepEqual(uniqueItemIds([" A ", "a", "", null, undefined, "B", "A"]), ["A", "B"]);
});

test("chunk: lotes de máximo el tamaño pedido", () => {
  const ids = Array.from({ length: 250 }, (_, i) => `I${i}`);
  assert.deepEqual(chunk(ids, 100).map((b) => b.length), [100, 100, 50]);
  assert.deepEqual(chunk([], 100), []);
});

test("sanitizeCatalogPricesBody: solo itemIds; cualquier otro campo (lista de precios) se descarta", () => {
  const body = sanitizeCatalogPricesBody({ itemIds: [" A ", "B"], priceGroup: "AD", unitPrice: 1 });
  assert.deepEqual(body, { itemIds: ["A", "B"] });
  assert.deepEqual(Object.keys(body), ["itemIds"]);
});

test("sanitizeCatalogPricesBody: rechaza cuerpos inválidos", () => {
  assert.equal(sanitizeCatalogPricesBody(null), null);
  assert.equal(sanitizeCatalogPricesBody({}), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: [] }), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: ["A", "a"] }), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: [" "] }), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: [1] }), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: ["X".repeat(51)] }), null);
  assert.equal(sanitizeCatalogPricesBody({ itemIds: Array.from({ length: 101 }, (_, i) => `I${i}`) }), null);
  assert.notEqual(sanitizeCatalogPricesBody({ itemIds: Array.from({ length: 100 }, (_, i) => `I${i}`) }), null);
});

test("parseCatalogPrices: respuesta válida", () => {
  const result = parseCatalogPrices({
    prices: [{ itemId: "A", unitPrice: 14551.73, tax: 1891.72, unit: "CAJA" }],
    missing: ["B"],
    priceListMissing: false,
  });
  assert.deepEqual(result, {
    prices: [{ itemId: "A", unitPrice: 14551.73, tax: 1891.72, unit: "CAJA" }],
    missing: ["B"],
    priceListMissing: false,
  });
});

test("parseCatalogPrices: forma inesperada -> null", () => {
  assert.equal(parseCatalogPrices(null), null);
  assert.equal(parseCatalogPrices({ prices: [], missing: [] }), null);
  assert.equal(parseCatalogPrices({ prices: [{ itemId: "A", unitPrice: "1", tax: 0, unit: "U" }], missing: [], priceListMissing: false }), null);
  assert.equal(parseCatalogPrices({ prices: [{ itemId: "A", unitPrice: NaN, tax: 0, unit: "U" }], missing: [], priceListMissing: false }), null);
});

test("parseCatalogPrices: priceListMissing sin precios", () => {
  assert.deepEqual(parseCatalogPrices({ prices: [], missing: [], priceListMissing: true }), {
    prices: [],
    missing: [],
    priceListMissing: true,
  });
});

test("formatUnit: solo normaliza la capitalización", () => {
  assert.equal(formatUnit("CAJA"), "Caja");
  assert.equal(formatUnit(" und "), "Und");
  assert.equal(formatUnit(""), "");
});
