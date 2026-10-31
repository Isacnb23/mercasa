// Compra del modal de producto en tres pasos con UNA fuente de verdad (presentación -> canal -> tienda): reglas puras y render de los pasos.
// Datos inventados; la existencia solo se conoce como estado (available | low | out), nunca como cantidad.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { addTarget, channelOptions, deliveryStatusOf, maxQuantity, normalize, selectChannel, selectSite, selectUnit, storeStatusOf } from "../purchase.ts";
import { parseCatalogPrices } from "../catalog-prices.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { default: ChannelStep } = loadFromRoot("components/modals/product-catalog/ChannelStep.tsx");
const { default: AddBar } = loadFromRoot("components/modals/product-catalog/AddBar.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const site = (siteId) => ({ siteId, name: `Homex ${siteId}` });
const product = (delivery, pickupSites) => ({
  availability: { delivery: { available: delivery }, pickup: { available: pickupSites.length > 0, sites: pickupSites.map(site) } },
});
const both = product(true, ["ALA", "SJO", "SCA"]);
const deliveryOnly = product(true, []);
const pickupOnly = product(false, ["ALA", "SJO"]);

// Presentaciones: Lata (la del listado) y Caja de 48.
const unit = (extra) => ({ unitId: "LATA", label: "Lata", unitPrice: 500, tax: 65, factor: 1, baseUnitId: "LATA", available: 400, isDefault: true, pickupAvailable: true, deliveryStatus: "available", pickupBySite: null, ...extra });
const can = unit();
const box = unit({
  unitId: "CAJA", label: "Caja", unitPrice: 22000, tax: 2860, factor: 48, isDefault: false, available: 3, deliveryStatus: "low",
  pickupBySite: [{ siteId: "ALA", status: "low" }, { siteId: "SJO", status: "out" }, { siteId: "SCA", status: "available" }],
});
const units = [can, box];
const start = { unitId: "LATA", channel: null, siteId: null };

// ---- estado de cada canal ----

test("deliveryStatusOf / storeStatusOf: lo que informa el servidor; sin dato, null (o por la cantidad a domicilio)", () => {
  assert.equal(deliveryStatusOf(box), "low");
  assert.equal(deliveryStatusOf(null), null); // sin sesión
  assert.equal(deliveryStatusOf({ available: 0, deliveryStatus: null }), "out"); // servidor anterior: por la cantidad
  assert.equal(deliveryStatusOf({ available: 7, deliveryStatus: null }), "available");
  assert.equal(storeStatusOf(box, "sjo"), "out"); // sin distinguir mayúsculas
  assert.equal(storeStatusOf(can, "ALA"), null);
  assert.equal(storeStatusOf(null, "ALA"), null);
});

test("opciones: los dos canales con su estado para esa presentación; un canal que el producto no tiene no aparece", () => {
  const [delivery, pickup] = channelOptions(both, box);
  assert.deepEqual([delivery.channel, delivery.enabled, delivery.status, delivery.reason], ["delivery", true, "low", null]);
  assert.deepEqual([pickup.channel, pickup.enabled, pickup.stores, pickup.reason], ["pickup", true, 2, null]); // SJO no tiene Caja: 2 de 3 tiendas

  assert.deepEqual(channelOptions(deliveryOnly, can).map((o) => o.channel), ["delivery"]);
  assert.deepEqual(channelOptions(pickupOnly, null).map((o) => o.channel), ["pickup"]);
  assert.deepEqual(channelOptions(product(false, []), can), []);
});

test("opciones: sin sesión (sin presentaciones) los canales salen del producto, sin estado inventado", () => {
  const [delivery, pickup] = channelOptions(both, null);
  assert.deepEqual([delivery.enabled, delivery.status], [true, null]);
  assert.deepEqual([pickup.enabled, pickup.stores], [true, 3]); // todas las tiendas del producto
});

test("opciones: sin existencia a domicilio o sin tiendas con la presentación queda deshabilitada con su motivo", () => {
  const noStock = unit({ deliveryStatus: "out", available: 0 });
  assert.deepEqual(channelOptions(both, noStock).map((o) => [o.channel, o.enabled, o.reason]), [["delivery", false, "delivery_out"], ["pickup", true, null]]);

  const noStores = unit({ pickupBySite: [{ siteId: "ALA", status: "out" }, { siteId: "SJO", status: "out" }, { siteId: "SCA", status: "out" }] });
  assert.deepEqual(channelOptions(both, noStores).map((o) => [o.channel, o.enabled, o.reason, o.stores]), [["delivery", true, null, null], ["pickup", false, "pickup_out", 0]]);

  const notRetirable = unit({ pickupAvailable: false });
  assert.deepEqual(channelOptions(both, notRetirable).map((o) => [o.channel, o.reason]), [["delivery", null], ["pickup", "pickup_unit"]]);
});

// ---- selección ----

test("normalize: sin elegir, el canal es el primero habilitado (domicilio) y no hay tienda", () => {
  assert.deepEqual(normalize(both, units, start), { selection: { unitId: "LATA", channel: "delivery", siteId: null }, notice: null });
});

test("normalize: si el canal elegido deja de estar habilitado pasa al otro con aviso; sin ninguno habilitado, ninguno", () => {
  const noDelivery = [unit({ deliveryStatus: "out", available: 0 })];
  const r = normalize(both, noDelivery, { unitId: "LATA", channel: "delivery", siteId: null });
  assert.deepEqual([r.selection.channel, r.notice], ["pickup", "channel_changed"]);

  const nothing = [unit({ deliveryStatus: "out", available: 0, pickupAvailable: false })];
  assert.equal(normalize(both, nothing, { unitId: "LATA", channel: "delivery", siteId: null }).selection.channel, null);
});

test("cambiar de presentación recalcula todo: la tienda que no la tiene se deselecciona con aviso", () => {
  const picked = { unitId: "LATA", channel: "pickup", siteId: "SJO" };
  assert.equal(normalize(both, units, picked).selection.siteId, "SJO"); // con la Lata, SJO sirve

  const r = selectUnit(both, units, picked, "CAJA"); // la Caja está agotada en SJO
  assert.deepEqual(r.selection, { unitId: "CAJA", channel: "pickup", siteId: null });
  assert.equal(r.notice, "store_cleared");
});

test("cambiar de presentación conserva la tienda si también la tiene (sin aviso)", () => {
  const r = selectUnit(both, units, { unitId: "LATA", channel: "pickup", siteId: "ALA" }, "CAJA");
  assert.deepEqual([r.selection.siteId, r.notice], ["ALA", null]);
});

test("cambiar de presentación a una que no se retira pasa a domicilio con aviso", () => {
  const notRetirable = unit({ unitId: "TARIMA", factor: 960, isDefault: false, pickupAvailable: false });
  const r = selectUnit(both, [can, notRetirable], { unitId: "LATA", channel: "pickup", siteId: "ALA" }, "TARIMA");
  assert.deepEqual([r.selection.channel, r.selection.siteId, r.notice], ["delivery", null, "channel_changed"]); // la tienda se suelta al cambiar de canal
});

test("elegir canal: retiro propone la tienda del carrito solo si tiene la presentación; domicilio suelta la tienda; un canal deshabilitado no se elige", () => {
  assert.deepEqual(selectChannel(both, units, { ...start, unitId: "CAJA" }, "pickup", "ALA"), { unitId: "CAJA", channel: "pickup", siteId: "ALA" });
  assert.deepEqual(selectChannel(both, units, { ...start, unitId: "CAJA" }, "pickup", "SJO"), { unitId: "CAJA", channel: "pickup", siteId: null }); // SJO no tiene Caja
  assert.deepEqual(selectChannel(both, units, { unitId: "LATA", channel: "pickup", siteId: "ALA" }, "delivery"), { unitId: "LATA", channel: "delivery", siteId: null });

  const noDelivery = [unit({ deliveryStatus: "out", available: 0 })];
  assert.equal(selectChannel(both, noDelivery, { unitId: "LATA", channel: "pickup", siteId: null }, "delivery").channel, "pickup");
});

test("elegir tienda: pasa a retiro; una tienda sin existencia o desconocida no se elige", () => {
  assert.deepEqual(selectSite(both, units, { unitId: "CAJA", channel: "delivery", siteId: null }, "SCA"), { unitId: "CAJA", channel: "pickup", siteId: "SCA" });
  assert.equal(selectSite(both, units, { unitId: "CAJA", channel: "pickup", siteId: null }, "SJO").siteId, null);
  assert.equal(selectSite(both, units, { unitId: "CAJA", channel: "pickup", siteId: null }, "XYZ").siteId, null);
});

// ---- cantidad máxima ----

test("cantidad máxima: a domicilio, la existencia convertida de la presentación (sin mostrarla); sin existencia, 0", () => {
  assert.equal(maxQuantity(both, units, { unitId: "CAJA", channel: "delivery", siteId: null }), 3);
  assert.equal(maxQuantity(both, units, { unitId: "LATA", channel: "delivery", siteId: null }), 400);
  assert.equal(maxQuantity(deliveryOnly, [unit({ available: 0, deliveryStatus: "out" })], { unitId: "LATA", channel: "delivery", siteId: null }), 0);
  // Con los dos canales, sin existencia a domicilio la selección pasa a retiro (donde no hay un tope que se pueda saber).
  assert.equal(maxQuantity(both, [unit({ available: 0, deliveryStatus: "out" })], { unitId: "LATA", channel: "delivery", siteId: null }), 9999);
  assert.equal(maxQuantity(both, [unit({ available: 12000 })], { unitId: "LATA", channel: "delivery", siteId: null }), 9999); // tope del pedido
  assert.equal(maxQuantity(both, [unit({ available: 2.9 })], { unitId: "LATA", channel: "delivery", siteId: null }), 2); // entero hacia abajo
});

test("cantidad máxima: en retiro solo se sabe el estado: sin existencia en la tienda 0; si no, sin tope conocido", () => {
  assert.equal(maxQuantity(both, units, { unitId: "CAJA", channel: "pickup", siteId: "ALA" }), 9999); // "low": no se sabe cuántas hay
  assert.equal(maxQuantity(both, units, { unitId: "LATA", channel: "pickup", siteId: "ALA" }), 9999);
  assert.equal(maxQuantity(both, units, { unitId: "CAJA", channel: "pickup", siteId: null }), 9999);
  assert.equal(maxQuantity(both, [unit({ deliveryStatus: "out", available: 0, pickupAvailable: false })], start), 0); // ningún canal
});

// ---- qué se agrega ----

test("qué se agrega: domicilio con la presentación (la por defecto no se guarda); retiro exige tienda", () => {
  assert.deepEqual(addTarget(both, units, { unitId: "LATA", channel: "delivery", siteId: null }), { ok: true, channel: "delivery", unitId: undefined, siteId: null });
  assert.deepEqual(addTarget(both, units, { unitId: "CAJA", channel: "delivery", siteId: null }), { ok: true, channel: "delivery", unitId: "CAJA", siteId: null });
  assert.deepEqual(addTarget(both, units, { unitId: "CAJA", channel: "pickup", siteId: null }), { ok: false, reason: "store" });
  assert.deepEqual(addTarget(both, units, { unitId: "CAJA", channel: "pickup", siteId: "SCA" }), { ok: true, channel: "pickup", unitId: "CAJA", siteId: "SCA" });
  // La tienda elegida se quedó sin la presentación: ya no se puede agregar a ella.
  assert.deepEqual(addTarget(both, units, { unitId: "CAJA", channel: "pickup", siteId: "SJO" }), { ok: false, reason: "store" });
  assert.deepEqual(addTarget(product(false, []), units, start), { ok: false, reason: "channel" });
});

test("sin sesión (sin presentaciones) se agrega la presentación del listado al canal elegido", () => {
  assert.deepEqual(addTarget(both, null, { unitId: null, channel: null, siteId: null }), { ok: true, channel: "delivery", unitId: undefined, siteId: null });
  assert.deepEqual(addTarget(pickupOnly, null, { unitId: null, channel: null, siteId: "ALA" }), { ok: true, channel: "pickup", unitId: undefined, siteId: "ALA" });
});

// ---- lectura del servidor ----

test("precios: deliveryStatus por presentación; lo que no se entiende es null", () => {
  const body = (extra) => ({ priceListMissing: false, missing: [], prices: [{ itemId: "A", unitPrice: 1, tax: 0, unit: "LATA", hasDelivery: true, units: [
    { unitId: "LATA", unitPrice: 1, tax: 0, factor: 1, available: 5, isDefault: true, ...extra[0] },
    { unitId: "CAJA", unitPrice: 48, tax: 0, factor: 48, available: 0, isDefault: false, ...extra[1] },
  ] }] });
  const [a, b] = parseCatalogPrices(body([{ deliveryStatus: "low" }, { deliveryStatus: "agotado" }])).prices[0].units;
  assert.equal(a.deliveryStatus, "low");
  assert.equal(b.deliveryStatus, null);
  assert.equal(parseCatalogPrices(body([{}, {}])).prices[0].units[0].deliveryStatus, null);
});

// ---- render: paso 2 ----

const step = (props, locale = "es") =>
  renderToHtml(withIntl(React.createElement(ChannelStep, { value: null, onChange: () => {}, notice: null, ...props }), locale));

test("paso 2: radios con su label, excluyentes (mismo name), con el estado de cada canal para la presentación", () => {
  const html = step({ options: channelOptions(both, box), value: "delivery" });

  assert.equal([...html.matchAll(/<input type="radio"/g)].length, 2);
  assert.equal(new Set([...html.matchAll(/name="([^"]+)"/g)].map((m) => m[1])).size, 1); // un solo grupo
  assert.equal([...html.matchAll(/<label[^>]*>(?:(?!<\/label>).)*<input type="radio"/gs)].length, 2); // cada radio dentro de su label
  assert.match(html, /<legend[^>]*>¿Cómo lo querés\?/);
  const plain = text(html);
  assert.match(plain, /A domicilio Pocas unidades/); // la Caja tiene "low" a domicilio
  assert.match(plain, /Retiro en tienda En 2 tiendas/);
  assert.match(html, /<input[^>]*checked=""[^>]*value="delivery"/);
  assert.doesNotMatch(plain, /\d+ (cajas|latas|unidades)/i); // nunca cantidades exactas
});

test("paso 2: 'Disponible' a domicilio y 'En 1 tienda' en singular", () => {
  const oneStore = product(true, ["ALA"]);
  const plain = text(step({ options: channelOptions(oneStore, can) }));
  assert.match(plain, /A domicilio Disponible/);
  assert.match(plain, /Retiro en tienda En 1 tienda\b/);
  assert.doesNotMatch(plain, /1 tiendas/);
});

test("paso 2: sin existencia queda deshabilitada y lo explica", () => {
  const noStock = unit({ deliveryStatus: "out", available: 0, pickupBySite: [{ siteId: "ALA", status: "out" }, { siteId: "SJO", status: "out" }, { siteId: "SCA", status: "out" }] });
  const html = step({ options: channelOptions(both, noStock) });

  assert.equal([...html.matchAll(/disabled=""/g)].length, 2);
  const plain = text(html);
  assert.match(plain, /Sin existencia a domicilio en esta presentación/);
  assert.match(plain, /No hay tiendas con esta presentación/);
  assert.doesNotMatch(plain, /Pocas unidades|En 0 tiendas/);
});

test("paso 2: presentación que no se retira lo explica; en inglés los mismos textos", () => {
  const notRetirable = unit({ pickupAvailable: false });
  assert.match(text(step({ options: channelOptions(both, notRetirable) })), /Esta presentación no está disponible para retiro en tienda\./);

  const en = text(step({ options: channelOptions(both, unit({ deliveryStatus: "out", available: 0 })) }, "en"));
  assert.match(en, /How would you like it\?/);
  assert.match(en, /Out of stock for delivery in this size/);
  assert.match(en, /Store pickup At 3 stores/);
});

test("paso 2: un canal que el producto no tiene no aparece, y sin ningún canal no se pinta nada", () => {
  const only = step({ options: channelOptions(deliveryOnly, can) });
  assert.equal([...only.matchAll(/<input type="radio"/g)].length, 1);
  assert.doesNotMatch(only, /Retiro en tienda/);
  assert.equal(step({ options: [] }), "");
});

test("paso 2: el aviso de un cambio queda en un área viva con su texto", () => {
  const cleared = step({ options: channelOptions(both, box), notice: "store_cleared" });
  assert.match(cleared, /role="status" aria-live="polite"[^>]*>Quitamos la tienda elegida porque no tiene esta presentación\./);
  const none = step({ options: channelOptions(both, box), notice: null });
  assert.match(none, /role="status" aria-live="polite" class="sr-only"[^>]*><\/p>/); // el área viva sigue, vacía
  assert.match(step({ options: channelOptions(both, box), notice: "channel_changed" }), /Cambiamos la opción/);
});

// ---- render: paso 3 (barra de cantidad y botón único) ----

const bar = (props, locale = "es") =>
  renderToHtml(withIntl(React.createElement(AddBar, {
    title: "Cerveza", quantity: 1, max: 9999, unitText: "Cajas", onQuantity: () => {}, channel: "delivery", siteName: null, enabled: true, needsStore: false, justAdded: false, onAdd: () => {}, ...props,
  }), locale));

test("barra: UN solo botón de agregar; a domicilio dice 'Agregar a domicilio'", () => {
  const html = bar({});
  assert.equal([...html.matchAll(/Agregar a/g)].length, 1);
  assert.match(html, /Agregar a domicilio/);
  assert.doesNotMatch(html, /Quitar tienda|Remove store|Disponible a domicilio/);
  assert.equal([...html.matchAll(/<button/g)].length, 3); // menos, más y agregar
});

test("barra: en retiro dice 'Agregar a retiro en <tienda>'; sin tienda queda deshabilitado con la indicación", () => {
  assert.match(bar({ channel: "pickup", siteName: "Homex Alajuela" }), /Agregar a retiro en Homex Alajuela/);
  assert.match(bar({ channel: "pickup", siteName: "Homex Alajuela" }, "en"), /Add to pickup at Homex Alajuela/);

  const noStore = bar({ channel: "pickup", siteName: null, enabled: false, needsStore: true });
  assert.match(noStore, /Agregar a retiro en tienda/);
  assert.match(noStore, /Elegí una tienda para agregar a retiro\./);
  assert.match(noStore, /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Agregar a retiro en tienda/s);
});

test("barra: la cantidad no pasa del máximo (el más se deshabilita) y se avisa sin decir el número", () => {
  const atMax = bar({ quantity: 3, max: 3 });
  assert.match(atMax, /<button[^>]*disabled=""[^>]*aria-label="Aumentar cantidad de Cerveza"|<button[^>]*aria-label="Aumentar cantidad de Cerveza"[^>]*disabled=""/);
  assert.match(text(atMax), /Es lo máximo disponible ahora\./);
  assert.doesNotMatch(text(atMax.replace(/aria-label="[^"]*"/g, "")).replace(/\b3\b/, ""), /máximo[^.]*\d/);

  const below = bar({ quantity: 2, max: 3 });
  assert.doesNotMatch(below, /Es lo máximo/);
  assert.doesNotMatch(below, /<button[^>]*aria-label="Aumentar[^"]*"[^>]*disabled=""/);
  assert.match(bar({ quantity: 1, max: 0, enabled: false }), /<button[^>]*disabled=""[^>]*aria-label="Aumentar cantidad/); // sin existencia
});

test("barra: confirmación de agregado y deshabilitado sin existencia", () => {
  assert.match(bar({ justAdded: true }), /¡Agregado!/);
  assert.match(bar({ enabled: false, max: 0 }), /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Agregar a domicilio/s);
});

// ---- lo duplicado del diseño anterior ya no está ----

test("el modal no conserva lo duplicado: chips '+N', tarjeta de detalle aparte, botón de domicilio deshabilitado, 'Quitar tienda' ni 'Disponible a domicilio' del pie", () => {
  const modal = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  const badges = fs.readFileSync("components/modals/product-catalog/ChannelBadges.tsx", "utf8");
  assert.doesNotMatch(modal, /ChannelAvailability|AddNote|AddButtons|AddToCartButtons|clearStore|stockKnownDelivery/);
  assert.doesNotMatch(badges, /ChannelAvailability|pd-site-details|splitSites/);
  assert.equal(fs.existsSync("components/modals/product-catalog/AddToCartButtons.tsx"), false);
  assert.equal(fs.existsSync("lib/__tests__/channel-availability.test.mjs"), false);
  // El modal usa la fuente única.
  assert.match(modal, /from "@\/lib\/purchase"/);
  for (const lang of ["es", "en"]) assert.equal(messages[lang].Cart.stockKnownDelivery, undefined);
});

test("textos de la compra en es y en", () => {
  for (const lang of ["es", "en"]) {
    for (const key of ["channelStores", "channelDeliveryOut", "channelPickupOut", "storesStepTitle", "noticeStoreCleared", "noticeChannelChanged", "quantityAtMax", "chooseStoreHint"]) {
      assert.equal(typeof messages[lang].Cart[key], "string", `${lang} Cart.${key}`);
    }
  }
});
