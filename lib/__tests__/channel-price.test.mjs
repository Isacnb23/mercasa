// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { collectVisiblePriceIds, needsPrice, pickupPriceText, sitePrice } from "../channel-price.ts";
import { parseCatalogPrices, pickupPriceView } from "../catalog-prices.ts";

const both = { delivery: { available: true }, pickup: { available: true, sites: [{ siteId: "ALA", name: "ALA" }] } };
const deliveryOnly = { delivery: { available: true }, pickup: { available: false, sites: [] } };
const pickupOnly = { delivery: { available: false }, pickup: { available: true, sites: [{ siteId: "ALA", name: "ALA" }] } };

const labels = {
  vatIncluded: (p) => `${p} IVA incluido`,
  fromVatIncluded: (p) => `Desde ${p} IVA incluido`,
  inStore: (p) => `En tienda ${p}`,
  inStoreFrom: (p) => `En tienda desde ${p}`,
};
const fmt = (n) => `₡${n}`;
// total = precio CON IVA por unidad en colones enteros (349,56 + 45,4428 = 395).
const price = (over = {}) => ({ kind: "price", total: 395, unit: "UND", varies: false, bySite: [], ...over });

test("visiblePriceIds: los solo-retiro YA piden precio (siguen sin '+', eso es canAddToCart)", () => {
  const pages = [
    { kind: "cover" },
    { kind: "category", products: [{ id: "A", availability: deliveryOnly }, { id: "B", availability: pickupOnly }, { id: "C", availability: both }] },
  ];
  assert.deepEqual(collectVisiblePriceIds(pages, 1), ["A", "B", "C"]);
});

test("visiblePriceIds: sin availability (respaldo) cuenta como domicilio; un producto sin canal no pide", () => {
  const pages = [{ kind: "category", products: [{ id: "A" }, { id: "X", availability: { delivery: { available: false }, pickup: { available: false, sites: [] } } }] }];
  assert.deepEqual(collectVisiblePriceIds(pages, 0), ["A"]);
  assert.equal(needsPrice({ availability: undefined }), true);
});

test("visiblePriceIds: solo el spread actual y las vecinas, y solo páginas de categoría", () => {
  const cat = (id) => ({ kind: "category", products: [{ id, availability: both }] });
  const pages = [cat("P0"), cat("P1"), cat("P2"), cat("P3"), cat("P4"), cat("P5"), { kind: "back" }];
  assert.deepEqual(collectVisiblePriceIds(pages, 3), ["P2", "P3", "P4", "P5"]);
  assert.deepEqual(collectVisiblePriceIds(pages, 0), ["P0", "P1", "P2"]);
});

test("texto de precio de retiro: ítem solo de retiro (una línea con su precio)", () => {
  assert.equal(pickupPriceText(price(), "primary", labels, fmt), "₡395 IVA incluido");
  assert.equal(pickupPriceText(price({ varies: true }), "primary", labels, fmt), "Desde ₡395 IVA incluido");
});

test("texto de precio de retiro: ítem en los dos canales (línea breve 'En tienda')", () => {
  assert.equal(pickupPriceText(price(), "secondary", labels, fmt), "En tienda ₡395");
  assert.equal(pickupPriceText(price({ varies: true }), "secondary", labels, fmt), "En tienda desde ₡395");
});

test("texto de precio de retiro: sin precio que mostrar (sin sesión, cargando, consultar) no inventa nada", () => {
  for (const kind of ["hidden", "loading", "consult"]) {
    assert.equal(pickupPriceText({ kind }, "primary", labels, fmt), null);
    assert.equal(pickupPriceText({ kind }, "secondary", labels, fmt), null);
  }
});

test("precio por tienda: único = el mismo para todas; variable = el de cada tienda", () => {
  assert.equal(sitePrice(price(), "SJO"), 395);
  const varies = price({ varies: true, total: 100, bySite: [{ siteId: "ALA", total: 100 }, { siteId: "SJO", total: 120 }] });
  assert.equal(sitePrice(varies, "sjo"), 120);
  assert.equal(sitePrice(varies, "CCA"), null);
  assert.equal(sitePrice({ kind: "hidden" }, "ALA"), null);
});

test("retiro con precio variable: el 'desde' y cada tienda salen con SU IVA (precio + IVA de esa tienda)", () => {
  const view = pickupPriceView({
    unitPrice: 200,
    tax: 26,
    unit: "UND",
    varies: true,
    bySite: [{ siteId: "ALA", unitPrice: 200, tax: 26 }, { siteId: "SJO", unitPrice: 220, tax: 28.6 }],
  });
  assert.equal(pickupPriceText(view, "primary", labels, fmt), "Desde ₡226 IVA incluido");
  assert.equal(pickupPriceText(view, "secondary", labels, fmt), "En tienda desde ₡226");
  assert.equal(sitePrice(view, "ALA"), 226);
  assert.equal(sitePrice(view, "SJO"), 249); // 248,6
});

const body = (prices) => ({ prices, missing: [], priceListMissing: false });

test("parseCatalogPrices: lee hasDelivery y el bloque pickup; sin ellos, como antes (domicilio, sin retiro)", () => {
  const parsed = parseCatalogPrices(
    body([
      { itemId: "A", unitPrice: 100, tax: 13, unit: "UND", hasDelivery: true, pickup: { unitPrice: 200, tax: 26, unit: "UND", varies: true, bySite: [{ siteId: "ALA", unitPrice: 200, tax: 26 }, { siteId: "SJO", unitPrice: 220, tax: 28.6 }] } },
      { itemId: "B", unitPrice: 0, tax: 0, unit: "", hasDelivery: false, pickup: { unitPrice: 349.56, tax: 45.44, unit: "UND", varies: false, bySite: [] } },
      { itemId: "C", unitPrice: 50, tax: 6.5, unit: "UND" },
    ]),
  );
  const [a, b, c] = parsed.prices;
  assert.deepEqual([a.hasDelivery, a.pickup.varies, a.pickup.bySite.length], [true, true, 2]);
  assert.deepEqual([b.hasDelivery, b.pickup.unitPrice, b.pickup.varies], [false, 349.56, false]);
  assert.deepEqual([c.hasDelivery, c.pickup], [true, null]);
});

test("parseCatalogPrices: un pickup mal formado o sin precio válido se ignora (nunca se inventa)", () => {
  const parsed = parseCatalogPrices(
    body([
      { itemId: "A", unitPrice: 100, tax: 13, unit: "UND", pickup: { unitPrice: 0, tax: 0, unit: "UND" } },
      { itemId: "B", unitPrice: 100, tax: 13, unit: "UND", pickup: { unitPrice: "x" } },
      { itemId: "C", unitPrice: 100, tax: 13, unit: "UND", pickup: { unitPrice: 10, tax: 1, unit: "UND", varies: true, bySite: [{ siteId: "ALA", unitPrice: 10 }] } },
    ]),
  );
  assert.deepEqual(parsed.prices.map((p) => p.pickup?.unitPrice ?? null), [null, null, 10]);
  assert.equal(parsed.prices[2].pickup.varies, false); // "varies" sin al menos dos tiendas no se cree
});
