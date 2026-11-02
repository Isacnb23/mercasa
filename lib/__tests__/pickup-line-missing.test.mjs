// Línea de retiro sin existencia en la tienda elegida: UN solo aviso "No hay en <tienda>" con "Pasar a domicilio" (solo si esa presentación tiene
// existencia a domicilio), "Ver otras tiendas" y "Quitar"; la tarjeta de la tienda cuenta por línea. Textos reales en es y en.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React, stubModule } from "./helpers/load-tsx.mjs";
import { addToCart, moveLineToDelivery } from "../cart-logic.ts";
import { canMoveToDelivery } from "../purchase.ts";

let units = {};
stubModule("lib/hooks/useCatalogUnits", { useCatalogUnits: () => ({ status: "ready", unitsFor: (id) => units[id] ?? null }) });

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const CartLines = loadFromRoot("components/cart/CartLines.tsx").default;
const PickupSiteSelector = loadFromRoot("components/cart/PickupSiteSelector.tsx").default;
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const sites = [{ siteId: "ALA", name: "Homex Alajuela" }, { siteId: "CCA", name: "Homex Tejar" }];
const both = { delivery: { available: true }, pickup: { available: true, sites } };
const pickupOnly = { delivery: { available: false }, pickup: { available: true, sites } };
const beer = { id: "BEER", name: "Cerveza", availability: both };
const rice = { id: "RICE", name: "Arroz", availability: pickupOnly };
const unit = (extra) => ({ unitId: "UN", isDefault: true, pickupAvailable: true, pickupBySite: null, available: 50, deliveryStatus: "available", ...extra });

const totals = { subtotal: 0, discount: 0, tax: 0, total: 0 };
const line = (itemId) => ({ itemId, name: itemId, unitId: "UN", factor: 1, quantity: 2, unitPrice: 500, discount: 0, tax: 65, lineTotal: 565, available: false, maxAvailable: 0 });
const emptyGroup = { lines: [], totals, minimumAmount: null, belowMinimum: false, shortfall: 0, canOrder: false, errors: [] };
const preview = (ids) => ({
  lines: [], totals, freight: null, freightPending: false, minimumAmount: 0, belowMinimum: false, shortfall: 0,
  delivery: { date: null, valid: false, requiresCoordination: false, coordinationReason: null, dateType: null },
  canOrder: false, errors: [], deliveryGroup: null, grandTotals: totals,
  pickupGroup: {
    ...emptyGroup, siteId: "ALA", sites: [],
    lines: ids.map(line),
    // El servidor repite dos errores por línea sin existencia (no disponible + sin existencia suficiente).
    errors: ids.flatMap((id) => [{ code: "item_unavailable", itemId: id, message: "x" }, { code: "insufficient_stock", itemId: id, message: "x" }]),
  },
});

const render = (items, props = {}, locale = "es") =>
  renderToHtml(withIntl(React.createElement(CartLines, {
    items, channel: "pickup", preview: preview(items.map((i) => i.id)), expectPrices: true,
    onQuantity: () => {}, onRemove: () => {}, onChangeUnit: () => {},
    pickupSiteName: "Homex Alajuela", onMoveToDelivery: () => {}, onSeeOtherStores: () => {}, ...props,
  }), locale));

test("línea sin existencia en la tienda: un solo aviso 'No hay en Homex Alajuela', sin textos repetidos", () => {
  units = { BEER: [unit()] };
  const html = render(addToCart([], beer, 2, undefined, "pickup"));
  const plain = text(html);
  assert.equal([...plain.matchAll(/No hay en Homex Alajuela/g)].length, 1);
  assert.equal([...html.matchAll(/role="alert"/g)].length, 1);
  assert.doesNotMatch(plain, /No hay existencia disponible|No disponible|Máximo disponible/);
  for (const action of ["Pasar a domicilio", "Ver otras tiendas", "Quitar"]) assert.match(html, new RegExp(`>${action}<`));
});

