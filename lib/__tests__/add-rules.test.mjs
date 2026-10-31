// Reglas de agregar al carrito desde la tarjeta (regla del "+", estado de cada canal, tope de cantidad). La compra del modal vive en purchase.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { canIncrease, channelButtonState, clampToMax, needsUnitsForPlus, plusAction, shouldWarnMax } from "../add-rules.ts";
import { parseCatalogPrices, samePrice } from "../catalog-prices.ts";

const av = (delivery, pickup) => ({ availability: { delivery: { available: delivery }, pickup: { available: pickup, sites: [] } } });
const both = av(true, true);
const deliveryOnly = av(true, false);
const pickupOnly = av(false, true);

// --- regla del "+" ---

test('"+": un solo canal y una sola presentación agrega directo a ese canal', () => {
  assert.equal(plusAction(deliveryOnly, 1), "add-delivery");
  assert.equal(plusAction(pickupOnly, 1), "add-pickup");
  assert.equal(plusAction({ id: "A", name: "sin availability" }, 1), "add-delivery"); // respaldo: solo domicilio
});

test('"+": varias presentaciones o los dos canales abren el modal (no agrega nada sin preguntar)', () => {
  assert.equal(plusAction(deliveryOnly, 3), "open-detail");
  assert.equal(plusAction(pickupOnly, 2), "open-detail");
  assert.equal(plusAction(both, 1), "open-detail");
  assert.equal(plusAction(both, 4), "open-detail");
  assert.equal(plusAction(both, null), "open-detail"); // los dos canales siempre preguntan, aunque no se sepa
  assert.equal(plusAction(av(false, false), 1), "open-detail");
});

test('"+": sin saber cuántas presentaciones hay (sin sesión), un solo canal agrega la por defecto', () => {
  assert.equal(plusAction(deliveryOnly, null), "add-delivery");
  assert.equal(plusAction(pickupOnly, null), "add-pickup");
});

test("solo hace falta consultar las presentaciones con UN canal (con los dos ya se sabe que abre el modal)", () => {
  assert.equal(needsUnitsForPlus(deliveryOnly), true);
  assert.equal(needsUnitsForPlus(pickupOnly), true);
  assert.equal(needsUnitsForPlus(both), false);
  assert.equal(needsUnitsForPlus(av(false, false)), false);
});

// --- botones por presentación y canal ---

test("botón de retiro: habilitado solo si la presentación está disponible para retiro; domicilio no depende de eso", () => {
  const bolsa = { pickupAvailable: true };
  const caja = { pickupAvailable: false };
  assert.deepEqual(channelButtonState(both, "pickup", bolsa), { enabled: true });
  assert.deepEqual(channelButtonState(both, "pickup", caja), { enabled: false, reason: "unit" });
  assert.deepEqual(channelButtonState(both, "delivery", caja), { enabled: true });
  assert.deepEqual(channelButtonState(both, "delivery", bolsa), { enabled: true });
});

test("botones: un canal en que el producto no se consigue queda desactivado; sin presentaciones conocidas cuenta el canal", () => {
  assert.deepEqual(channelButtonState(deliveryOnly, "pickup", { pickupAvailable: true }), { enabled: false, reason: "channel" });
  assert.deepEqual(channelButtonState(pickupOnly, "delivery", null), { enabled: false, reason: "channel" });
  assert.deepEqual(channelButtonState(both, "pickup", null), { enabled: true });
});

// --- tope de cantidad ---

test("cantidad: no pasa del máximo del servidor, avisa al llegar y sin máximo no limita en el navegador", () => {
  assert.equal(clampToMax(5, 2), 2);
  assert.equal(clampToMax(1, 2), 1);
  assert.equal(clampToMax(3, 0), 0);
  assert.equal(clampToMax(50, null), 50);
  assert.equal(canIncrease(1, 2), true);
  assert.equal(canIncrease(2, 2), false);
  assert.equal(canIncrease(3, 2), false);
  assert.equal(canIncrease(99, null), true);
  assert.equal(shouldWarnMax(2, 2), true);
  assert.equal(shouldWarnMax(1, 2), false);
  assert.equal(shouldWarnMax(5, null), false);
});

// --- lectura de las presentaciones y precio único ---

test("parseCatalogPrices lee pickupAvailable por presentación (false si el servidor no lo dice)", () => {
  const parsed = parseCatalogPrices({
    prices: [
      {
        itemId: "A", unitPrice: 2000, tax: 260, unit: "BOLSA",
        pickup: { unitPrice: 2000, tax: 260, unit: "BOLSA", varies: false, bySite: [] },
        units: [
          { unitId: "BOLSA", unitPrice: 2000, tax: 260, factor: 1, available: 5, isDefault: true, pickupAvailable: true },
          { unitId: "CAJA", unitPrice: 19500, tax: 2535, factor: 10, available: 5, isDefault: false },
        ],
      },
    ],
    missing: [],
    priceListMissing: false,
  });
  assert.deepEqual(parsed.prices[0].units.map((u) => [u.unitId, u.pickupAvailable]), [["BOLSA", true], ["CAJA", false]]);
});

test("precio único: el de retiro igual al de domicilio no se repite; distinto o variable sí se muestra", () => {
  const d = { kind: "price", total: 2260, unit: "BOLSA" };
  assert.equal(samePrice(d, { kind: "price", total: 2260, unit: "bolsa", varies: false }), true);
  assert.equal(samePrice(d, { kind: "price", total: 2881, unit: "BOLSA", varies: false }), false); // el caso fmcm: ₡2.881 vs ₡2.600
  assert.equal(samePrice(d, { kind: "price", total: 2260, unit: "CAJA", varies: false }), false);
  assert.equal(samePrice(d, { kind: "price", total: 2260, unit: "BOLSA", varies: true }), false);
  assert.equal(samePrice(d, { kind: "consult" }), false);
  assert.equal(samePrice({ kind: "hidden" }, { kind: "hidden" }), false);
});
