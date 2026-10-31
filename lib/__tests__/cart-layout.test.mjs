// Reordenamiento del carrito: mínimo compacto (y sin bloque cuando es 0), flete que pide fecha, total general compacto con desglose,
// selector Domicilio | Retiro y precio unitario con IVA. Datos inventados; todo sale de una respuesta de servidor simulada.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { parseOrderPreview, unitPriceWithTax } from "../order-logic.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { default: OrderSummary, GrandTotal } = loadFromRoot("components/cart/OrderSummary.tsx");
const GroupTabs = loadFromRoot("components/cart/GroupTabs.tsx").default;
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const totals = (subtotal, tax) => ({ subtotal, discount: 0, tax, total: subtotal + tax });
const raw = ({ deliveryMin = 30000, pickupMin = 0, freight = null, freightPending = true, coordination = false, below = false } = {}) => ({
  lines: [], totals: totals(40000, 5200), freight, freightPending, minimumAmount: deliveryMin, belowMinimum: below, shortfall: below ? 5000 : 0,
  delivery: { date: null, valid: true, requiresCoordination: coordination }, canOrder: true, errors: [],
  deliveryGroup: { lines: [], totals: totals(40000, 5200), minimumAmount: deliveryMin, belowMinimum: below, shortfall: below ? 5000 : 0, canOrder: true, errors: [] },
  pickupGroup: { siteId: "ALA", lines: [], totals: totals(3300, 429), minimumAmount: pickupMin, belowMinimum: false, shortfall: 0, canOrder: true, errors: [], sites: [] },
  grandTotals: totals(43300, 5629),
});
const summary = (props, locale = "es") => text(renderToHtml(withIntl(React.createElement(OrderSummary, { stale: false, ...props }), locale)));

// ---- mínimo ----

test("mínimo del domicilio: barra compacta ANTES de los totales; el del retiro con mínimo 0 no muestra ningún bloque", () => {
  const preview = parseOrderPreview(raw());
  const delivery = summary({ preview, channel: "delivery", deliveryDate: "2026-11-02" });
  assert.match(delivery, /Pedido mínimo ₡30\.000/);
  assert.match(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "delivery", stale: false }))), /role="progressbar"/);
  assert.ok(delivery.indexOf("Pedido mínimo") < delivery.indexOf("Subtotal"), "el mínimo va primero");
  assert.ok(delivery.indexOf("Flete") < delivery.indexOf("Total ₡"), "el flete va antes del total");

  const pickupHtml = renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "pickup", stale: false })));
  const pickup = text(pickupHtml);
  assert.doesNotMatch(pickupHtml, /role="progressbar"/);
  assert.doesNotMatch(pickup, /Pedido mínimo/);
  assert.doesNotMatch(pickup, /sin pedido mínimo/); // con 0 no hay nada que decir; la nota es solo para "sin mínimo" (null)
  assert.match(pickup, /Subtotal ₡3\.300,00/);
  assert.match(pickup, /Total ₡3\.729,00/);
});

test("mínimo sin alcanzar: muestra cuánto falta con la barra compacta", () => {
  const preview = parseOrderPreview(raw({ below: true }));
  assert.match(summary({ preview, channel: "delivery", deliveryDate: "2026-11-02" }), /Te faltan ₡5\.000,00 para llegar al pedido mínimo/);
});

// ---- flete ----

test("flete: sin fecha de entrega pide elegirla; con fecha vuelve el texto de siempre; con monto, el monto", () => {
  const pending = parseOrderPreview(raw());
  assert.match(summary({ preview: pending, channel: "delivery", deliveryDate: null }), /Flete Elegí la fecha para calcular el flete/);
  assert.match(summary({ preview: pending, channel: "delivery", deliveryDate: null }, "en"), /Shipping Choose the date to calculate shipping/);
  assert.match(summary({ preview: pending, channel: "delivery", deliveryDate: "2026-11-02" }), /Flete Se calcula al confirmar/);
  // Quien no maneja fecha (resumen de solo lectura) conserva el texto anterior.
  assert.match(summary({ preview: pending, channel: "delivery" }), /Flete Se calcula al confirmar/);

  const quoted = parseOrderPreview(raw({ freight: 2500, freightPending: false }));
  assert.match(summary({ preview: quoted, channel: "delivery", deliveryDate: "2026-11-02" }), /Flete ₡2\.500,00/);
  // Aunque no haya fecha, un flete ya calculado se muestra.
  assert.match(summary({ preview: quoted, channel: "delivery", deliveryDate: null }), /Flete ₡2\.500,00/);
});

