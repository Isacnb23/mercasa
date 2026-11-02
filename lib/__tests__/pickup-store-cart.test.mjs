// UNA tienda de retiro por carrito (una sola fuente de verdad): la tienda elegida en el modal es la del grupo de retiro del carrito, el modal de los
// productos siguientes la trae preseleccionada, elegir otra pide confirmación, cambiarla borra la fecha de retiro y revalida la existencia.
// Datos inventados; todo lo de existencia sale de respuestas de servidor simuladas.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { addToCart, cartPickupSite, changePickupSite, needsStoreChangeConfirmation, resolvePickupSite, siteNameInCart } from "../cart-logic.ts";
import { buildOrderRequest, parseOrderPreview } from "../order-logic.ts";
import { addTarget, selectSite, normalize } from "../purchase.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { default: StoreChangeConfirm } = loadFromRoot("components/modals/product-catalog/StoreChangeConfirm.tsx");
const { default: PickupSiteSelector } = loadFromRoot("components/cart/PickupSiteSelector.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const sites = [
  { siteId: "ALA", name: "Homex Alajuela" },
  { siteId: "SJO", name: "Homex Barrio San José (Alajuela)" },
  { siteId: "SCA", name: "Homex Ciudad Quesada" },
];
const beer = { id: "BEER", name: "Cerveza", availability: { delivery: { available: true }, pickup: { available: true, sites } } };
const oil = { id: "OIL", name: "Aceite", availability: { delivery: { available: true }, pickup: { available: true, sites } } };
const unit = (extra) => ({ unitId: "UN", isDefault: true, pickupAvailable: true, pickupBySite: null, available: 50, deliveryStatus: "available", ...extra });

// ---- estado de la tienda y de la fecha de retiro ----

test("agregar el primer producto de retiro sin tienda previa: esa tienda queda como la del grupo (y no hay fecha)", () => {
  const before = { siteId: null, date: null };
  const after = changePickupSite(before, "ALA");
  assert.deepEqual(after, { siteId: "ALA", date: null });

  // Y con la tienda ya elegida, el resumen del carrito la muestra: resolvePickupSite devuelve la elegida, no una propuesta.
  const items = addToCart([], beer, 2, undefined, "pickup");
  assert.equal(resolvePickupSite(items, after.siteId), "ALA");
});

test("agregar otro producto a la MISMA tienda no toca la fecha de retiro", () => {
  const current = { siteId: "ALA", date: "2026-11-03" };
  assert.deepEqual(changePickupSite(current, "ALA"), current);
  assert.deepEqual(changePickupSite(current, "ala"), current); // sin distinguir mayúsculas
});

test("cambiar de tienda (desde el modal o desde el carrito) borra la fecha de retiro", () => {
  assert.deepEqual(changePickupSite({ siteId: "ALA", date: "2026-11-03" }, "SCA"), { siteId: "SCA", date: null });
  assert.deepEqual(changePickupSite({ siteId: "ALA", date: "2026-11-03" }, null), { siteId: null, date: null });
  assert.deepEqual(changePickupSite({ siteId: null, date: null }, null), { siteId: null, date: null });
  assert.deepEqual(changePickupSite({ siteId: "ALA", date: "2026-11-03" }, "  "), { siteId: null, date: null });
});

test("el contexto del carrito usa changePickupSite: cambiar la tienda borra la fecha en un solo paso", () => {
  const context = fs.readFileSync("lib/cart-context.tsx", "utf8");
  assert.match(context, /changePickupSite\(\{ siteId: pickupSite, date: pickupDate \}, siteId\)/);
  assert.match(context, /setPickupSiteId\(next\.siteId\);\s*setPickupDate\(next\.date\);/);
  assert.match(context, /setPickupSite,\s*\n\s*pickupDate,/); // el valor expuesto es ese, no el setter crudo
});

// ---- la tienda del carrito en el modal de los productos siguientes ----

test("la tienda del carrito solo cuenta si hay líneas de retiro", () => {
  const withPickup = addToCart([], beer, 1, undefined, "pickup");
  const onlyDelivery = addToCart([], beer, 1, undefined, "delivery");
  assert.equal(cartPickupSite(withPickup, "ALA"), "ALA");
  assert.equal(cartPickupSite(onlyDelivery, "ALA"), null);
  // Sin tienda elegida cuenta la propuesta (la misma que usa el carrito): antes el modal creía que no había ninguna.
  assert.equal(cartPickupSite(withPickup, null), "ALA");
  assert.equal(cartPickupSite([], "ALA"), null);
});

