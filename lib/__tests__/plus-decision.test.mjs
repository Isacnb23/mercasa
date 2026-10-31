// El "+" de la tarjeta de producto con la tienda de retiro del carrito: con retiro, si el carrito ya tiene tienda y el producto tiene existencia
// allí en su presentación por defecto, agrega directo al retiro de esa tienda; si no, abre el modal en el paso de retiro (nunca agrega al retiro
// sin tienda). Solo domicilio, igual que siempre. Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { needsUnitsForPlus, plusDecision } from "../add-rules.ts";
import { addToCart, cartPickupSite } from "../cart-logic.ts";

const site = (siteId) => ({ siteId, name: `Homex ${siteId}` });
const product = (delivery, ...pickupSites) => ({
  availability: { delivery: { available: delivery }, pickup: { available: pickupSites.length > 0, sites: pickupSites.map(site) } },
});
const deliveryOnly = product(true);
const both = product(true, "ALA", "SCA");
const pickupOnly = product(false, "ALA", "SCA");
const noChannel = { availability: { delivery: { available: false }, pickup: { available: false, sites: [] } } };

const unit = (extra) => ({ unitId: "UN", isDefault: true, pickupAvailable: true, pickupBySite: null, ...extra });
const box = (extra) => ({ unitId: "CAJA", isDefault: false, pickupAvailable: true, pickupBySite: null, ...extra });

const OPEN_PICKUP = { action: "open-detail", step: "pickup" };

// ---- con tienda en el carrito y existencia ----

test("con tienda en el carrito y existencia en su presentación por defecto: agrega directo al retiro de esa tienda", () => {
  assert.deepEqual(plusDecision(both, [unit()], "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ALA", status: "available" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ALA", status: "low" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" }); // pocas, pero hay
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ala", status: "available" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" }); // sin distinguir mayúsculas
});

test("solo cuenta la presentación POR DEFECTO: otra agotada no impide agregar, y la por defecto agotada sí", () => {
  const defaultOk = [unit({ pickupBySite: [{ siteId: "ALA", status: "available" }] }), box({ pickupBySite: [{ siteId: "ALA", status: "out" }] })];
  assert.deepEqual(plusDecision(both, defaultOk, "ALA"), { action: "add-pickup", siteId: "ALA" });

  const defaultOut = [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }] }), box({ pickupBySite: [{ siteId: "ALA", status: "available" }] })];
  assert.deepEqual(plusDecision(both, defaultOut, "ALA"), OPEN_PICKUP);
});

test("sin presentaciones (sin sesión, o un producto solo de retiro que el servidor no presenta) se decide por las tiendas del producto", () => {
  assert.deepEqual(plusDecision(pickupOnly, null, "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(pickupOnly, [], "SCA"), { action: "add-pickup", siteId: "SCA" });
  assert.deepEqual(plusDecision(both, null, "ALA"), { action: "add-pickup", siteId: "ALA" });
});

// ---- sin tienda, o sin existencia: el modal en el paso de retiro ----

test("sin tienda en el carrito: abre el modal en el paso de retiro (no agrega sin tienda), también un producto solo de retiro", () => {
  assert.deepEqual(plusDecision(both, [unit()], null), OPEN_PICKUP);
  assert.deepEqual(plusDecision(pickupOnly, null, null), OPEN_PICKUP);
  assert.deepEqual(plusDecision(pickupOnly, [unit()], null), OPEN_PICKUP);
});

test("sin existencia en la tienda del carrito: abre el modal en el paso de retiro", () => {
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }] })], "ALA"), OPEN_PICKUP); // agotado en esa tienda
  assert.deepEqual(plusDecision(product(true, "SCA"), [unit()], "ALA"), OPEN_PICKUP); // el producto no está en esa tienda
  assert.deepEqual(plusDecision(pickupOnly, null, "ZZZ"), OPEN_PICKUP);
  assert.deepEqual(plusDecision(both, [unit({ pickupAvailable: false })], "ALA"), OPEN_PICKUP); // la presentación por defecto no se retira
});

// ---- productos solo de domicilio: igual que siempre ----

test("solo domicilio: una presentación agrega directo; varias abren el modal sin paso; la tienda del carrito no cambia nada", () => {
  assert.deepEqual(plusDecision(deliveryOnly, null, null), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit()], null), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit(), box()], null), { action: "open-detail", step: null });
  assert.deepEqual(plusDecision(deliveryOnly, [unit()], "ALA"), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit(), box()], "ALA"), { action: "open-detail", step: null });
});

test("sin ningún canal abre el detalle sin paso", () => {
  assert.deepEqual(plusDecision(noChannel, null, null), { action: "open-detail", step: null });
  assert.deepEqual(plusDecision({ id: "A", name: "sin availability" }, null, null), { action: "add-delivery" }); // respaldo: solo domicilio
});

// ---- cuándo hay que pedir las presentaciones ----

test("las presentaciones se piden con un solo canal, o con retiro y tienda en el carrito (para ver la existencia de la presentación por defecto)", () => {
  assert.equal(needsUnitsForPlus(deliveryOnly), true);
  assert.equal(needsUnitsForPlus(pickupOnly), true);
  assert.equal(needsUnitsForPlus(both), false); // los dos canales sin tienda: ya se sabe que abre el modal
  assert.equal(needsUnitsForPlus(both, "ALA"), true);
  assert.equal(needsUnitsForPlus(deliveryOnly, "ALA"), true); // solo domicilio: como siempre
});

// ---- con el carrito real ----

test("la tienda del carrito sale del carrito: solo con líneas de retiro", () => {
  const withPickup = addToCart([], { id: "A", name: "A", ...both }, 1, undefined, "pickup");
  const onlyDelivery = addToCart([], { id: "A", name: "A", ...both }, 1, undefined, "delivery");

  assert.deepEqual(plusDecision(both, [unit()], cartPickupSite(withPickup, "ALA")), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(both, [unit()], cartPickupSite(onlyDelivery, "ALA")), OPEN_PICKUP);
  assert.deepEqual(plusDecision(both, [unit()], cartPickupSite([], null)), OPEN_PICKUP);
});

// ---- cableado de la tarjeta y del modal ----

test("la tarjeta usa plusDecision con la tienda del carrito, y abre el modal en el paso de retiro cuando no puede agregar", () => {
  const source = fs.readFileSync("components/modals/product-catalog/ProductCatalogModal.tsx", "utf8");

  assert.match(source, /const cartSite = cartPickupSite\(cartItems, pickupSiteId\);/);
  assert.match(source, /needsUnitsForPlus\(product, cartSite\)/);
  assert.match(source, /const decision = plusDecision\(product, units, cartSite\);/);
  assert.match(source, /if \(decision\.action === "open-detail"\) \{\s*onClick\(decision\.step\);/);
  // Agrega al retiro solo con la decisión add-pickup (nunca por un camino sin tienda).
  assert.match(source, /decision\.action === "add-pickup" \? "pickup" : "delivery"/);
  assert.doesNotMatch(source, /plusAction\(product/);
  // El clic normal en la tarjeta no trae paso; el "+" sí puede.
  assert.match(source, /onClick=\{\(\) => onClick\(\)\}/);
  assert.match(source, /onClick=\{\(step\) => onProductClick\(product, step\)\}/);
  // El detalle recibe el paso.
  assert.match(source, /startAtPickup=\{selectedStep === "pickup"\}/);
  assert.match(source, /setSelectedStep\(step === "pickup" \? "pickup" : null\)/);

  const modal = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  assert.match(modal, /startAtPickup = false/);
  assert.match(modal, /channel: startAtPickup \? "pickup" : null/);
});
