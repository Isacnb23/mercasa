// Render del selector de tienda de retiro y del resumen por grupo (react-dom/server + next-intl con los textos
// reales; ver helpers/load-tsx.mjs). La interacción (elegir otra tienda) no se simula en render de servidor: su
// lógica (tienda por defecto, grupos) se prueba en cart-logic.test.mjs y order-logic.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { parseOrderPreview } from "../order-logic.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const PickupSiteSelector = loadFromRoot("components/cart/PickupSiteSelector.tsx").default;
const { default: OrderSummary, GrandTotal } = loadFromRoot("components/cart/OrderSummary.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };

const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);

const sites = [
  { siteId: "ALA", unavailableItems: 2, name: "Homex Alajuela", city: "Alajuela, La Trinidad", address: "Costado norte del parque", hours: "Lunes a Sábado 9:00am a 7:00pm", mapUrl: "https://maps.example/ala" },
  { siteId: "CCA", unavailableItems: 0, name: "Homex Tejar", city: "Cartago, El Guarco", address: "", hours: "", mapUrl: "javascript:alert(1)" },
  { siteId: "SJO", unavailableItems: 1, name: "Homex SJO", city: "San José", address: "", hours: "", mapUrl: "" },
];

test("selector de tienda: las 13 (aquí 3) con nombre y ciudad, y cuántos productos faltan en cada una", () => {
  const html = renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites, selectedId: "CCA", proposed: false, onSelect: () => {} })));
  assert.equal([...html.matchAll(/<option /g)].length, 3);
  assert.match(html, /Homex Alajuela · Alajuela, La Trinidad — 2 productos sin existencia/);
  assert.match(html, /Homex Tejar · Cartago, El Guarco</); // sin faltantes: solo nombre y ciudad
  assert.match(html, /Homex SJO · San José — 1 producto sin existencia/); // singular
  assert.match(html, /<option value="CCA" selected/);
  assert.match(html, /aria-label="Elegí la tienda donde vas a retirar"/);
});

test("selector de tienda: estado de la elegida, propuesta, y dirección/horario/mapa solo con datos y mapa seguro", () => {
  const full = renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites, selectedId: "ALA", proposed: true, onSelect: () => {} })));
  assert.match(full, /2 productos no tienen existencia suficiente en esta tienda/);
  assert.match(full, /Propusimos la tienda/);
  assert.match(full, /Costado norte del parque/);
  assert.match(full, /Horario de la tienda/);
  assert.match(full, /href="https:\/\/maps\.example\/ala"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);

  const ok = renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites, selectedId: "CCA", proposed: false, onSelect: () => {} })));
  assert.match(ok, /Esta tienda tiene existencia de todos tus productos/);
  assert.doesNotMatch(ok, /Propusimos/);
  assert.doesNotMatch(ok, /javascript:/); // un enlace de mapa no http(s) no se pinta
  assert.doesNotMatch(ok, /Ver en el mapa/);
});

test("selector de tienda: sin detalles (paso de entrega los muestra aparte) y en inglés", () => {
  const html = renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites, selectedId: "ALA", proposed: false, onSelect: () => {}, showDetails: false }), "en"));
  assert.doesNotMatch(html, /Costado norte/);
  assert.match(html, /Pickup store/);
  assert.match(html, /2 products out of stock/);
  assert.equal(renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites: [], selectedId: "", proposed: false, onSelect: () => {} }))), "");
});

const totals = (subtotal, tax) => ({ subtotal, discount: 0, tax, total: subtotal + tax });
const raw = {
  lines: [], totals: totals(40000, 5200), freight: null, freightPending: true, minimumAmount: 30000, belowMinimum: false, shortfall: 0,
  delivery: { date: "2026-10-12", valid: true, requiresCoordination: false }, canOrder: true, errors: [],
  deliveryGroup: { lines: [], totals: totals(40000, 5200), minimumAmount: 30000, belowMinimum: false, shortfall: 0, canOrder: true, errors: [] },
  pickupGroup: { siteId: "ALA", lines: [], totals: totals(3300, 429), minimumAmount: null, belowMinimum: false, shortfall: 0, canOrder: true, errors: [], sites: [] },
  grandTotals: totals(43300, 5629),
};
const preview = parseOrderPreview(raw);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("resumen por grupo: cada uno con sus números del servidor; el de domicilio con flete y mínimo, el de retiro sin mínimo", () => {
  const delivery = text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "delivery", stale: false }))));
  assert.match(delivery, /Subtotal ₡40\.000,00/);
  assert.match(delivery, /Impuesto ₡5\.200,00/);
  assert.match(delivery, /Flete Se calcula al confirmar/);
  assert.match(delivery, /Pedido mínimo ₡30\.000/);

  const pickup = text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "pickup", stale: false }))));
  assert.match(pickup, /Subtotal ₡3\.300,00/);
  assert.match(pickup, /Impuesto ₡429,00/);
  assert.match(pickup, /Total ₡3\.729,00/);
  assert.doesNotMatch(pickup, /Flete/); // el flete es del domicilio
  assert.doesNotMatch(pickup, /Pedido mínimo/);
  assert.match(pickup, /sin pedido mínimo/);
});

test("resumen: un grupo ausente no se pinta; el total general suma los dos", () => {
  const onlyPickup = parseOrderPreview({ ...raw, deliveryGroup: null, lines: [], totals: totals(0, 0) });
  assert.equal(renderToHtml(withIntl(React.createElement(OrderSummary, { preview: onlyPickup, channel: "delivery", stale: false }))), "");
  assert.match(text(renderToHtml(withIntl(React.createElement(GrandTotal, { preview, stale: false })))), /Total general ₡48\.929,00/);
});
