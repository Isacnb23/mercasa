// Aviso delivery_not_possible (razones, bloqueo del avance) y fecha de retiro (cuerpo, selector, errores). Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import {
  buildOrderRequest,
  canAdvance,
  deliveryNotPossibleReasons,
  isDeliveryNotPossible,
  isPickupDateInvalid,
  orderRequestKey,
  parseOrderPreview,
  sanitizeOrderRequest,
} from "../order-logic.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const OrderSummary = loadFromRoot("components/cart/OrderSummary.tsx").default;
const PickupDates = loadFromRoot("components/cart/PickupDates.tsx").default;
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const totals = (subtotal, tax) => ({ subtotal, discount: 0, tax, total: subtotal + tax });
const line = (over = {}) => ({ itemId: "A", name: "Prod A", quantity: 2, unitPrice: 1000, discount: 0, tax: 260, lineTotal: 2260, available: true, ...over });
const rawPreview = ({ deliveryErrors = [], pickupErrors = [], withPickup = true } = {}) => ({
  lines: [line()], totals: totals(2000, 260), freight: null, freightPending: true, minimumAmount: 1000, belowMinimum: false, shortfall: 0,
  delivery: { date: "2026-11-02", valid: true, requiresCoordination: false }, canOrder: deliveryErrors.length === 0 && pickupErrors.length === 0, errors: deliveryErrors,
  deliveryGroup: { lines: [line()], totals: totals(2000, 260), minimumAmount: 1000, belowMinimum: false, shortfall: 0, canOrder: deliveryErrors.length === 0, errors: deliveryErrors },
  pickupGroup: withPickup
    ? { siteId: "ALA", lines: [line()], totals: totals(1000, 130), minimumAmount: null, belowMinimum: false, shortfall: 0, canOrder: pickupErrors.length === 0, errors: pickupErrors, sites: [] }
    : null,
  grandTotals: totals(3000, 390),
});
const notPossible = (message) => ({ code: "delivery_not_possible", message });
const REASONS = [notPossible("La dirección está fuera de la zona de cobertura."), notPossible("No hay ruta para esa fecha.")];
const sel = (over = {}) => ({ deliveryDate: "2026-11-02", paymentMethod: "sinpe", ...over });

// ---- delivery_not_possible ----

test("deliveryNotPossibleReasons: solo errores delivery_not_possible SIN itemId, recortados y sin repetir", () => {
  const preview = parseOrderPreview(rawPreview({
    deliveryErrors: [notPossible("  Fuera de cobertura. "), notPossible("Fuera de cobertura."), notPossible(""), { code: "delivery_not_possible", itemId: "A", message: "de línea" }, { code: "price_list_missing", message: "otro" }],
  }));
  assert.deepEqual(deliveryNotPossibleReasons(preview), ["Fuera de cobertura."]);
  assert.equal(isDeliveryNotPossible(preview), true);
  assert.deepEqual(deliveryNotPossibleReasons(parseOrderPreview(rawPreview())), []);
  assert.equal(isDeliveryNotPossible(parseOrderPreview(rawPreview())), false);
});

test("un error delivery_not_possible del grupo de RETIRO no cuenta como del domicilio", () => {
  const preview = parseOrderPreview(rawPreview({ pickupErrors: [notPossible("x")] }));
  assert.equal(isDeliveryNotPossible(preview), false);
});

test("canAdvance: delivery_not_possible bloquea el carrito y el paso de entrega del grupo a domicilio", () => {
  const preview = parseOrderPreview(rawPreview({ deliveryErrors: REASONS }));
  const both = { delivery: true, pickup: true };
  assert.equal(canAdvance("cart", preview, sel(), both), false);
  assert.equal(canAdvance("delivery", preview, sel(), both), false);
  assert.equal(canAdvance("cart", preview, sel(), { delivery: true, pickup: false }), false);

  // Sin el error, el mismo carrito avanza.
  const ok = parseOrderPreview(rawPreview());
  assert.equal(canAdvance("cart", ok, sel(), both), true);
  assert.equal(canAdvance("delivery", ok, sel(), both), true);
});

test("canAdvance: un carrito SOLO de retiro no se bloquea por un error de domicilio que no aplica", () => {
  const preview = parseOrderPreview(rawPreview({ deliveryErrors: REASONS }));
  assert.equal(canAdvance("cart", preview, sel(), { delivery: false, pickup: true }), true);
  assert.equal(canAdvance("delivery", preview, sel({ deliveryDate: null }), { delivery: false, pickup: true }), true);
});

test("resumen a domicilio: aviso con título, cada razón y sin totales; en inglés también; el de retiro no cambia", () => {
  const preview = parseOrderPreview(rawPreview({ deliveryErrors: REASONS }));
  const es = renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "delivery", stale: false })));
  assert.match(es, /role="alert"/);
  const esText = text(es);
  assert.match(esText, /No podemos entregar este pedido/);
  assert.match(esText, /La dirección está fuera de la zona de cobertura\./);
  assert.match(esText, /No hay ruta para esa fecha\./);
  assert.equal([...es.matchAll(/<li>/g)].length, 2);
  assert.doesNotMatch(esText, /Subtotal/);
  assert.doesNotMatch(esText, /Flete/);

  const en = text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "delivery", stale: false }), "en")));
  assert.match(en, /We can(&#x27;|')t deliver this order/);
  assert.match(en, /La dirección está fuera de la zona de cobertura\./); // las razones llegan de AX tal cual

  const pickup = text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "pickup", stale: false }))));
  assert.match(pickup, /Subtotal/);
  assert.doesNotMatch(pickup, /No podemos entregar/);
});

