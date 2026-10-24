// Render del bloque "¿Cómo lo querés?" (react-dom/server + next-intl con los textos reales; ver helpers/load-tsx.mjs).
// La interacción (clic/Esc) no se puede simular en render de servidor: su lógica se prueba en catalog-channel.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const { ChannelAvailability } = loadFromRoot("components/modals/product-catalog/ChannelBadges.tsx");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };

const site = (siteId, extra = {}) => ({ siteId, name: "Homex " + siteId, city: "Cartago, " + siteId, address: "800 m sur", hours: "Lunes a Sábado 9:00am a 8:00pm", mapUrl: "https://www.google.com/maps/place/x", ...extra });
const availability = (sites) => ({ delivery: { available: false }, pickup: { available: true, unit: "UND", sites } });
const price = { kind: "price", total: 395, unit: "UND", varies: false, bySite: [] };

const render = (sites, locale = "es") =>
  renderToHtml(
    React.createElement(
      NextIntlClientProvider,
      { locale, messages: messages[locale] },
      React.createElement(ChannelAvailability, { availability: availability(sites), deliveryPrice: { kind: "hidden" }, pickupPrice: price }),
    ),
  );

test("varias tiendas: botones con nombre y ciudad, ninguna abierta y un panel de alto fijo con la indicación", () => {
  const html = render(["CCA", "CCO", "CPR", "CPT", "SSH"].map((s) => site(s)));
  assert.equal([...html.matchAll(/data-site-id="/g)].length, 3 + 5); // 3 visibles + las 5 de la lista completa
  assert.match(html, /Homex CCA<\/span><span[^>]*>· Cartago, CCA/);
  assert.equal([...html.matchAll(/data-site-id="[A-Z]+" aria-expanded="true"/g)].length, 0);
  assert.match(html, /h-36/); // alto reservado
  assert.match(html, /Elegí una tienda para ver su dirección/);
  assert.doesNotMatch(html, /Ver en el mapa/);
  assert.match(html, />\+2</); // "+N"
});

test("una sola tienda: su panel va abierto por defecto con dirección, horario y mapa seguro", () => {
  const html = render([site("CCA")]);
  assert.equal([...html.matchAll(/data-site-id="[A-Z]+" aria-expanded="true"/g)].length, 1);
  assert.match(html, /Dirección:<\/span> 800 m sur/);
  assert.match(html, /Horario de la tienda:<\/span> Lunes a Sábado/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/place\/x"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /Elegí una tienda/);
});

test("encabezado de retiro sin la frase repetida; es/en con los mismos textos", () => {
  const es = render([site("CCA")]);
  assert.doesNotMatch(es, /Retiralo en tienda/);
  assert.match(es, />Retiro en tienda</);
  const en = render([site("CCA")], "en");
  assert.match(en, />Store pickup</);
  assert.match(en, /Store hours:/);
});

test("tienda sin datos: etiqueta quieta (sin botón) y sin panel", () => {
  const html = render([{ siteId: "SJO", name: "San José" }]);
  assert.doesNotMatch(html, /data-site-id/);
  assert.doesNotMatch(html, /h-36/);
});
