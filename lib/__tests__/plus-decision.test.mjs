// El "+" de la tarjeta de producto. Solo domicilio: igual que siempre. Domicilio Y retiro: abre el modal sin canal preelegido (el cliente elige).
// SOLO retiro: si el carrito ya tiene tienda y el producto tiene existencia allí en su presentación por defecto, agrega directo al retiro de esa
// tienda; si no, abre el modal en el paso de retiro (nunca agrega al retiro sin tienda). Datos inventados.
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
const OPEN_NEUTRAL = { action: "open-detail", step: null };

// ---- domicilio Y retiro: como antes, el modal sin canal preelegido ----

test("domicilio y retiro: el '+' abre el modal sin canal preelegido, con o sin tienda en el carrito y con o sin existencia", () => {
  assert.deepEqual(plusDecision(both, null, null), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision(both, [unit()], null), OPEN_NEUTRAL);
  // Aunque el carrito ya tenga tienda y haya existencia allí, no se agrega solo: el cliente elige el canal.
  assert.deepEqual(plusDecision(both, [unit()], "ALA"), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ALA", status: "available" }] })], "ALA"), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision(both, null, "ALA"), OPEN_NEUTRAL);
  // Sin existencia en esa tienda tampoco cambia: nunca abre con el retiro elegido.
  assert.deepEqual(plusDecision(both, [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }] })], "ALA"), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision(product(true, "SCA"), [unit()], "ALA"), OPEN_NEUTRAL);
  assert.equal(plusDecision(both, [unit()], "ALA").step, null);
});

// ---- SOLO retiro con tienda en el carrito y existencia ----

test("solo retiro, con tienda en el carrito y existencia en su presentación por defecto: agrega directo al retiro de esa tienda", () => {
  assert.deepEqual(plusDecision(pickupOnly, [unit()], "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(pickupOnly, [unit({ pickupBySite: [{ siteId: "ALA", status: "available" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(pickupOnly, [unit({ pickupBySite: [{ siteId: "ALA", status: "low" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" }); // pocas, pero hay
  assert.deepEqual(plusDecision(pickupOnly, [unit({ pickupBySite: [{ siteId: "ala", status: "available" }] })], "ALA"), { action: "add-pickup", siteId: "ALA" }); // sin distinguir mayúsculas
});

test("solo cuenta la presentación POR DEFECTO: otra agotada no impide agregar, y la por defecto agotada sí", () => {
  const defaultOk = [unit({ pickupBySite: [{ siteId: "ALA", status: "available" }] }), box({ pickupBySite: [{ siteId: "ALA", status: "out" }] })];
  assert.deepEqual(plusDecision(pickupOnly, defaultOk, "ALA"), { action: "add-pickup", siteId: "ALA" });

  const defaultOut = [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }] }), box({ pickupBySite: [{ siteId: "ALA", status: "available" }] })];
  assert.deepEqual(plusDecision(pickupOnly, defaultOut, "ALA"), OPEN_PICKUP);
});

test("sin presentaciones (sin sesión, o el servidor no presenta un producto solo de retiro) se decide por las tiendas del producto", () => {
  assert.deepEqual(plusDecision(pickupOnly, null, "ALA"), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(pickupOnly, [], "SCA"), { action: "add-pickup", siteId: "SCA" });
});

// ---- SOLO retiro sin tienda o sin existencia: el modal en el paso de retiro ----

test("solo retiro sin tienda en el carrito: abre el modal en el paso de retiro (no agrega sin tienda)", () => {
  assert.deepEqual(plusDecision(pickupOnly, null, null), OPEN_PICKUP);
  assert.deepEqual(plusDecision(pickupOnly, [unit()], null), OPEN_PICKUP);
});

test("solo retiro sin existencia en la tienda del carrito: abre el modal en el paso de retiro", () => {
  assert.deepEqual(plusDecision(pickupOnly, [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }] })], "ALA"), OPEN_PICKUP); // agotado en esa tienda
  assert.deepEqual(plusDecision(product(false, "SCA"), [unit()], "ALA"), OPEN_PICKUP); // el producto no está en esa tienda
  assert.deepEqual(plusDecision(pickupOnly, null, "ZZZ"), OPEN_PICKUP);
  assert.deepEqual(plusDecision(pickupOnly, [unit({ pickupAvailable: false })], "ALA"), OPEN_PICKUP); // la presentación por defecto no se retira
});

// ---- solo domicilio: igual que siempre ----

test("solo domicilio: una presentación agrega directo; varias abren el modal sin paso; la tienda del carrito no cambia nada", () => {
  assert.deepEqual(plusDecision(deliveryOnly, null, null), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit()], null), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit(), box()], null), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision(deliveryOnly, [unit()], "ALA"), { action: "add-delivery" });
  assert.deepEqual(plusDecision(deliveryOnly, [unit(), box()], "ALA"), OPEN_NEUTRAL);
});

test("sin ningún canal abre el detalle sin paso", () => {
  assert.deepEqual(plusDecision(noChannel, null, null), OPEN_NEUTRAL);
  assert.deepEqual(plusDecision({ id: "A", name: "sin availability" }, null, null), { action: "add-delivery" }); // respaldo: solo domicilio
});

// ---- cuándo hay que pedir las presentaciones ----

test("las presentaciones se piden solo con un único canal (como siempre); con los dos canales ya se sabe que abre el modal", () => {
  assert.equal(needsUnitsForPlus(deliveryOnly), true);
  assert.equal(needsUnitsForPlus(pickupOnly), true);
  assert.equal(needsUnitsForPlus(both), false);
});

// ---- con el carrito real ----

test("la tienda del carrito sale del carrito: solo con líneas de retiro", () => {
  const withPickup = addToCart([], { id: "A", name: "A", ...pickupOnly }, 1, undefined, "pickup");
  const withoutPickup = addToCart([], { id: "B", name: "B", ...deliveryOnly }, 1, undefined, "delivery");

  assert.deepEqual(plusDecision(pickupOnly, [unit()], cartPickupSite(withPickup, "ALA")), { action: "add-pickup", siteId: "ALA" });
  assert.deepEqual(plusDecision(pickupOnly, [unit()], cartPickupSite(withoutPickup, "ALA")), OPEN_PICKUP);
  assert.deepEqual(plusDecision(pickupOnly, [unit()], cartPickupSite([], null)), OPEN_PICKUP);
});

// ---- cableado de la tarjeta y del modal ----

test("la tarjeta usa plusDecision con la tienda del carrito, y abre el modal en el paso de retiro solo cuando la decisión lo pide", () => {
  const source = fs.readFileSync("components/modals/product-catalog/ProductCatalogModal.tsx", "utf8");

  assert.match(source, /pickupSite: cartSite/);
  assert.match(source, /needsUnitsForPlus\(product\)/);
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
