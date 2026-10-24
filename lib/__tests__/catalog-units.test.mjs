// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { parseCatalogPrices, sanitizeCatalogPricesBody } from "../catalog-prices.ts";

const ids = (n) => Array.from({ length: n }, (_, i) => `I${i}`);

test("sanitizeCatalogPricesBody: withUnits solo con hasta 20 ítems y solo booleano", () => {
  assert.deepEqual(sanitizeCatalogPricesBody({ itemIds: ids(20), withUnits: true }), { itemIds: ids(20), withUnits: true });
  assert.equal(sanitizeCatalogPricesBody({ itemIds: ids(21), withUnits: true }), null);
  assert.notEqual(sanitizeCatalogPricesBody({ itemIds: ids(21) }), null); // el listado admite hasta 100
  assert.equal(sanitizeCatalogPricesBody({ itemIds: ids(1), withUnits: "yes" }), null);
});

test("parseCatalogPrices: presentaciones (units) con precio propio y factor decimal", () => {
  const result = parseCatalogPrices({
    prices: [
      {
        itemId: "MTMSGR205",
        unitPrice: 19733.68,
        tax: 197.34,
        unit: "SACO",
        units: [
          { unitId: "SACO", label: "SACO", unitPrice: 19733.68, tax: 197.34, factor: 1, available: 192, isDefault: true },
          { unitId: "TARIMA", label: "TARIMA", unitPrice: 295265.14, tax: 2952.65, factor: 15, available: 12, isDefault: false },
        ],
      },
      { itemId: "B", unitPrice: 1, tax: 0, unit: "UND" },
    ],
    missing: [],
    priceListMissing: false,
  });
  assert.equal(result.prices[0].units.length, 2);
  assert.equal(result.prices[0].units[1].unitPrice, 295265.14); // propio, no 15 x saco
  assert.equal(result.prices[0].units[1].available, 12);
  assert.equal(result.prices[1].units, undefined); // no se pidieron
});

test("parseCatalogPrices: units con forma inválida o factor no positivo -> null", () => {
  const base = { itemId: "A", unitPrice: 1, tax: 0, unit: "U" };
  const unit = { unitId: "CAJA", unitPrice: 1, tax: 0, factor: 24, available: 1, isDefault: false };
  const wrap = (units) => ({ prices: [{ ...base, units }], missing: [], priceListMissing: false });
  assert.equal(parseCatalogPrices(wrap("x")), null);
  assert.equal(parseCatalogPrices(wrap([{ ...unit, factor: 0 }])), null);
  assert.equal(parseCatalogPrices(wrap([{ ...unit, available: "1" }])), null);
});
