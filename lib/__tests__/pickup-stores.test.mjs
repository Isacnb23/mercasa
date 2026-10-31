// Tiendas de retiro: estado de existencia, orden por cercanía en el navegador, ubicación bajo permiso y lectura de lo que manda el servidor.
// Datos inventados; la ubicación del cliente nunca sale del navegador.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import { NEAREST_COUNT, formatKm, haversineKm, isStoreStatus, rankStores, storeCoords } from "../pickup-stores.ts";
import { locate } from "../geolocation.ts";
import { parseCatalogPrices } from "../catalog-prices.ts";
import { parseOrderPreview } from "../order-logic.ts";
import { parseUnifiedCatalog } from "../catalog-channel.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { default: PickupStoreChooser } = loadFromRoot("components/modals/product-catalog/PickupStoreChooser.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// Coordenadas reales de la zona (las de BRANCH_COORDS) solo para que las distancias tengan sentido.
const ALA = { siteId: "ALA", name: "Homex Alajuela", lat: 10.02365694836346, lng: -84.20451275293486 };
const SJO = { siteId: "SJO", name: "Homex Barrio San José (Alajuela)", lat: 10.015245851658326, lng: -84.22623013809769 };
const SFN = { siteId: "SFN", name: "Homex San Francisco", lat: 9.906575717443216, lng: -84.04890966878872 };
const SSH = { siteId: "SSH", name: "Homex San Sebastián", lat: 9.912578541238625, lng: -84.09060626878872 };
const CCA = { siteId: "CCA", name: "Homex Tejar", lat: 9.847313, lng: -83.926938 };
const CAA = { siteId: "CAA", name: "Homex Los Higuerones" }; // sin coordenadas
const here = { lat: 10.0, lng: -84.2 }; // cerca de Alajuela

// ---- distancia ----

test("haversineKm: cero en el mismo punto, simétrica y con el orden de magnitud correcto", () => {
  assert.equal(haversineKm(here, here), 0);
  assert.ok(Math.abs(haversineKm(ALA, SFN) - haversineKm(SFN, ALA)) < 1e-9);
  // Alajuela - San Francisco de Dos Ríos: unos 22 km en línea recta.
  const km = haversineKm(storeCoords(ALA), storeCoords(SFN));
  assert.ok(km > 18 && km < 26, `km = ${km}`);
  // Un grado de latitud ≈ 111 km.
  assert.ok(Math.abs(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) - 111.19) < 0.5);
});

test("storeCoords: solo con latitud y longitud válidas", () => {
  assert.deepEqual(storeCoords(ALA), { lat: ALA.lat, lng: ALA.lng });
  assert.equal(storeCoords(CAA), null);
  assert.equal(storeCoords({ lat: 10, lng: null }), null);
  assert.equal(storeCoords({ lat: Number.NaN, lng: 1 }), null);
});

test("formatKm: un decimal por debajo de 10 km, entero desde 10; separador según el idioma", () => {
  assert.equal(formatKm(2.44, "es"), "2,4");
  assert.equal(formatKm(2.44, "en"), "2.4");
  assert.equal(formatKm(12.6, "es"), "13");
  assert.equal(formatKm(0, "es"), "0");
});

// ---- orden ----

test("con ubicación: las 3 más cercanas de entrada, por distancia, y el resto tras 'Ver todas las tiendas'", () => {
  const ranked = rankStores([SFN, CCA, SSH, ALA, SJO], here);

  assert.equal(NEAREST_COUNT, 3);
  assert.equal(ranked.byDistance, true);
  assert.deepEqual(ranked.shown.map((r) => r.store.siteId), ["ALA", "SJO", "SSH"]);
  assert.deepEqual(ranked.hidden.map((r) => r.store.siteId), ["SFN", "CCA"]);
  const kms = [...ranked.shown, ...ranked.hidden].map((r) => r.km);
  assert.ok(kms.every((k) => typeof k === "number"));
  assert.deepEqual([...kms].sort((a, b) => a - b), kms); // ya vienen de menor a mayor
});

test("sin ubicación (sin permiso o con error): se muestran TODAS, sin ocultar ninguna ni calcular distancias", () => {
  const ranked = rankStores([SFN, CCA, SSH, ALA, SJO], null);

  assert.equal(ranked.byDistance, false);
  assert.equal(ranked.shown.length, 5);
  assert.deepEqual(ranked.hidden, []);
  assert.ok(ranked.shown.every((r) => r.km === null));
});

