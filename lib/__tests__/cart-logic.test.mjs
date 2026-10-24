// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  addToCart,
  cartLineKey,
  changeLineUnit,
  countInChannel,
  itemsInChannel,
  parseStoredCart,
  readStoredCart,
  removeLine,
  resolvePickupSite,
  serializeCart,
  setLineQuantity,
} from "../cart-logic.ts";

const beer = { id: "MTTHBE07", name: "Cerveza 5.0" };
const oats = { id: "MTMSGR205", name: "Avena" };
const sites = (...ids) => ({
  availability: { delivery: { available: false }, pickup: { available: true, sites: ids.map((siteId) => ({ siteId, name: siteId })) } },
});

test("cartLineKey: ítem|presentación|canal, sin distinguir mayúsculas", () => {
  assert.equal(cartLineKey("mtthbe07", " caja "), "MTTHBE07|CAJA|DELIVERY");
  assert.equal(cartLineKey("MTTHBE07"), "MTTHBE07||DELIVERY");
  assert.equal(cartLineKey("MTTHBE07", undefined, "pickup"), "MTTHBE07||PICKUP");
});

test("addToCart: el mismo ítem con dos presentaciones son dos líneas; la misma se suma", () => {
  let cart = addToCart([], beer, 2);
  cart = addToCart(cart, beer, 1, "CAJA");
  cart = addToCart(cart, beer, 3, "caja");
  cart = addToCart(cart, beer, 1);
  assert.equal(cart.length, 2);
  assert.deepEqual(cart.map((l) => [l.unitId, l.quantity]), [[undefined, 3], ["CAJA", 4]]);
});

test("addToCart: el mismo producto en los dos canales son dos líneas separadas; cada una se suma en su canal", () => {
  let cart = addToCart([], beer, 2, undefined, "delivery");
  cart = addToCart(cart, beer, 5, undefined, "pickup");
  cart = addToCart(cart, beer, 1, undefined, "delivery");
  cart = addToCart(cart, beer, 1, undefined, "pickup");
  assert.deepEqual(cart.map((l) => [l.channel, l.quantity]), [["delivery", 3], ["pickup", 6]]);
  assert.equal(countInChannel(cart, "delivery"), 3);
  assert.equal(countInChannel(cart, "pickup"), 6);
  assert.deepEqual(itemsInChannel(cart, "pickup").map((l) => l.quantity), [6]);
});

test("addToCart: sin canal explícito va a domicilio", () => {
  assert.equal(addToCart([], beer, 1)[0].channel, "delivery");
});

test("addToCart: tope de 9999 por línea", () => {
  assert.equal(addToCart(addToCart([], beer, 9990), beer, 50)[0].quantity, 9999);
});

test("setLineQuantity y removeLine actúan solo sobre la línea de esa presentación y canal", () => {
  const cart = addToCart(addToCart(addToCart([], beer, 2), beer, 5, "CAJA"), beer, 4, undefined, "pickup");
  assert.deepEqual(setLineQuantity(cart, "MTTHBE07", 9, "CAJA").map((l) => l.quantity), [2, 9, 4]);
  assert.deepEqual(setLineQuantity(cart, "MTTHBE07", 7, undefined, "pickup").map((l) => l.quantity), [2, 5, 7]);
  assert.deepEqual(setLineQuantity(cart, "MTTHBE07", 0, "CAJA").map((l) => l.unitId), [undefined, undefined]);
  assert.deepEqual(removeLine(cart, "MTTHBE07").map((l) => [l.unitId, l.channel]), [["CAJA", "delivery"], [undefined, "pickup"]]);
  assert.deepEqual(removeLine(cart, "MTTHBE07", undefined, "pickup").map((l) => l.channel), ["delivery", "delivery"]);
});

test("changeLineUnit: conserva posición; suma si ya existe la presentación destino (en el mismo canal)", () => {
  let cart = addToCart(addToCart([], beer, 2), oats, 1);
  cart = changeLineUnit(cart, "MTTHBE07", undefined, "CAJA");
  assert.deepEqual(cart.map((l) => [l.id, l.unitId]), [["MTTHBE07", "CAJA"], ["MTMSGR205", undefined]]);

  const two = addToCart(addToCart([], beer, 2), beer, 3, "CAJA");
  const merged = changeLineUnit(two, "MTTHBE07", "CAJA", undefined);
  assert.deepEqual(merged.map((l) => [l.unitId, l.quantity]), [[undefined, 5]]);

  assert.equal(changeLineUnit(two, "MTTHBE07", "CAJA", "caja"), two); // misma presentación: sin cambios
  assert.equal(Object.hasOwn(changeLineUnit(two, "MTTHBE07", "CAJA", undefined)[0], "unitId"), false);

  // No se mezcla con la línea del otro canal.
  const mixed = addToCart(addToCart([], beer, 2, "CAJA", "delivery"), beer, 3, undefined, "pickup");
  assert.deepEqual(changeLineUnit(mixed, "MTTHBE07", "CAJA", undefined, "delivery").map((l) => [l.channel, l.quantity]), [["delivery", 2], ["pickup", 3]]);
});

