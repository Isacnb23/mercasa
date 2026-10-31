// Reglas de agregar al carrito (botones por presentación y canal, regla del "+", tope de cantidad) y su render.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { canIncrease, channelButtonState, clampToMax, needsUnitsForPlus, plusAction, primaryAddState, shouldWarnMax } from "../add-rules.ts";
import { parseCatalogPrices, samePrice } from "../catalog-prices.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { AddNote, AddButtons } = loadFromRoot("components/modals/product-catalog/AddToCartButtons.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };

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

// --- botón principal: sin tienda a domicilio; con tienda a retiro en esa tienda ---

const retirable = { pickupAvailable: true };
const notRetirable = { pickupAvailable: false };

test("botón principal: sin tienda elegida agrega a domicilio; con tienda, a retiro en esa tienda", () => {
  assert.deepEqual(primaryAddState(both, retirable, null, null), { channel: "delivery", enabled: true });
  assert.deepEqual(primaryAddState(both, retirable, "ALA", "available"), { channel: "pickup", enabled: true });
  assert.deepEqual(primaryAddState(both, retirable, "ALA", "low"), { channel: "pickup", enabled: true });
  assert.deepEqual(primaryAddState(both, retirable, "ALA", null), { channel: "pickup", enabled: true }); // sin dato no bloquea: valida el servidor
});

test("botón principal: tienda sin existencia de la presentación o presentación no retirable lo desactivan con su motivo", () => {
  assert.deepEqual(primaryAddState(both, retirable, "ALA", "out"), { channel: "pickup", enabled: false, reason: "out" });
  assert.deepEqual(primaryAddState(both, notRetirable, "ALA", "available"), { channel: "pickup", enabled: false, reason: "unit" });
  // Sin tienda, que la presentación no se retire no afecta al domicilio.
  assert.deepEqual(primaryAddState(both, notRetirable, null, null), { channel: "delivery", enabled: true });
});

test("botón principal: un solo canal", () => {
  assert.deepEqual(primaryAddState(deliveryOnly, null, null, null), { channel: "delivery", enabled: true });
  // Solo de retiro: agrega a retiro aunque no haya tienda elegida (el carrito propone una).
  assert.deepEqual(primaryAddState(pickupOnly, retirable, null, null), { channel: "pickup", enabled: true });
  assert.deepEqual(primaryAddState(pickupOnly, retirable, "ALA", "out"), { channel: "pickup", enabled: false, reason: "out" });
  // Solo de domicilio: una tienda elegida no cambia nada.
  assert.deepEqual(primaryAddState(deliveryOnly, null, "ALA", "available"), { channel: "delivery", enabled: true });
  assert.equal(primaryAddState(av(false, false), null, null, null), null);
});

// --- render ---

const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const buttons = (props, locale) => renderToHtml(withIntl(React.createElement(AddButtons, { justAdded: null, onAdd: () => {}, onClearSite: () => {}, site: null, ...props }), locale));
const notes = (props, locale) => renderToHtml(withIntl(React.createElement(AddNote, props), locale));
const buttonCount = (html) => [...html.matchAll(/<button/g)].length;
const ALA = { id: "ALA", name: "Homex Alajuela" };

test("render: sin tienda elegida hay UN solo botón, 'Agregar a domicilio', y ninguna opción de quitar tienda", () => {
  const html = buttons({ product: both, state: primaryAddState(both, retirable, null, null) });
  assert.equal(buttonCount(html), 1);
  assert.match(html, /Agregar a domicilio/);
  assert.doesNotMatch(html, /retiro en/i);
  assert.doesNotMatch(html, /Quitar tienda/);
  assert.doesNotMatch(html, /disabled=""/);
});