test("resumen a domicilio sin delivery_not_possible: totales y flete como siempre", () => {
  const preview = parseOrderPreview(rawPreview());
  const html = text(renderToHtml(withIntl(React.createElement(OrderSummary, { preview, channel: "delivery", stale: false }))));
  assert.match(html, /Subtotal/);
  assert.match(html, /Flete/);
  assert.doesNotMatch(html, /No podemos entregar/);
});

// ---- fecha de retiro: cuerpo ----

test("buildOrderRequest: pickupDate viaja en el grupo de retiro solo si hay fecha; sin ella el cuerpo es el de antes", () => {
  const cart = [{ id: "P", quantity: 1, channel: "pickup" }, { id: "D", quantity: 1, channel: "delivery" }];
  const base = { addressId: 7, deliveryDate: "2026-11-02", paymentMethod: "sinpe", pickupSiteId: "ALA" };

  const withDate = buildOrderRequest(cart, { ...base, pickupDate: "2026-11-03" });
  assert.deepEqual(withDate.pickup, { siteId: "ALA", pickupDate: "2026-11-03", lines: [{ itemId: "P", quantity: 1 }] });
  assert.equal(withDate.delivery.deliveryDate, "2026-11-02"); // la de domicilio no se toca

  for (const none of [undefined, null, ""]) {
    const without = buildOrderRequest(cart, { ...base, pickupDate: none });
    assert.deepEqual(Object.keys(without.pickup).sort(), ["lines", "siteId"]);
  }
  assert.notEqual(orderRequestKey(withDate), orderRequestKey(buildOrderRequest(cart, base))); // cambiar la fecha vuelve a validar
});

test("sanitizeOrderRequest: conserva una pickupDate válida, la omite si no viene y rechaza formatos raros", () => {
  const body = (pickupDate) => ({ paymentMethod: "sinpe", pickup: { siteId: "ALA", ...(pickupDate === undefined ? {} : { pickupDate }), lines: [{ itemId: "P", quantity: 1 }] } });

  assert.equal(sanitizeOrderRequest(body("2026-11-03")).pickup.pickupDate, "2026-11-03");
  assert.equal("pickupDate" in sanitizeOrderRequest(body(undefined)).pickup, false);
  assert.equal("pickupDate" in sanitizeOrderRequest(body(null)).pickup, false);
  for (const bad of ["03/11/2026", "mañana", "2026-11-03T00:00:00", 20261103, {}]) assert.equal(sanitizeOrderRequest(body(bad)), null);
});

// ---- fecha de retiro: error del servidor ----

test("pickup_date_invalid: lo detecta isPickupDateInvalid y bloquea el paso de entrega con retiro; sin él, no", () => {
  const bad = parseOrderPreview(rawPreview({ pickupErrors: [{ code: "pickup_date_invalid", message: "no disponible" }] }));
  const ok = parseOrderPreview(rawPreview());
  const both = { delivery: true, pickup: true };

  assert.equal(isPickupDateInvalid(bad), true);
  assert.equal(isPickupDateInvalid(ok), false);
  assert.equal(canAdvance("delivery", bad, sel(), both), false);
  assert.equal(canAdvance("delivery", ok, sel(), both), true);
  // Solo retiro: también.
  assert.equal(canAdvance("delivery", bad, sel({ deliveryDate: null }), { delivery: false, pickup: true }), false);
});

// ---- fecha de retiro: selector ----

const resource = (status, data = null) => ({ status, data, retry: () => {} });
const render = (props, locale = "es") =>
  renderToHtml(withIntl(React.createElement(PickupDates, { selectedDate: null, onSelectDate: () => {}, ...props }), locale));

test("selector de fecha de retiro: un chip por fecha ofrecida, la elegida marcada y el texto de ayuda", () => {
  const html = render({ dates: resource("ready", { dates: ["2026-11-02", "2026-11-03", "2026-11-04"] }), selectedDate: "2026-11-03" });
  assert.equal([...html.matchAll(/type="radio"/g)].length, 3);
  assert.match(html, /value="2026-11-03"[^>]*checked|checked[^>]*value="2026-11-03"/);
  assert.match(html, /aria-label="Martes 3 de noviembre"/);
  const t = text(html);
  assert.match(t, /Fecha de retiro/);
  assert.match(t, /Elegí el día en que vas a retirar/);
  assert.doesNotMatch(t, /ya no está disponible/);
});

test("selector de fecha de retiro: cargando, con error (reintentar), vacío y fecha rechazada por el servidor", () => {
  assert.match(render({ dates: resource("loading") }), /Cargando las fechas de retiro/);

  const failed = render({ dates: resource("error") });
  assert.match(text(failed), /No pudimos cargar las fechas de retiro/);
  assert.match(text(failed), /Reintentar/);

  const empty = text(render({ dates: resource("ready", { dates: [] }) }));
  assert.match(empty, /Por ahora no hay fechas de retiro disponibles/);

  const invalid = render({ dates: resource("ready", { dates: ["2026-11-02"] }), invalid: true });
  assert.match(invalid, /role="alert"/);
  assert.match(text(invalid), /La fecha de retiro elegida ya no está disponible/);

  assert.match(text(render({ dates: resource("ready", { dates: ["2026-11-02"] }) }, "en")), /Pickup date/);
});

// ---- textos ----

test("los textos nuevos existen en español e inglés", () => {
  const keys = ["deliveryNotPossibleTitle", "deliveryNotPossibleIntro", "deliveryNotPossibleHelp", "pickupDatesTitle", "pickupDatesHint", "pickupDatesLoading", "pickupDatesError", "pickupDatesEmpty", "pickupDateInvalid"];
  for (const locale of ["es", "en"]) {
    for (const key of keys) assert.equal(typeof messages[locale].Cart.order[key], "string", `${locale}.Cart.order.${key}`);
  }
});
