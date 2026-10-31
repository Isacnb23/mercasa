// Regla de entrega por escenarios (web): fechas "Sin costo de envío", estado de coordinación con salida a retiro y flete "Sin costo".
// Datos inventados; todo sale de respuestas de servidor simuladas.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { parseOrderPreview } from "../order-logic.ts";
import { addToCart, moveDeliveryToPickup } from "../cart-logic.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { default: OrderSummary } = loadFromRoot("components/cart/OrderSummary.tsx");
const { default: DateChips } = loadFromRoot("components/cart/DateChips.tsx");
const { parseDeliveryDates } = loadFromRoot("lib/checkout-info.ts");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// ---- contrato de delivery-dates ----

test("parseDeliveryDates: los campos nuevos son opcionales (una respuesta anterior sigue sirviendo)", () => {
  assert.deepEqual(parseDeliveryDates({ dates: ["2026-11-02"], requiresCoordination: false }), {
    dates: ["2026-11-02"], requiresCoordination: false, coordinationReason: null, options: [],
  });
});

test("parseDeliveryDates: lee el motivo de coordinación y el tipo/costo de cada fecha; ignora lo que no entiende", () => {
  const parsed = parseDeliveryDates({
    dates: ["2026-11-02", "2026-11-03"],
    requiresCoordination: false,
    coordinationReason: null,
    dateOptions: [
      { date: "2026-11-02", type: "route", freight: 0 },
      { date: "2026-11-03", type: "special", freight: 2875 },
      { date: "2026-11-04", type: "raro", freight: 1 },
      "basura",
    ],
  });
  assert.deepEqual(parsed.options, [
    { date: "2026-11-02", type: "route", freight: 0 },
    { date: "2026-11-03", type: "special", freight: 2875 },
  ]);

  const coordination = parseDeliveryDates({ dates: [], requiresCoordination: true, coordinationReason: "no_free_day", dateOptions: [] });
  assert.equal(coordination.requiresCoordination, true);
  assert.equal(coordination.coordinationReason, "no_free_day");
  assert.equal(parseDeliveryDates({ dates: "x" }), null);
});

// ---- chips con etiqueta ----

const chips = (captions, locale = "es") =>
  text(renderToHtml(withIntl(React.createElement(DateChips, {
    dates: ["2026-11-02", "2026-11-03"], selectedDate: null, onSelectDate: () => {}, labelledBy: "t", hint: "pista", captions,
  }), locale)));

test("DateChips: 'Sin costo de envío' bajo las fechas de ruta/plan y el costo bajo las especiales", () => {
  const es = chips({ "2026-11-02": messages.es.Cart.checkout.freeShipping, "2026-11-03": "₡2.875" });
  assert.match(es, /Sin costo de envío/);
  assert.match(es, /₡2\.875/);
  assert.match(chips({ "2026-11-02": messages.en.Cart.checkout.freeShipping }, "en"), /Free shipping/);
});

test("DateChips: sin captions no agrega texto", () => {
  assert.doesNotMatch(chips(undefined), /Sin costo/);
});

// ---- flete en el resumen ----

const totals = { subtotal: 1000, discount: 0, tax: 130, total: 1130 };
const rawPreview = ({ freight, freightPending, dateType = null, reason = null, coordination = false }) => ({
  lines: [], totals, freight, freightPending, minimumAmount: 0, belowMinimum: false, shortfall: 0,
  delivery: { date: "2026-11-02", valid: true, requiresCoordination: coordination, coordinationReason: reason, dateType },
  canOrder: true, errors: [],
  deliveryGroup: { lines: [], totals, minimumAmount: 0, belowMinimum: false, shortfall: 0, canOrder: true, errors: [] },
  grandTotals: totals,
});
const summary = (raw, locale = "es") =>
  text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview: parseOrderPreview(raw), channel: "delivery", stale: false, deliveryDate: "2026-11-02" }), locale)));