test("'Pasar a domicilio' solo aparece si la presentación tiene existencia a domicilio", () => {
  units = { BEER: [unit({ deliveryStatus: "out", available: 0 })] };
  const sinDomicilio = render(addToCart([], beer, 2, undefined, "pickup"));
  assert.doesNotMatch(sinDomicilio, /Pasar a domicilio/);
  assert.match(sinDomicilio, />Ver otras tiendas</);
  assert.match(sinDomicilio, />Quitar</);

  // Producto solo de retiro: no se entrega a domicilio.
  units = { RICE: [unit()] };
  assert.doesNotMatch(render(addToCart([], rice, 2, undefined, "pickup")), /Pasar a domicilio/);
  // Sin datos de la presentación (sin sesión) no se afirma nada.
  units = {};
  assert.doesNotMatch(render(addToCart([], beer, 2, undefined, "pickup")), /Pasar a domicilio/);
});

test("textos en inglés", () => {
  units = { BEER: [unit()] };
  const plain = text(render(addToCart([], beer, 2, undefined, "pickup"), {}, "en"));
  assert.match(plain, /Not available at Homex Alajuela/);
  assert.match(plain, /Switch to delivery/);
  assert.match(plain, /See other stores/);
  assert.match(plain, /Remove/);
});

test("canMoveToDelivery: producto con domicilio y presentación con existencia a domicilio", () => {
  assert.equal(canMoveToDelivery(beer, unit()), true);
  assert.equal(canMoveToDelivery(beer, unit({ deliveryStatus: "out" })), false);
  assert.equal(canMoveToDelivery(beer, null), false);
  assert.equal(canMoveToDelivery(rice, unit()), false);
});

test("moveLineToDelivery: la línea pasa al grupo de domicilio (o se suma a la que ya existe) y deja las tiendas", () => {
  const items = addToCart(addToCart([], beer, 2, undefined, "pickup"), rice, 1, undefined, "pickup");
  const moved = moveLineToDelivery(items, "BEER");
  const b = moved.find((i) => i.id === "BEER");
  assert.deepEqual([b.channel, b.quantity, "pickupSiteIds" in b], ["delivery", 2, false]);
  assert.equal(moved.find((i) => i.id === "RICE").channel, "pickup");

  const withDelivery = addToCart(items, beer, 3, undefined, "delivery");
  const merged = moveLineToDelivery(withDelivery, "BEER");
  assert.equal(merged.filter((i) => i.id === "BEER").length, 1);
  assert.equal(merged.find((i) => i.id === "BEER").quantity, 5);
});

test("'Ver otras tiendas' abre el selector indicando qué tiendas tienen todas las líneas de retiro", () => {
  const base = (siteId, name, unavailableItems) => ({ siteId, name, unavailableItems, city: "", address: "", hours: "", mapUrl: "", lat: null, lng: null, status: unavailableItems ? "out" : "available" });
  const props = (list) => ({ sites: list, selectedId: "ALA", proposed: false, onSelect: () => {}, changing: true, showFullStores: true });
  const html = renderToHtml(withIntl(React.createElement(PickupSiteSelector, props([base("ALA", "Homex Alajuela", 2), base("CCA", "Homex Tejar", 0)]))));
  assert.match(html, /role="radiogroup"/);
  assert.match(text(html), /Tiendas con todos tus productos de retiro: Homex Tejar\./);
  const none = text(renderToHtml(withIntl(React.createElement(PickupSiteSelector, props([base("ALA", "Homex Alajuela", 2), base("CCA", "Homex Tejar", 1)])), "en")));
  assert.match(none, /No store has all your pickup products/);
});

test("la tarjeta de la tienda cuenta por línea: 'N productos no están disponibles en esta tienda'", () => {
  const site = { siteId: "ALA", name: "Homex Alajuela", unavailableItems: 3, city: "", address: "", hours: "", mapUrl: "", lat: null, lng: null, status: "out" };
  const card = (locale) => text(renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites: [site], selectedId: "ALA", proposed: false, onSelect: () => {} }), locale)));
  assert.match(card("es"), /3 productos no están disponibles en esta tienda/);
  assert.match(card("en"), /3 products are not available at this store/);
});

test("el carrito conecta las acciones: pasar a domicilio y abrir el selector", () => {
  const drawer = fs.readFileSync("components/cart/CartDrawer.tsx", "utf8");
  assert.match(drawer, /onMoveToDelivery=\{channel === "pickup" \? \(item\) => moveLineToDelivery\(item\.id, item\.unitId\)/);
  assert.match(drawer, /onSeeOtherStores=\{channel === "pickup" \? \(\) => setStorePickerOpen\(true\)/);
});