test("flete: una zona que se coordina con servicio al cliente nunca tendrá fecha, así que no se le pide", () => {
  const preview = parseOrderPreview(raw({ coordination: true }));
  const html = summary({ preview, channel: "delivery", deliveryDate: null });
  assert.match(html, /Flete Se calcula al confirmar/);
  assert.doesNotMatch(html, /Elegí la fecha/);
});

test("el retiro no tiene fila de flete", () => {
  assert.doesNotMatch(summary({ preview: parseOrderPreview(raw()), channel: "pickup", deliveryDate: null }), /Flete/);
});

// ---- total general (pie fijo) ----

test("total general compacto con los dos grupos: el total de cada uno y el general; sin compact, solo el general", () => {
  const preview = parseOrderPreview(raw());
  const compact = text(renderToHtml(withIntl(React.createElement(GrandTotal, { preview, stale: false, compact: true }))));
  assert.match(compact, /Envío a domicilio ₡45\.200,00/);
  assert.match(compact, /Retiro en tienda ₡3\.729,00/);
  assert.match(compact, /Total general ₡48\.929,00/);

  const plain = text(renderToHtml(withIntl(React.createElement(GrandTotal, { preview, stale: false }))));
  assert.match(plain, /Total general ₡48\.929,00/);
  assert.doesNotMatch(plain, /Envío a domicilio/);

  // Con un solo grupo no hay desglose que repetir.
  const single = parseOrderPreview({ ...raw(), pickupGroup: null });
  const one = text(renderToHtml(withIntl(React.createElement(GrandTotal, { preview: single, stale: false, compact: true }))));
  assert.match(one, /Total general/);
  assert.doesNotMatch(one, /Retiro en tienda|Envío a domicilio/);
});

// ---- selector Domicilio | Retiro ----

test("selector Domicilio (n) | Retiro (n): dos botones con su cantidad, en español e inglés", () => {
  const es = renderToHtml(withIntl(React.createElement(GroupTabs, { deliveryCount: 3, pickupCount: 1 })));
  assert.equal([...es.matchAll(/<button /g)].length, 2);
  assert.match(text(es), /Domicilio \(3\) Retiro \(1\)/);
  assert.match(es, /aria-label="Ir a un grupo del pedido"/);
  assert.match(es, /sticky/);
  assert.match(text(renderToHtml(withIntl(React.createElement(GroupTabs, { deliveryCount: 2, pickupCount: 5 }), "en"))), /Delivery \(2\) Pickup \(5\)/);
});

// ---- precio unitario con IVA ----

test("unitPriceWithTax: (unitario sin IVA x cantidad + IVA de la línea) / cantidad, con los números del servidor", () => {
  assert.equal(unitPriceWithTax({ unitPrice: 1000, tax: 260, quantity: 2 }), 1130);
  assert.equal(unitPriceWithTax({ unitPrice: 20000, tax: 7800, quantity: 3 }), 22600);
  assert.equal(unitPriceWithTax({ unitPrice: 1000, tax: 0, quantity: 1 }), 1000);
  assert.equal(unitPriceWithTax({ unitPrice: 1000, tax: 260, quantity: 0 }), null);
  // Coherente con el total de la línea: unitario con IVA x cantidad = lineTotal (sin descuento).
  const line = { unitPrice: 1000, tax: 260, quantity: 2, lineTotal: 2260 };
  assert.equal(unitPriceWithTax(line) * line.quantity, line.lineTotal);
});

test("los textos nuevos del carrito existen en español e inglés", () => {
  const order = ["freightPickDate", "unitPriceVatIncluded", "tabDelivery", "tabPickup", "groupTabsAria"];
  for (const locale of ["es", "en"]) {
    for (const key of order) assert.equal(typeof messages[locale].Cart.order[key], "string", `${locale}.Cart.order.${key}`);
    assert.equal(typeof messages[locale].Cart.checkout.whatsappPickupLine, "string");
  }
  assert.match(messages.es.Cart.order.unitPriceVatIncluded, /IVA incluido/);
  assert.match(messages.en.Cart.order.unitPriceVatIncluded, /VAT included/);
});
