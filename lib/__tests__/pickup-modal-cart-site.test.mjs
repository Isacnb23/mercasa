// Regresión: al abrir el modal de un producto con retiro ya en el carrito, la tienda del carrito viene preseleccionada y elegir otra pide
// confirmación ("Tu retiro es en X. ¿Cambiar todo el retiro a Y?"). El caso real: el carrito tiene un producto de retiro en Homex Alajuela
// agregado SIN elegir tienda explícita (la tienda es la propuesta), se abre el modal de otro producto y se elige Homex Tejar: antes el modal
// leía solo la tienda "elegida" (null) y creía que no había tienda: no preseleccionaba ni pedía confirmación, y cambiaba todo sin preguntar.
// Se usa el CartProvider y el ProductDetailModal REALES (render de servidor, sin dobles del carrito), con textos reales en es y en.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React, stubModule } from "./helpers/load-tsx.mjs";

stubModule("lib/auth-context", { useAuth: () => ({ user: null, isLoading: false }) });
stubModule("i18n/navigation", { Link: (props) => React.createElement("a", props) });

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { CartProvider, useCart } = loadFromRoot("lib/cart-context.tsx");
const { default: ProductDetailModal } = loadFromRoot("components/modals/product-catalog/ProductDetailModal.tsx");
const { chooseSite, selectChannel } = loadFromRoot("lib/purchase.ts");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const sites = [
  { siteId: "ALA", name: "Homex Alajuela" },
  { siteId: "CCA", name: "Homex Tejar" },
];
const availability = { delivery: { available: true }, pickup: { available: true, sites } };
const beer = { id: "BEER", name: "Cerveza", availability };
const oil = { id: "OIL", name: "Aceite", availability };
const Icon = () => null;
const price = { kind: "consult" };

// Carrito con UNA línea de retiro cuyas tiendas con existencia (al agregarla) eran solo Alajuela; el cliente NUNCA eligió tienda (pickupSiteId null).
const cartInAlajuela = { items: [{ ...beer, quantity: 1, channel: "pickup", pickupSiteIds: ["ALA"] }], pickupSiteId: null };

const withCart = (child, initialState = cartInAlajuela, locale = "es") =>
  React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, React.createElement(CartProvider, { initialState }, child));

// Lee del contexto real lo que ven el modal y la tarjeta, como atributos del HTML (sin reasignar variables durante el render).
const Probe = () => {
  const cart = useCart();
  return React.createElement("i", { "data-chosen": cart.pickupSiteId ?? "none", "data-site": cart.pickupSite ?? "none" });
};
const probe = (initialState) => {
  const html = renderToHtml(withCart(React.createElement(Probe), initialState));
  return { chosen: html.match(/data-chosen="([^"]*)"/)[1], site: html.match(/data-site="([^"]*)"/)[1] };
};

test("el contexto real expone LA tienda del retiro (la propuesta si no hay elegida), no solo la elegida", () => {
  assert.deepEqual(probe(cartInAlajuela), { chosen: "none", site: "ALA" });
  // Sin líneas de retiro no hay tienda del carrito.
  assert.equal(probe({ items: [], pickupSiteId: null }).site, "none");
});

test("el modal de otro producto abre con la tienda del carrito (Homex Alajuela) preseleccionada", () => {
  for (const locale of ["es", "en"]) {
    const html = renderToHtml(withCart(React.createElement(ProductDetailModal, { product: oil, icon: Icon, price, startAtPickup: true, onClose: () => {} }), cartInAlajuela, locale));
    const radios = [...html.matchAll(/<[^>]*role="radio"[^>]*>/g)].map((m) => m[0]);
    assert.equal(radios.length, 2, locale);
    const checked = radios.filter((r) => /aria-checked="true"/.test(r));
    assert.equal(checked.length, 1, locale);
    assert.match(html.slice(html.indexOf(checked[0])), /^[^]*?Homex Alajuela/, locale);
    // Y no hay confirmación pendiente hasta que el cliente elija otra tienda.
    assert.doesNotMatch(text(html), /Tu retiro es en|Your pickup is at/);
  }
});

test("sin retiro en el carrito el modal NO preselecciona ninguna tienda", () => {
  const html = renderToHtml(withCart(React.createElement(ProductDetailModal, { product: oil, icon: Icon, price, startAtPickup: true, onClose: () => {} }), { items: [], pickupSiteId: null }));
  assert.equal([...html.matchAll(/role="radio"[^>]*aria-checked="true"/g)].length, 0);
});

test("elegir Homex Tejar con el carrito en Homex Alajuela pide confirmación en vez de cambiar todo el retiro", () => {
  const cartSite = probe(cartInAlajuela).site; // lo mismo que lee el modal

  const units = [{ unitId: "UN", isDefault: true, pickupAvailable: true, pickupBySite: null, available: 50, deliveryStatus: "available" }];
  const start = selectChannel(oil, units, { unitId: "UN", channel: null, siteId: null }, "pickup", cartSite);
  assert.equal(start.siteId, "ALA"); // preseleccionada

  const other = chooseSite(oil, units, start, cartSite, "CCA");
  assert.deepEqual(other, { kind: "confirm", siteId: "CCA" }); // no cambia nada hasta que el cliente acepte
  // La misma tienda se elige directo, sin preguntar.
  assert.equal(chooseSite(oil, units, start, cartSite, "ala").kind, "select");
});

test("el modal y la tarjeta leen la tienda del contexto (pickupSite), nunca solo la elegida (pickupSiteId)", () => {
  const modal = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  const catalog = fs.readFileSync("components/modals/product-catalog/ProductCatalogModal.tsx", "utf8");
  assert.match(modal, /pickupSite: cartSite/);
  assert.match(catalog, /pickupSite: cartSite/);
  assert.doesNotMatch(modal, /pickupSiteId/);
  assert.doesNotMatch(catalog, /pickupSiteId/);
});

test("el aviso de confirmación dice la tienda actual y la nueva (es y en)", () => {
  assert.equal(messages.es.Cart.storeChangeConfirm, "Tu retiro es en {current}. ¿Cambiar todo el retiro a {next}?");
  assert.equal(typeof messages.en.Cart.storeChangeConfirm, "string");
});
