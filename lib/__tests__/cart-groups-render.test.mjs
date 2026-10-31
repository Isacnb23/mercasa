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

const base = [
  { siteId: "ALA", unavailableItems: 2, name: "Homex Alajuela", city: "Alajuela, La Trinidad", address: "Costado norte del parque", hours: "Lunes a Sábado 9:00am a 7:00pm", mapUrl: "https://maps.example/ala" },
  { siteId: "CCA", unavailableItems: 0, name: "Homex Tejar", city: "Cartago, El Guarco", address: "", hours: "", mapUrl: "javascript:alert(1)" },
  { siteId: "SJO", unavailableItems: 1, name: "Homex SJO", city: "San José", address: "", hours: "", mapUrl: "" },
];
// Lo que manda el servidor: coordenadas y estado por tienda (considera TODAS las líneas de retiro del carrito).
const sites = base.map((s) => ({ ...s, lat: null, lng: null, status: s.unavailableItems > 0 ? "out" : "available" }));
const selector = (props, locale = "es") => renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites, onSelect: () => {}, ...props }), locale));

test("tienda del carrito ya elegida: tarjeta resumen con nombre, ciudad, dirección y horario, y 'Cambiar tienda' (sin selector)", () => {
  const html = selector({ selectedId: "ALA", proposed: false });

  assert.match(html, /data-slot="pickup-store-summary"/);
  assert.match(html, /Homex Alajuela/);
  assert.match(html, /Alajuela, La Trinidad/);
  assert.match(html, /Costado norte del parque/);
  assert.match(html, /Horario de la tienda/);
  assert.match(html, /Lunes a Sábado 9:00am a 7:00pm/);
  assert.match(html, /href="https:\/\/maps\.example\/ala"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(html, />Cambiar tienda</);
  // Ni el selector ni las demás tiendas.
  assert.doesNotMatch(html, /role="radiogroup"|role="radio"/);
  assert.doesNotMatch(html, /Homex Tejar|Homex SJO/);
  assert.doesNotMatch(html, /Propusimos/);
});

test("tarjeta de tienda: dice cuántos productos no alcanzan y, si alcanzan todos, que la tienda sirve; un mapa no seguro no se pinta", () => {
  assert.match(selector({ selectedId: "ALA", proposed: false }), /2 productos no tienen existencia suficiente en esta tienda/);
  assert.match(selector({ selectedId: "SJO", proposed: false }), /1 producto no tiene existencia suficiente en esta tienda/);

  const ok = selector({ selectedId: "CCA", proposed: false });
  assert.match(ok, /Esta tienda tiene existencia de todos tus productos/);
  assert.doesNotMatch(ok, /javascript:/);
  assert.doesNotMatch(ok, /Ver en el mapa/);
});

test("sin tienda elegida (propuesta) aparece el selector con las tiendas y su estado, sin 'Cambiar tienda'", () => {
  const html = selector({ selectedId: "ALA", proposed: true });

  assert.match(html, /role="radiogroup"/);
  assert.equal([...html.matchAll(/role="radio"/g)].length, 3);
  assert.match(html, /Propusimos la tienda/);
  assert.doesNotMatch(html, />Cambiar tienda</);
  assert.doesNotMatch(html, /data-slot="pickup-store-summary"/);
  assert.match(html, /Sin existencia/); // estado por tienda
  assert.match(html, /Disponible/);
});

test("en el carrito una tienda a la que le faltan productos se puede elegir (las líneas quedan marcadas), a diferencia del modal", () => {
  const html = selector({ selectedId: "CCA", proposed: true });
  assert.equal([...html.matchAll(/role="radio"[^>]*disabled=""|disabled=""[^>]*role="radio"/g)].length, 0);
});

test("tarjeta de tienda: sin detalles, en inglés, y sin tiendas no pinta nada", () => {
  const html = selector({ selectedId: "ALA", proposed: false, showDetails: false }, "en");
  assert.doesNotMatch(html, /Costado norte/);
  assert.match(html, /Pickup store/);
  assert.match(html, />Change store</);
  assert.match(html, /2 products do not have enough stock in this store/);
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