test("render: con tienda elegida el principal dice 'Agregar a retiro en <tienda>', el de domicilio queda deshabilitado y hay 'Quitar tienda'", () => {
  const html = buttons({ product: both, state: primaryAddState(both, retirable, "ALA", "available"), site: ALA });
  assert.match(html, /Agregar a retiro en Homex Alajuela/);
  assert.match(html, /Quitar tienda/);
  assert.equal([...html.matchAll(/disabled=""/g)].length, 1); // solo el de domicilio
  assert.match(html, /<button[^>]*disabled=""[^>]*>(?:<[^>]+>)*[^<]*Agregar a domicilio/);
  // El principal NO está deshabilitado.
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>(?:<[^>]+>)*[^<]*Agregar a retiro en Homex Alajuela/);
});

test("render: en inglés, y 'Quitar tienda' / 'Remove store' vuelve a domicilio llamando al callback", () => {
  const html = buttons({ product: both, state: primaryAddState(both, retirable, "ALA", "available"), site: ALA }, "en");
  assert.match(html, /Add to pickup at Homex Alajuela/);
  assert.match(html, /Add to delivery/);
  assert.match(html, /Remove store/);
});

test("render: tienda sin existencia de la presentación desactiva el principal y la nota lo explica", () => {
  const state = primaryAddState(both, retirable, "ALA", "out");
  const html = buttons({ product: both, state, site: ALA });
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-describedby="pd-pickup-out-note"|<button[^>]*aria-describedby="pd-pickup-out-note"[^>]*disabled=""/);
  assert.match(notes({ product: both, selected: { pickupAvailable: true, available: 5 }, state }), /Esta tienda no tiene existencia de esta presentación/);
});

test("render: presentación no retirable con tienda elegida desactiva el principal y apunta a la nota", () => {
  const state = primaryAddState(both, notRetirable, "ALA", "available");
  const html = buttons({ product: both, state, site: ALA });
  assert.match(html, /aria-describedby="pd-pickup-unit-note"/);
  const note = notes({ product: both, selected: { pickupAvailable: false, available: 5 }, state });
  assert.match(note, /id="pd-pickup-unit-note"/);
  assert.match(note, /Esta presentación no está disponible para retiro en tienda\./);
});

test('existencia a domicilio: solo "Disponible a domicilio" (sin cantidad) o "Sin existencia a domicilio"', () => {
  const state = primaryAddState(both, retirable, null, null);
  const hay = notes({ product: both, selected: { pickupAvailable: true, available: 5 }, state });
  assert.match(hay, /Disponible a domicilio/);
  assert.doesNotMatch(hay, /Disponibles a domicilio/);
  assert.doesNotMatch(hay.replace(/<[^>]+>/g, " "), /\d/); // nunca la cantidad
  assert.match(notes({ product: both, selected: { pickupAvailable: true, available: 0 }, state }), /Sin existencia a domicilio/);

  const en = notes({ product: both, selected: { pickupAvailable: true, available: 40 }, state }, "en");
  assert.match(en, /Available for delivery/);
  assert.doesNotMatch(en.replace(/<[^>]+>/g, " "), /\d/);
  assert.match(notes({ product: both, selected: { pickupAvailable: true, available: 0 }, state }, "en"), /Out of stock for delivery/);
});

test("render: sin presentación elegida (sin sesión) no hay existencia ni nota", () => {
  assert.equal(notes({ product: both, selected: null, state: primaryAddState(both, null, null, null) }), "");
});

test("render: un solo canal muestra un solo botón con el texto de siempre", () => {
  const delivery = buttons({ product: deliveryOnly, state: primaryAddState(deliveryOnly, null, null, null) });
  assert.match(delivery, /Agregar al carrito/);
  assert.doesNotMatch(delivery, /retiro en tienda/);
  assert.equal(buttonCount(delivery), 1);
  const pickup = buttons({ product: pickupOnly, state: primaryAddState(pickupOnly, null, null, null) });
  assert.match(pickup, /Agregar a retiro en tienda/);
  assert.doesNotMatch(pickup, /Agregar a domicilio/);
  assert.equal(buttonCount(pickup), 1);
});
