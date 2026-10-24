// Editar dirección: prellenado, errores, render del editor y de la lista con el botón "Editar", foco, aviso, carrito que refleja el
// cambio y llaves de mensajes. Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, stubModule, React } from "./helpers/load-tsx.mjs";
import {
  addressSignature,
  classifyDirectionError,
  isValidAddressId,
  matchOptionId,
  normalizeName,
  prefillFromSaved,
} from "../addresses-edit.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const saved = (over = {}) => ({
  addressId: 1001,
  name: "Casa de prueba",
  description: "200 m norte de la iglesia, portón negro",
  latitude: 9.9281,
  longitude: -84.0907,
  city: "CI001",
  provinceName: "San José",
  cantonName: "Central",
  districtName: "Carmen",
  cityName: null,
  isPrimary: true,
  principalDeliveryDay: 2,
  secondDeliveryDay: 5,
  ...over,
});

// ---- Lógica pura ----

test("id de la dirección: solo dígitos, hasta 18 y mayor que cero", () => {
  for (const ok of ["1", "1001", "9".repeat(18)]) assert.equal(isValidAddressId(ok), true, ok);
  for (const bad of ["", "0", "-5", "1.5", "abc", "1001; DROP", "1".repeat(19), " 1"]) assert.equal(isValidAddressId(bad), false, bad);
});

test("prellenado: nombres comparados sin importar mayúsculas, tildes ni espacios; sin nombre o sin coincidencia queda vacío", () => {
  const options = [{ id: "1", name: "San José" }, { id: "2", name: "Cartago" }];
  assert.equal(normalizeName("  SAN   José "), "san jose");
  assert.equal(matchOptionId(options, "san jose"), "1");
  assert.equal(matchOptionId(options, "SAN JOSÉ"), "1");
  assert.equal(matchOptionId(options, "Cartago"), "2");
  assert.equal(matchOptionId(options, "Heredia"), "");
  assert.equal(matchOptionId(options, null), "");
  assert.equal(matchOptionId(options, "  "), "");
  assert.equal(matchOptionId([], "San José"), "");
});

test("valores precargados desde la dirección guardada: nombre, señas (descripción), pin y nombres de ubicación", () => {
  const p = prefillFromSaved(saved());
  assert.equal(p.addressName, "Casa de prueba");
  assert.equal(p.street, "200 m norte de la iglesia, portón negro");
  assert.deepEqual(p.pin, { lat: 9.9281, lng: -84.0907 });
  assert.deepEqual([p.provinceName, p.cantonName, p.districtName, p.cityName], ["San José", "Central", "Carmen", null]);
  // sin ubicación válida no hay pin (el editor empieza en el mapa)
  assert.equal(prefillFromSaved(saved({ latitude: 0, longitude: 0 })).pin, null);
  assert.equal(prefillFromSaved(saved({ latitude: 999, longitude: 1 })).pin, null);
});

test("errores al guardar: sesión, no existe, validación, AIF caído y el resto", () => {
  assert.equal(classifyDirectionError(401, { error: "x" }), "session");
  assert.equal(classifyDirectionError(404, { code: "not_found" }), "notFound");
  assert.equal(classifyDirectionError(400, { code: "validation_failed" }), "validation");
  assert.equal(classifyDirectionError(503, { code: "aif_unavailable" }), "aifUnavailable");
  assert.equal(classifyDirectionError(503, { code: "service_unavailable" }), "unavailable");
  assert.equal(classifyDirectionError(0, null), "unavailable");
});

test("la huella de la dirección cambia con ubicación, ciudad y días de entrega (y solo con eso)", () => {
  const base = addressSignature(saved());
  assert.notEqual(base, addressSignature(saved({ latitude: 9.93 })));
  assert.notEqual(base, addressSignature(saved({ city: "CI002" })));
  assert.notEqual(base, addressSignature(saved({ principalDeliveryDay: 3 })));
  assert.equal(base, addressSignature(saved({ name: "Otro nombre", isPrimary: false }))); // el nombre no afecta precios ni fechas
  assert.equal(addressSignature(null), "");
});

