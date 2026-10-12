// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  chunk,
  formatUnit,
  deliveryPriceView,
  parseCatalogPrices,
  pickupPriceView,
  roundColones,
  totalWithTax,
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
  assert.deepEqual(body, { itemIds: ["A", "B"], withUnits: false });
  assert.deepEqual(Object.keys(body), ["itemIds", "withUnits"]);
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
    // hasDelivery true y pickup null cuando la respuesta no los trae (como antes de existir el retiro en tienda).
    prices: [{ itemId: "A", unitPrice: 14551.73, tax: 1891.72, unit: "CAJA", hasDelivery: true, pickup: null }],
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

test("roundColones: mitad hacia arriba (AwayFromZero) y sin que el ruido de coma flotante cambie el lado", () => {
  assert.equal(roundColones(711.38), 711);
  assert.equal(roundColones(711.5), 712);
  assert.equal(roundColones(711.4999), 711);
  assert.equal(roundColones(0.5), 1);
  assert.equal(roundColones(-0.5), -1);
  assert.equal(roundColones(0.1 + 0.2 + 0.2), 1); // 0,5000000000000001 y 0,5 se redondean igual
  assert.equal(roundColones(1.005 * 100), 101); // 100,49999999999999 en coma flotante: es 100,5
});

test("totalWithTax: precio sin IVA + IVA por unidad, en colones enteros (ejemplos reales y el de MercasaVIP)", () => {
  assert.equal(totalWithTax(629.54, 81.84), 711); // 711,38 (ejemplo del usuario)
  assert.equal(totalWithTax(349.56, 45.4428), 395); // fmcm MTCHCL01: 395,0028
  assert.equal(totalWithTax(545.61, 70.9293), 617); // cmer MTAFLA01: 616,5393
  assert.equal(totalWithTax(1098.76815181518, 10.987682), 1110); // cmer MMTIDHI05: 1109,7558
  assert.equal(totalWithTax(500, 0), 500);
});

test("vistas de precio: domicilio y retiro traen el TOTAL con IVA; en retiro, 'desde' y cada tienda con su IVA", () => {
  assert.deepEqual(deliveryPriceView({ unitPrice: 629.54, tax: 81.84, unit: "LATA" }), { kind: "price", total: 711, unit: "LATA" });
  assert.deepEqual(
    pickupPriceView({ unitPrice: 349.56, tax: 45.4428, unit: "UND", varies: true, bySite: [{ siteId: "ALA", unitPrice: 349.56, tax: 45.4428 }, { siteId: "CCA", unitPrice: 400, tax: 52 }] }),
    { kind: "price", total: 395, unit: "UND", varies: true, bySite: [{ siteId: "ALA", total: 395 }, { siteId: "CCA", total: 452 }] },
  );
});

test("parseCatalogPrices: una tienda de bySite sin su IVA se descarta (no se inventa un total sin impuesto)", () => {
  const parsed = parseCatalogPrices({
    prices: [{ itemId: "A", unitPrice: 0, tax: 0, unit: "", hasDelivery: false, pickup: { unitPrice: 100, tax: 13, unit: "UND", varies: true, bySite: [{ siteId: "ALA", unitPrice: 100, tax: 13 }, { siteId: "SJO", unitPrice: 120 }] } }],
    missing: [],
    priceListMissing: false,
  });
  assert.deepEqual(parsed.prices[0].pickup.bySite, [{ siteId: "ALA", unitPrice: 100, tax: 13 }]);
  assert.equal(parsed.prices[0].pickup.varies, false); // con una sola tienda ya no hay variación que mostrar
});