test("el modal de un producto siguiente viene con la tienda del carrito preseleccionada (si la tiene con esa presentación)", () => {
  const retiro = { unitId: "UN", channel: "pickup", siteId: "ALA" }; // lo que el modal arma con cartPickupSite
  assert.deepEqual(normalize(oil, [unit()], retiro).selection, { unitId: "UN", channel: "pickup", siteId: "ALA" });
  assert.deepEqual(addTarget(oil, [unit()], retiro), { ok: true, channel: "pickup", unitId: undefined, siteId: "ALA" });

  // Si esa tienda no tiene la presentación del producto nuevo, queda sin tienda con aviso (se elige otra con confirmación).
  const sinExistencia = [unit({ pickupBySite: [{ siteId: "ALA", status: "out" }, { siteId: "SCA", status: "available" }] })];
  const r = normalize(oil, sinExistencia, retiro);
  assert.deepEqual([r.selection.siteId, r.notice], [null, "store_cleared"]);

  const source = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  assert.match(source, /useState<Selection>\(\{ unitId: null, channel: startAtPickup \? "pickup" : null, siteId: cartSite \}\)/);
  assert.match(source, /pickupSite: cartSite/);
});

// ---- elegir una tienda distinta en el modal ----

test("confirmación: solo si el carrito ya tiene tienda de retiro y la elegida es otra", () => {
  assert.equal(needsStoreChangeConfirmation("ALA", "SCA"), true);
  assert.equal(needsStoreChangeConfirmation("ALA", "ala"), false); // la misma
  assert.equal(needsStoreChangeConfirmation(null, "SCA"), false); // sin tienda previa se elige directo
  assert.equal(needsStoreChangeConfirmation("ALA", "ALA"), false);
});

test("el nombre de la tienda del carrito sale de lo que traen sus líneas", () => {
  const items = addToCart(addToCart([], beer, 1, undefined, "pickup"), oil, 1, undefined, "pickup");
  assert.equal(siteNameInCart(items, "SJO"), "Homex Barrio San José (Alajuela)");
  assert.equal(siteNameInCart(items, "sca"), "Homex Ciudad Quesada");
  assert.equal(siteNameInCart(items, "ZZZ"), null);
  assert.equal(siteNameInCart([], "ALA"), null);
});

test("aceptar: la selección pasa a la nueva tienda; mantener: sigue la del carrito", () => {
  const units = [unit()];
  const current = { unitId: "UN", channel: "pickup", siteId: "ALA" };
  assert.equal(selectSite(oil, units, current, "SCA").siteId, "SCA"); // aceptar (el modal además llama a setPickupSite)
  assert.equal(normalize(oil, units, current).selection.siteId, "ALA"); // mantener: nada cambia
});