// ---- Render ----

// Doble de los contextos (el render de servidor no tiene proveedores).
const refreshed = [];
stubModule("lib/addresses-context", {
  useAddresses: () => ({ refreshAddresses: async () => { refreshed.push(1); }, addresses: [saved(), saved({ addressId: 1002, name: "Oficina", isPrimary: false })], status: "ready" }),
  useActiveAddress: () => ({ addressId: 1001, setActiveAddressId: () => {}, revision: 3 }),
});
stubModule("lib/auth-context", { useAuth: () => ({ user: { accountNum: "TEST-A", name: "Persona Ejemplo", email: "" } }) });

const AddressFlow = loadFromRoot("components/profile/AddressFlow.tsx").default;
const SavedAddresses = loadFromRoot("components/profile/SavedAddresses.tsx").default;
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);

test("editor: título 'Editar dirección', botón 'Guardar cambios', valores precargados y sin cédula ni compañía", () => {
  const html = renderToHtml(withIntl(React.createElement(AddressFlow, { onClose: () => {}, editing: saved() })));

  assert.match(html, /<h3[^>]*tabindex="-1"[^>]*>Editar dirección<\/h3>/);
  assert.match(text(html), /Guardar cambios/);
  assert.doesNotMatch(text(html), /Guardar dirección/);
  assert.match(html, /<textarea[^>]*>200 m norte de la iglesia, portón negro<\/textarea>/); // señas
  assert.match(html, /value="Casa de prueba"/);                                              // nombre de la dirección
  assert.match(html, /value="Persona Ejemplo"/);                                             // quien recibe
  assert.match(text(html), /Punto fijado: 9\.92810, -84\.09070/);                            // el pin actual
  assert.match(text(html), /Cambiar el punto en el mapa/);
  // lo que NO se puede editar no aparece
  for (const forbidden of [/cédula/i, /name="vat/i, /compañ/i, /dataAreaId/i]) assert.doesNotMatch(html, forbidden);
});

test("crear sigue igual: título 'Datos de la dirección' y botón 'Guardar dirección' (en el paso del mapa)", () => {
  const html = renderToHtml(withIntl(React.createElement(AddressFlow, { onClose: () => {} })));
  assert.match(text(html), /¿Dónde entregamos\?/); // sin dirección a editar se empieza en el mapa
  assert.doesNotMatch(text(html), /Editar dirección/);
});

test("editor en inglés: mismos textos traducidos", () => {
  const html = renderToHtml(withIntl(React.createElement(AddressFlow, { onClose: () => {}, editing: saved() }), "en"));
  assert.match(html, /<h3[^>]*>Edit address<\/h3>/);
  assert.match(text(html), /Save changes/);
  assert.match(text(html), /Change the point on the map/);
});

test("editar una dirección sin ubicación empieza en el mapa (no en un formulario con pin vacío)", () => {
  const html = renderToHtml(withIntl(React.createElement(AddressFlow, { onClose: () => {}, editing: saved({ latitude: 0, longitude: 0 }) })));
  assert.match(text(html), /¿Dónde entregamos\?/);
});

test("lista: un botón 'Editar' por dirección, con nombre accesible que incluye cuál dirección es y FUERA de la tarjeta", () => {
  const html = renderToHtml(withIntl(React.createElement(SavedAddresses, { onAdd: () => {}, onEdit: () => {} })));

  assert.equal([...html.matchAll(/data-address-edit="/g)].length, 2);
  assert.match(html, /aria-label="Editar la dirección Casa de prueba"/);
  assert.match(html, /aria-label="Editar la dirección Oficina"/);
  assert.match(html, /data-address-edit="1001"/);
  assert.match(html, /data-address-edit="1002"/);
  // ningún botón dentro de otro botón (HTML inválido e inaccesible)
  for (const li of html.split("<li").slice(1)) {
    const buttons = [...li.matchAll(/<button[\s>]|<\/button>/g)].map((m) => (m[0].startsWith("</") ? "close" : "open"));
    assert.deepEqual(buttons, ["open", "close", "open", "close"]);
  }
});

test("lista sin onEdit (por ejemplo el selector sin edición): no hay botones 'Editar'", () => {
  const html = renderToHtml(withIntl(React.createElement(SavedAddresses, { onAdd: () => {} })));
  assert.doesNotMatch(html, /data-address-edit/);
});

test("lista en inglés: 'Edit the address {name}'", () => {
  const html = renderToHtml(withIntl(React.createElement(SavedAddresses, { onAdd: () => {}, onEdit: () => {} }), "en"));
  assert.match(html, /aria-label="Edit the address Casa de prueba"/);
  assert.match(text(html), /Edit/);
});

// ---- Comportamiento en el código ----

test("el editor guarda con PUT al id de la dirección, nunca manda cuenta/cédula/compañía y conserva lo escrito al fallar", () => {
  const src = read("components/profile/AddressFlow.tsx");
  assert.match(src, /editing \? `\/api\/directions\/\$\{editing\.addressId\}` : "\/api\/directions"/);
  assert.match(src, /method: editing \? "PUT" : "POST"/);
  const body = src.slice(src.indexOf("body: JSON.stringify({"), src.indexOf("});", src.indexOf("body: JSON.stringify({")));
  assert.doesNotMatch(body, /vat|cedula|account|dataAreaId|company/i);
  // errores: el aviso se muestra y NADA del estado se limpia; no existe -> se vuelve a la lista con aviso
  assert.match(src, /kind === "validation" \? t\("editValidationError"\) : t\("editSaveError"\)/);
  assert.match(src, /if \(kind === "notFound"\) \{[\s\S]{0,200}onClose\("notFound"\)/);
  assert.match(src, /await refreshAddresses\(\);\s*onClose\("saved"\)/);
  assert.doesNotMatch(src.slice(src.indexOf("if (editing) {\n          // Lo escrito"), src.indexOf("setError(res.status === 401")), /setStreet|setFullName|setAddressName|setPinned/);
  // el botón se deshabilita y muestra el indicador mientras guarda
  assert.match(src, /submitting \? t\("saving"\) : editing \? t\("saveChangesCta"\) : t\("saveCta"\)/);
  assert.match(src, /disabled=\{!canSubmit\}/);
});

test("prellenado en cascada: cada nivel usa lo elegido o, si no lo tocó, lo de la dirección guardada; al tocar uno se apaga el de abajo", () => {
  const src = read("components/profile/AddressFlow.tsx");
  assert.match(src, /const provinceId = provinceSel \|\| \(prefillOn\(1\) \? matchOptionId\(provinces\.options, prefill\?\.provinceName\) : ""\)/);
  assert.match(src, /const cantonId = cantonSel \|\| \(prefillOn\(2\)/);
  assert.match(src, /const districtId = districtSel \|\| \(prefillOn\(3\)/);
  assert.match(src, /const cityId = citySel \|\| \(prefillOn\(4\)/);
  for (const level of [1, 2, 3, 4]) assert.match(src, new RegExp(`disablePrefill\\(${level}\\)`));
});

test("foco: al abrir el editor va al título; al guardar o cerrar vuelve al botón 'Editar' de esa dirección; aviso con role=status", () => {
  const flow = read("components/profile/AddressFlow.tsx");
  assert.match(flow, /if \(editing && step === "form"\) titleRef\.current\?\.focus\(\)/);

  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /lastEdited\.current = address\.addressId/);
  assert.match(drawer, /document\.querySelector<HTMLElement>\(`\[data-address-edit="\$\{id\}"\]`\)\?\.focus\(\)/);
  assert.match(drawer, /addressNotice && \(\s*<p\s+role="status"/); // el aviso de éxito se anuncia a lectores de pantalla
  assert.match(drawer, /addresses\.editedNotice/);
  assert.match(drawer, /addresses\.notFoundNotice/);
  assert.match(drawer, /setTimeout\(\(\) => setAddressNotice\(null\), 6000\)/); // aviso breve
  assert.match(drawer, /setEditingAddress\(null\);\s*setAddressNotice\(null\);/); // se reinicia al cerrar el panel
  assert.match(drawer, /!editingAddress && !showingOrders/); // el pie de la cuenta no aparece mientras se edita
});

test("el carrito refleja el cambio: la revisión de direcciones revalida fechas y vista previa, y la fecha elegida se descarta", () => {
  const ctx = read("lib/addresses-context.tsx");
  assert.match(ctx, /revision: s\.revision \+ 1/);
  assert.match(ctx, /return \{ address: activeAddress, addressId: activeAddress\?\.addressId \?\? null, setActiveAddressId, revision \}/);

  assert.match(read("lib/checkout-info.ts"), /`\$\{accountNum\}:\$\{addressId\}:\$\{revision\}`/);
  assert.match(read("lib/order-preview.ts"), /#\$\{attempt\}\.\$\{addressRevision\}/);

  const cart = read("components/cart/CartDrawer.tsx");
  assert.match(cart, /chosenDate\.revision === addressRevision/);
  assert.match(cart, /useOrderPreview\(\{ cartItems: items, addressId, addressRevision,/);
});

test("la ruta PUT: sin sesión 401 antes de llamar, id validado, sin caché, sin registrar el cuerpo y sin cuenta/cédula/compañía en lo que reenvía", () => {
  const route = read("app/api/directions/[id]/route.ts");
  assert.ok(route.indexOf("sessionGate(") < route.indexOf("fetch("), "401 sin sesión (sessionGate) antes de llamar a mercasa-api");
  assert.match(route, /isValidAddressId\(id\)/);
  assert.match(route, /method: "PUT"/);
  assert.match(route, /cache: "no-store"/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /aif_unavailable/);
  assert.doesNotMatch(route, /console\.(log|info|warn|error)\([^)]*(data|body|latitude|longitude|street|fullName)/);
  const forwarded = route.slice(route.indexOf("body: JSON.stringify({"), route.indexOf("cache:", route.indexOf("body: JSON.stringify({")));
  assert.doesNotMatch(forwarded, /vat|cedula|account|dataAreaId|company/i);
});

// ---- Llaves de mensajes ----

const keysOf = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keysOf(v, `${p}${k}.`) : [`${p}${k}`]));
const lookup = (lang, ns, key) => `${ns}.${key}`.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), messages[lang]);

test("llaves de direcciones iguales en es y en, y todas las que usa el código resuelven (sin llaves sin resolver)", () => {
  assert.deepEqual(keysOf(messages.es.Profile.addresses).sort(), keysOf(messages.en.Profile.addresses).sort());
  assert.deepEqual(keysOf(messages.es.Profile.address).sort(), keysOf(messages.en.Profile.address).sort());

  const used = [
    ["Profile.address", read("components/profile/AddressFlow.tsx")],
    ["Profile.addresses", read("components/profile/SavedAddresses.tsx")],
  ];
  const missing = [];
  for (const [ns, src] of used) {
    for (const m of src.matchAll(/\bt\("([^"]+)"/g)) {
      for (const lang of ["es", "en"]) {
        const value = lookup(lang, ns, m[1]);
        if (typeof value !== "string" || !value.trim()) missing.push(`${lang}: ${ns}.${m[1]}`);
      }
    }
  }
  // textos del aviso, que el panel pide con el namespace Profile
  for (const key of ["addresses.editedNotice", "addresses.notFoundNotice"]) {
    for (const lang of ["es", "en"]) if (!lookup(lang, "Profile", key)?.trim()) missing.push(`${lang}: Profile.${key}`);
  }
  assert.deepEqual(missing, []);

  assert.equal(messages.es.Profile.address.editTitle, "Editar dirección");
  assert.equal(messages.es.Profile.address.saveChangesCta, "Guardar cambios");
  assert.equal(messages.es.Profile.address.editSaveError, "No pudimos guardar los cambios ahora. Intentá de nuevo en unos minutos.");
});