test("parseOrderPreview: lee coordinationReason y dateType (opcionales)", () => {
  const withFields = parseOrderPreview(rawPreview({ freight: 0, freightPending: false, dateType: "route" }));
  assert.equal(withFields.delivery.dateType, "route");
  assert.equal(withFields.delivery.coordinationReason, null);

  const coordination = parseOrderPreview(rawPreview({ freight: null, freightPending: true, coordination: true, reason: "no_city" }));
  assert.equal(coordination.delivery.coordinationReason, "no_city");

  const old = parseOrderPreview({ ...rawPreview({ freight: null, freightPending: true }), delivery: { date: null, valid: true, requiresCoordination: false } });
  assert.equal(old.delivery.dateType, null);
  assert.equal(old.delivery.coordinationReason, null);
});

test("flete: 'Sin costo' con fecha de ruta/plan o flete 0 de AX; con cobro, el monto", () => {
  assert.match(summary(rawPreview({ freight: 0, freightPending: false, dateType: "route" })), /Flete Sin costo/);
  assert.match(summary(rawPreview({ freight: 0, freightPending: false, dateType: "plan" })), /Flete Sin costo/);
  assert.match(summary(rawPreview({ freight: 0, freightPending: false })), /Flete Sin costo/);
  assert.match(summary(rawPreview({ freight: 0, freightPending: false, dateType: "route" }), "en"), /Shipping Free/);

  const special = summary(rawPreview({ freight: 2875, freightPending: false, dateType: "special" }));
  assert.match(special, /Flete ₡2\.875/);
  assert.doesNotMatch(special, /Sin costo/);

  // Todavía sin calcular: el mensaje de siempre, no "Sin costo".
  assert.match(summary(rawPreview({ freight: null, freightPending: true })), /Flete Se calcula al confirmar/);
});

// ---- pasar a retiro ----

const both = { availability: { delivery: { available: true }, pickup: { available: true, sites: [{ siteId: "ALA", name: "Alajuela" }] } } };
const deliveryOnly = { availability: { delivery: { available: true }, pickup: { available: false } } };

test("moveDeliveryToPickup: pasa a retiro lo que se consigue en tienda y deja en domicilio lo que no", () => {
  let items = [];
  items = addToCart(items, { id: "A", name: "Aceite", ...both }, 2, undefined, "delivery");
  items = addToCart(items, { id: "B", name: "Bolsa", ...deliveryOnly }, 1, undefined, "delivery");

  const moved = moveDeliveryToPickup(items);

  const a = moved.find((i) => i.id === "A");
  assert.equal(a.channel, "pickup");
  assert.equal(a.quantity, 2);
  assert.deepEqual(a.pickupSiteIds, ["ALA"]); // para proponer la tienda
  assert.equal(moved.find((i) => i.id === "B").channel, "delivery");
});

test("moveDeliveryToPickup: se suma a la línea de retiro del mismo producto y presentación; no cambia el original", () => {
  let items = [];
  items = addToCart(items, { id: "A", name: "Aceite", ...both }, 2, "CAJA", "delivery");
  items = addToCart(items, { id: "A", name: "Aceite", ...both }, 3, "CAJA", "pickup");
  const snapshot = JSON.stringify(items);

  const moved = moveDeliveryToPickup(items);

  assert.equal(moved.length, 1);
  assert.equal(moved[0].channel, "pickup");
  assert.equal(moved[0].quantity, 5);
  assert.equal(JSON.stringify(items), snapshot);
});

test("moveDeliveryToPickup: sin nada que mover devuelve el mismo contenido", () => {
  const items = addToCart([], { id: "B", name: "Bolsa", ...deliveryOnly }, 1, undefined, "delivery");
  assert.deepEqual(moveDeliveryToPickup(items), items);
  assert.deepEqual(moveDeliveryToPickup([]), []);
});

// ---- textos ----

test("textos de coordinación y de flete en es y en", () => {
  for (const lang of ["es", "en"]) {
    const checkout = messages[lang].Cart.checkout;
    for (const key of ["coordination", "coordinationBody", "coordinationCta", "coordinationToPickup", "freeShipping"]) {
      assert.equal(typeof checkout[key], "string", `${lang} Cart.checkout.${key}`);
    }
    assert.equal(typeof messages[lang].Cart.order.freightFree, "string", `${lang} Cart.order.freightFree`);
  }
  assert.equal(messages.es.Cart.checkout.coordination, "Un asesor coordina tu entrega");
});