test("las tiendas sin existencia van al final, con y sin ubicación", () => {
  const stores = [{ ...ALA, status: "out" }, { ...SJO, status: "available" }, { ...SSH, status: "low" }];

  assert.deepEqual(rankStores(stores, null).shown.map((r) => r.store.siteId), ["SJO", "SSH", "ALA"]);
  const withPosition = rankStores(stores, here);
  assert.equal(withPosition.shown.at(-1).store.siteId, "ALA"); // la más cercana, pero sin existencia: al final
  assert.deepEqual(withPosition.shown.map((r) => r.store.siteId), ["SJO", "SSH", "ALA"]);
});

test("con ubicación, una tienda sin coordenadas va después de las que sí las tienen", () => {
  const ranked = rankStores([CAA, SFN, ALA], here);
  assert.deepEqual([...ranked.shown, ...ranked.hidden].map((r) => r.store.siteId), ["ALA", "SFN", "CAA"]);
  assert.equal(ranked.shown.at(-1).km, null);
});

test("con ubicación pero NINGUNA tienda con coordenadas: se muestran todas (no hay nada que ordenar por distancia)", () => {
  const ranked = rankStores([CAA, { siteId: "CCO", name: "Homex Oreamuno" }, { siteId: "CDG", name: "Homex Gravilias" }, { siteId: "CDS", name: "Homex San Rafael" }], here);
  assert.equal(ranked.byDistance, false);
  assert.equal(ranked.shown.length, 4);
  assert.deepEqual(ranked.hidden, []);
});

test("isStoreStatus: solo available, low y out", () => {
  assert.deepEqual(["available", "low", "out", "", null, "agotado", 3].map(isStoreStatus), [true, true, true, false, false, false, false]);
});

// ---- ubicación del navegador ----

const geo = (behavior) => ({ getCurrentPosition: (ok, fail, options) => behavior(ok, fail, options) });

test("locate: con permiso devuelve la posición, pedida con precisión aproximada y sin guardarla en ningún lado", async () => {
  let asked = null;
  const result = await locate(geo((ok, _fail, options) => { asked = options; ok({ coords: { latitude: 10.1, longitude: -84.3 } }); }));

  assert.deepEqual(result, { status: "granted", position: { lat: 10.1, lng: -84.3 } });
  assert.equal(asked.enableHighAccuracy, false);
  assert.ok(asked.timeout > 0);
});

test("locate: sin permiso es 'denied'; cualquier otro error, un navegador sin ubicación o datos raros, 'unavailable'", async () => {
  assert.deepEqual(await locate(geo((_ok, fail) => fail({ code: 1 }))), { status: "denied", position: null });
  assert.deepEqual(await locate(geo((_ok, fail) => fail({ code: 2 }))), { status: "unavailable", position: null });
  assert.deepEqual(await locate(geo((_ok, fail) => fail({ code: 3 }))), { status: "unavailable", position: null });
  assert.deepEqual(await locate(undefined), { status: "unavailable", position: null });
  assert.deepEqual(await locate(geo(() => { throw new Error("boom"); })), { status: "unavailable", position: null });
  assert.deepEqual(await locate(geo((ok) => ok({ coords: { latitude: Number.NaN, longitude: 1 } }))), { status: "unavailable", position: null });
});

test("la ubicación no se envía ni se guarda: ni geolocation.ts ni el hook ni el selector tocan fetch, storage o cookies", () => {
  for (const file of ["lib/geolocation.ts", "lib/hooks/useUserPosition.ts", "lib/pickup-stores.ts", "components/modals/product-catalog/PickupStoreChooser.tsx"]) {
    const code = fs.readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /\bfetch\s*\(|localStorage|sessionStorage|document\.cookie|XMLHttpRequest|sendBeacon/, file);
  }
});