// --- migración y almacenamiento ---

test("parseStoredCart: carritos viejos sin canal ni unitId siguen valiendo y pasan a domicilio", () => {
  const cart = parseStoredCart([
    { id: "A", name: "A", quantity: 2 },
    { id: "A", name: "A", quantity: 1, unitId: "" },
    { id: "A", name: "A", quantity: 4, unitId: "CAJA", packSize: "500 ml" },
    { id: 7, name: "x", quantity: 1 },
    { id: "B", name: "B", quantity: 0 },
    null,
  ]);
  assert.deepEqual(cart.map((l) => [l.id, l.unitId, l.quantity, l.channel]), [["A", undefined, 3, "delivery"], ["A", "CAJA", 4, "delivery"]]);
  assert.deepEqual(parseStoredCart("nope"), []);
});

test("parseStoredCart: conserva el canal de retiro y las tiendas conocidas; un canal raro cae a domicilio", () => {
  const cart = parseStoredCart([
    { id: "A", name: "A", quantity: 2, channel: "pickup", pickupSiteIds: ["ALA", " ", 5, "CCA"] },
    { id: "A", name: "A", quantity: 1, channel: "delivery" },
    { id: "B", name: "B", quantity: 1, channel: "otro" },
  ]);
  assert.deepEqual(cart.map((l) => [l.id, l.channel]), [["A", "pickup"], ["A", "delivery"], ["B", "delivery"]]);
  assert.deepEqual(cart[0].pickupSiteIds, ["ALA", "CCA"]);
  assert.equal(Object.hasOwn(cart[0], "availability"), false); // solo se guardan los códigos de tienda
});

test("readStoredCart: v2 manda; sin v2 se migra el arreglo v1 a domicilio; ida y vuelta sin perder nada", () => {
  const v1 = [{ id: "A", name: "A", quantity: 2 }, { id: "B", name: "B", quantity: 1, unitId: "CAJA" }];
  const migrated = readStoredCart(null, v1);
  assert.deepEqual(migrated.items.map((l) => [l.id, l.unitId, l.quantity, l.channel]), [["A", undefined, 2, "delivery"], ["B", "CAJA", 1, "delivery"]]);
  assert.equal(migrated.pickupSiteId, null);

  const saved = serializeCart(addToCart(migrated.items, beer, 3, undefined, "pickup"), "ALA");
  assert.equal(saved.version, 2);
  const roundTrip = readStoredCart(JSON.parse(JSON.stringify(saved)), v1); // con v2 presente, v1 se ignora
  assert.equal(roundTrip.items.length, 3);
  assert.equal(roundTrip.pickupSiteId, "ALA");
  assert.deepEqual(roundTrip.items.map((l) => l.channel), ["delivery", "delivery", "pickup"]);

  assert.deepEqual(readStoredCart(null, null), { items: [], pickupSiteId: null });
  assert.deepEqual(readStoredCart({ version: 2, items: "x", pickupSiteId: 3 }, null), { items: [], pickupSiteId: null });
});

// --- tienda de retiro por defecto ---

test("resolvePickupSite: sin líneas de retiro no hay tienda; la elegida manda", () => {
  assert.equal(resolvePickupSite(addToCart([], beer, 1), null), null);
  assert.equal(resolvePickupSite(addToCart([], { ...beer, ...sites("ALA") }, 1, undefined, "pickup"), "CCA"), "CCA");
});

test("resolvePickupSite: sin elección propone una tienda donde estén todos los productos del retiro", () => {
  let cart = addToCart([], { ...beer, ...sites("ALA", "CCA", "SJO") }, 1, undefined, "pickup");
  cart = addToCart(cart, { ...oats, ...sites("CCA", "SJO") }, 1, undefined, "pickup");
  assert.equal(resolvePickupSite(cart, null), "CCA");

  // Sin tienda en común: la primera conocida (el servidor avisa qué productos no hay allí).
  const apart = addToCart(addToCart([], { ...beer, ...sites("ALA") }, 1, undefined, "pickup"), { ...oats, ...sites("SJO") }, 1, undefined, "pickup");
  assert.equal(resolvePickupSite(apart, null), "ALA");

  // Líneas viejas sin tiendas conocidas: ninguna propuesta.
  assert.equal(resolvePickupSite(addToCart([], beer, 1, undefined, "pickup"), null), null);
});