test("el modal pide confirmación en el propio modal (sin window.confirm) y al aceptar cambia la tienda del grupo", () => {
  const source = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  assert.doesNotMatch(source, /window\.confirm|\bconfirm\(/);
  assert.match(source, /chooseSite\(product, units, selection, cartSite, siteId\)/);
  assert.match(source, /setPendingSite\(choice\.siteId\);\s*return;/);
  assert.match(source, /const acceptStoreChange = \(\) => \{\s*if \(!pendingSite\) return;\s*setPickupSite\(pendingSite\);/);
  assert.match(source, /<StoreChangeConfirm/);
});

test("render de la confirmación: 'Tu retiro es en X. ¿Cambiar todo el retiro a Y?' con los dos botones", () => {
  const html = renderToHtml(withIntl(React.createElement(StoreChangeConfirm, { current: "Homex Alajuela", next: "Homex Ciudad Quesada", onAccept: () => {}, onKeep: () => {} })));
  const plain = text(html);
  assert.match(plain, /Tu retiro es en Homex Alajuela\. ¿Cambiar todo el retiro a Homex Ciudad Quesada\?/);
  assert.match(plain, /Cambiar todo el retiro/);
  assert.match(plain, /Mantener Homex Alajuela/);
  assert.match(plain, /se borra la fecha de retiro/);
  assert.match(html, /role="alert"/);
  assert.equal([...html.matchAll(/<button/g)].length, 2);

  const en = text(renderToHtml(withIntl(React.createElement(StoreChangeConfirm, { current: "Alajuela", next: "Quesada", onAccept: () => {}, onKeep: () => {} }), "en")));
  assert.match(en, /Your pickup is at Alajuela\. Change the whole pickup to Quesada\?/);
  assert.match(en, /Keep Alajuela/);
});

// ---- revalidación de todas las líneas en la nueva tienda ----

test("al cambiar la tienda el pedido se vuelve a validar con TODAS las líneas de retiro en la nueva tienda", () => {
  const items = addToCart(addToCart(addToCart([], beer, 2, undefined, "pickup"), oil, 1, "CAJA", "pickup"), beer, 1, undefined, "delivery");
  const base = { addressId: 7, deliveryDate: "2026-11-03", paymentMethod: "sinpe", pickupDate: null };

  const antes = buildOrderRequest(items, { ...base, pickupSiteId: "ALA" });
  const despues = buildOrderRequest(items, { ...base, pickupSiteId: "SCA" });

  assert.equal(antes.pickup.siteId, "ALA");
  assert.equal(despues.pickup.siteId, "SCA");
  assert.deepEqual(despues.pickup.lines, antes.pickup.lines); // las mismas líneas, ahora contra la nueva tienda
  assert.equal(despues.pickup.lines.length, 2);
  assert.deepEqual(despues.delivery, antes.delivery); // domicilio no se toca
  // Sin fecha: la fecha de retiro borrada no viaja.
  assert.equal("pickupDate" in despues.pickup, false);
});

test("la revalidación depende de la tienda: useOrderPreview vuelve a pedir cuando cambia pickupSiteId", () => {
  const source = fs.readFileSync("lib/order-preview.ts", "utf8");
  assert.match(source, /\[accountNum, addressId, cartItems, deliveryDate, paymentMethod, pickupSiteId, pickupDate\]/);
});

const totals = { subtotal: 1000, discount: 0, tax: 130, total: 1130 };
const pickupLine = (itemId, available) => ({ itemId, name: itemId, unitId: "UN", quantity: 2, unitPrice: 500, discount: 0, tax: 65, lineTotal: 565, available, maxAvailable: available ? 5 : 0 });
const previewFor = (siteId, lines, siteStatuses) => parseOrderPreview({
  lines: [], totals, freight: null, freightPending: true, minimumAmount: 0, belowMinimum: false, shortfall: 0,
  delivery: { date: null, valid: false, requiresCoordination: false }, canOrder: false, errors: [], grandTotals: totals,
  pickupGroup: {
    lines, totals, minimumAmount: 0, belowMinimum: false, shortfall: 0, canOrder: lines.every((l) => l.available), siteId,
    errors: lines.filter((l) => !l.available).map((l) => ({ code: "insufficient_stock", itemId: l.itemId, message: "No hay disponibilidad suficiente de este producto." })),
    sites: Object.entries(siteStatuses).map(([id, [missing, status]]) => ({ siteId: id, unavailableItems: missing, name: `Homex ${id}`, city: "", address: "", hours: "", mapUrl: "", lat: null, lng: null, status })),
  },
});

test("revalidación: en la nueva tienda las líneas que no alcanzan quedan marcadas y la tarjeta lo dice", () => {
  const enAla = previewFor("ALA", [pickupLine("BEER", true), pickupLine("OIL", true)], { ALA: [0, "available"], SCA: [1, "out"] });
  const enSca = previewFor("SCA", [pickupLine("BEER", true), pickupLine("OIL", false)], { ALA: [0, "available"], SCA: [1, "out"] });

  assert.equal(enAla.pickupGroup.canOrder, true);
  assert.deepEqual(enSca.pickupGroup.lines.map((l) => [l.itemId, l.available]), [["BEER", true], ["OIL", false]]);
  assert.deepEqual(enSca.pickupGroup.errors.map((e) => [e.code, e.itemId]), [["insufficient_stock", "OIL"]]);
  assert.equal(enSca.pickupGroup.canOrder, false);

  // La tarjeta del carrito (tienda ya elegida) avisa cuántos productos no alcanzan en la nueva tienda.
  const html = renderToHtml(withIntl(React.createElement(PickupSiteSelector, { sites: enSca.pickupGroup.sites, selectedId: "SCA", proposed: false, onSelect: () => {} })));
  assert.match(text(html), /Homex SCA/);
  assert.match(text(html), /1 producto no está disponible en esta tienda/);
  assert.match(html, />Cambiar tienda</);
});

// ---- "Cambiar tienda" en el carrito ----

test("'Cambiar tienda' del carrito usa el mismo selector del modal (cercanas, estado por tienda) y deja elegir tiendas a las que les falta algo", () => {
  const source = fs.readFileSync("components/cart/PickupSiteSelector.tsx", "utf8");
  assert.match(source, /from "@\/components\/modals\/product-catalog\/PickupStoreChooser"/);
  assert.match(source, /blockOut=\{false\}/);
  assert.match(source, /const showChooser = proposed \|\| changing \|\| !selected;/);
  assert.match(source, /onClick=\{\(\) => setChanging\(true\)\}/);
  // El selector viejo (<select> con "N productos sin existencia") ya no existe: una sola fuente.
  assert.doesNotMatch(source, /<select|<option/);

  // El carrito y el paso de entrega usan ese componente y al elegir cambian la tienda del grupo (con borrado de la fecha).
  const drawer = fs.readFileSync("components/cart/CartDrawer.tsx", "utf8");
  assert.match(drawer, /<PickupSiteSelector[\s\S]*?proposed=\{pickupSiteId === null\}[\s\S]*?onSelect=\{setPickupSite\}/);
  assert.match(drawer, /onSelectSite: setPickupSite/);
});

test("textos de la tienda del carrito y de la confirmación en es y en", () => {
  for (const lang of ["es", "en"]) {
    for (const key of ["storeChangeConfirm", "storeChangeNote", "storeChangeAccept", "storeChangeKeep"]) assert.equal(typeof messages[lang].Cart[key], "string", `${lang} Cart.${key}`);
    for (const key of ["pickupChangeStore", "pickupChangeCancel", "pickupStoreLabel"]) assert.equal(typeof messages[lang].Cart.order[key], "string", `${lang} Cart.order.${key}`);
    for (const key of ["pickupStoreOption", "pickupStoreOptionMissing", "pickupStoreSelectAria"]) assert.equal(messages[lang].Cart.order[key], undefined, `${lang} Cart.order.${key} ya no se usa`);
  }
});