test("la ubicación se pide al abrir el retiro, no al cargar la página: solo el selector de tiendas llama al hook", () => {
  const callers = ["components", "app", "lib"]
    .flatMap((dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && /\.(tsx?)$/.test(e.name)).map((e) => `${e.parentPath ?? e.path}/${e.name}`))
    .filter((file) => !file.includes("__tests__") && /useUserPosition\(/.test(fs.readFileSync(file, "utf8")))
    .map((file) => file.replaceAll("\\", "/"));
  assert.deepEqual(callers.filter((f) => !f.endsWith("useUserPosition.ts")), [callers.find((f) => f.endsWith("PickupStoreChooser.tsx"))]);

  // Y el modal solo lo monta cuando el canal elegido es retiro.
  const modal = fs.readFileSync("components/modals/product-catalog/ProductDetailModal.tsx", "utf8");
  assert.match(modal, /selection\.channel === "pickup" && \(\s*<section[^>]*>[\s\S]*?<PickupStoreChooser/);
});

// ---- lo que manda el servidor ----

test("catálogo: las tiendas traen lat/lng solo si ambas son números válidos", () => {
  const items = parseUnifiedCatalog([{
    itemId: "A", itemName: "Aceite", unitId: "UN",
    availability: {
      delivery: { available: true }, pickup: { available: true, sites: [
        { siteId: "ALA", name: "Homex Alajuela", lat: 10.02, lng: -84.2 },
        { siteId: "CAA", name: "Homex Los Higuerones", lat: null, lng: null },
        { siteId: "CCO", name: "Homex Oreamuno", lat: 9.8 },
      ] },
    },
  }]);

  const sites = items[0].availability.pickup.sites;
  assert.deepEqual([sites[0].lat, sites[0].lng], [10.02, -84.2]);
  assert.equal(sites[1].lat, undefined);
  assert.equal(sites[2].lat, undefined); // media coordenada no sirve
});

const unit = (extra) => ({ unitId: "CAJA", label: "Caja", unitPrice: 11000, tax: 1430, factor: 12, baseUnitId: "UN", available: 3, isDefault: false, pickupAvailable: true, ...extra });
const pricesBody = (units) => ({ priceListMissing: false, missing: [], prices: [{ itemId: "A", unitPrice: 1000, tax: 130, unit: "UN", hasDelivery: true, units }] });

test("precios: cada presentación trae el estado por tienda; lo que no se entiende se ignora; sin lista es null", () => {
  const parsed = parseCatalogPrices(pricesBody([
    unit({ pickupBySite: [{ siteId: "ALA", status: "low" }, { siteId: "CAA", status: "out" }, { siteId: "SCA", status: "agotado" }, { status: "out" }, "x"] }),
    unit({ unitId: "UN", pickupBySite: undefined }),
  ]));

  const [box, base] = parsed.prices[0].units;
  assert.deepEqual(box.pickupBySite, [{ siteId: "ALA", status: "low" }, { siteId: "CAA", status: "out" }]);
  assert.equal(base.pickupBySite, null);
});

test("pedido: las tiendas del grupo de retiro traen estado y coordenadas (y sin estado se deduce de los productos que faltan)", () => {
  const totals = { subtotal: 1000, discount: 0, tax: 130, total: 1130 };
  const group = (sites) => ({ lines: [], totals, minimumAmount: 0, belowMinimum: false, shortfall: 0, canOrder: true, errors: [], siteId: "ALA", sites });
  const raw = {
    lines: [], totals, freight: null, freightPending: true, minimumAmount: 0, belowMinimum: false, shortfall: 0,
    delivery: { date: null, valid: true, requiresCoordination: false }, canOrder: true, errors: [], grandTotals: totals,
    pickupGroup: group([
      { siteId: "ALA", unavailableItems: 0, name: "Homex Alajuela", city: "", address: "", hours: "", mapUrl: "", lat: 10.02, lng: -84.2, status: "low" },
      { siteId: "CAA", unavailableItems: 2, name: "Homex Los Higuerones", city: "", address: "", hours: "", mapUrl: "" },
      { siteId: "SCA", unavailableItems: 0, name: "Homex Ciudad Quesada", city: "", address: "", hours: "", mapUrl: "", lat: null, lng: null, status: "raro" },
    ]),
  };

  const sites = parseOrderPreview(raw).pickupGroup.sites;
  assert.deepEqual([sites[0].status, sites[0].lat, sites[0].lng], ["low", 10.02, -84.2]);
  assert.deepEqual([sites[1].status, sites[1].lat], ["out", null]);
  assert.deepEqual([sites[2].status, sites[2].lat], ["available", null]);
});

// ---- selector de tiendas (render) ----

const chooser = (props, locale = "es") =>
  text(renderToHtml(withIntl(React.createElement(PickupStoreChooser, { chosenId: null, onChoose: () => {}, labelledBy: "t", ...props }), locale)));

test("selector: cada tienda muestra su estado y las sin existencia van al final", () => {
  const html = chooser({ stores: [{ ...ALA, status: "out" }, { ...SJO, status: "available" }, { ...SSH, status: "low" }, CAA] });

  assert.match(html, /Disponible/);
  assert.match(html, /Pocas unidades/);
  assert.match(html, /Sin existencia/);
  assert.ok(html.indexOf("Homex Alajuela") > html.indexOf("Homex San Sebastián"), "la tienda sin existencia, al final");
  assert.ok(html.indexOf("Homex Alajuela") > html.indexOf("Homex Los Higuerones"));
  // La tienda sin dato de existencia no muestra estado inventado.
  assert.equal([...html.matchAll(/Disponible|Pocas unidades|Sin existencia/g)].length, 3);
});

test("selector: sin ubicación se ven todas (no hay 'Ver todas las tiendas') y la nota de privacidad está", () => {
  const html = chooser({ stores: [ALA, SJO, SSH, SFN, CCA].map((s) => ({ ...s, status: "available" })) });

  for (const name of ["Alajuela", "San José", "San Sebastián", "San Francisco", "Tejar"]) assert.match(html, new RegExp(name));
  assert.doesNotMatch(html, /Ver todas las tiendas/);
  assert.match(html, /Tu ubicación se usa solo en tu navegador para ordenar las tiendas; no se envía ni se guarda\./);
});

test("selector: la elegida queda marcada y una tienda sin existencia no se puede elegir", () => {
  const html = renderToHtml(withIntl(React.createElement(PickupStoreChooser, {
    stores: [{ ...ALA, status: "out" }, { ...SJO, status: "available" }], chosenId: "SJO", onChoose: () => {}, labelledBy: "t",
  })));

  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-checked="true"[^>]*>(?:(?!<\/button>).)*Barrio San Jos/s);
  assert.match(html, /<button[^>]*role="radio"[^>]*aria-checked="false"[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Alajuela/s);
});

test("selector: dirección, horario y mapa SOLO bajo la tienda elegida", () => {
  const withData = (store) => ({ ...store, status: "available", address: `Dirección de ${store.siteId}`, hours: `Horario de ${store.siteId}`, mapUrl: "https://www.google.com/maps?q=1,2" });
  const render = (chosenId) => renderToHtml(withIntl(React.createElement(PickupStoreChooser, {
    stores: [withData(ALA), withData(SJO)], chosenId, onChoose: () => {}, labelledBy: "t",
  })));

  const none = render(null);
  assert.doesNotMatch(none, /Dirección de|Horario de|Ver en el mapa/);

  const html = render("SJO");
  assert.match(html, /Dirección de SJO/);
  assert.match(html, /Horario de SJO/);
  assert.doesNotMatch(html, /Dirección de ALA|Horario de ALA/);
  assert.equal([...html.matchAll(/Ver en el mapa/g)].length, 1);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\?q=1,2"/);
});

test("selector: un enlace de mapa no seguro no se muestra", () => {
  const html = renderToHtml(withIntl(React.createElement(PickupStoreChooser, {
    stores: [{ ...ALA, status: "available", address: "x", mapUrl: "javascript:alert(1)" }], chosenId: "ALA", onChoose: () => {}, labelledBy: "t",
  })));
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /Ver en el mapa/);
});

test("textos del retiro por tienda en es y en", () => {
  for (const lang of ["es", "en"]) {
    for (const key of ["storeStatusAvailable", "storeStatusLow", "storeStatusOut", "storeDistanceKm", "seeAllStores", "seeFewerStores", "storesLocating",
      "storesNearest", "storesLocationOff", "storesLocationNote", "addToPickupAt", "storesStepTitle"]) {
      assert.equal(typeof messages[lang].Cart[key], "string", `${lang} Cart.${key}`);
    }
  }
  // Lo del diseño anterior ya no está.
  for (const lang of ["es", "en"]) {
    for (const key of ["stockKnownDelivery", "clearStore", "pickupSectionTitle", "pickupOutForUnit"]) assert.equal(messages[lang].Cart[key], undefined, `${lang} Cart.${key}`);
  }
});
