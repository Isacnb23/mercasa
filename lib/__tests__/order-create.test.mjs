// Crear el pedido desde el checkout: cuerpo estricto sin precios ni cuenta, requestId por pantalla de pago y en reintentos, lectura
// de cada respuesta (201, 202, 400 conocidos, 503, timeout, red), reenvío al servidor con un fetch simulado, textos en es/en y
// garantías de seguridad en el código. NADA contra mercasa-api, homex-api, AX ni el bridge reales. Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, stubModule, React } from "./helpers/load-tsx.mjs";
import { parseOrderPreview } from "../order-logic.ts";

// Los módulos de lib/order-create*.ts se cargan con el cargador de pruebas (resuelve los imports entre archivos).
const {
  KNOWN_ORDER_CODES,
  MAX_NOTES_LENGTH,
  ORDER_CLIENT_TIMEOUT_MS,
  ORDER_PROXY_TIMEOUT_MS,
  buildCreateOrderBody,
  buildCreateOrderContent,
  classifyCreateResponse,
  createOrderContentKey,
  errorMessageKey,
  isAmbiguousFailure,
  isRequestId,
  lineErrorMessageKey,
  newRequestId,
  resolveRequestId,
  sanitizeCreateOrderBody,
  sanitizeNotes,
} = loadFromRoot("lib/order-create.ts");
const { forwardOrderCreate } = loadFromRoot("lib/order-create-upstream.ts");
const { submitOrder } = loadFromRoot("lib/order-submit.ts");

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const RID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const cart = [
  // Un ítem del carrito trae mucho más que lo que sale: nombre, precio, imagen...
  { id: "ART001", name: "Producto de prueba", price: 1234, image: "x.png", quantity: 2, unitId: "CAJA", channel: "delivery" },
  { id: "ART002", name: "Otro", quantity: 1, channel: "delivery" },
];
const selection = { addressId: 7, deliveryDate: "2026-10-19", paymentMethod: "sinpe", pickupSiteId: null };

// ---------------------------------------------------------------------------------------------------------------
// Cuerpo
// ---------------------------------------------------------------------------------------------------------------

test("el cuerpo lleva solo ids, presentación, cantidad y selecciones: ni precios, ni totales, ni cuenta", () => {
  const content = buildCreateOrderContent(cart, selection, "  Portón azul  ");
  const body = buildCreateOrderBody(content, RID);

  assert.deepEqual(body, {
    requestId: RID,
    paymentMethod: "sinpe",
    notes: "Portón azul",
    addressId: 7,
    deliveryDate: "2026-10-19",
    items: [
      { itemId: "ART001", unitId: "CAJA", quantity: 2 },
      { itemId: "ART002", quantity: 1 },
    ],
  });
  const json = JSON.stringify(body);
  for (const forbidden of ["price", "name", "image", "total", "tax", "discount", "account", "customer", "cedula", "Producto"]) {
    assert.ok(!json.toLowerCase().includes(forbidden.toLowerCase()), `no debe salir "${forbidden}"`);
  }
});

test("sin notas no se manda el campo; faltan método de pago, dirección o fecha: no se arma el cuerpo", () => {
  assert.equal("notes" in buildCreateOrderContent(cart, selection, "   "), false);
  assert.equal(buildCreateOrderContent(cart, { ...selection, paymentMethod: null }), null);
  assert.equal(buildCreateOrderContent(cart, { ...selection, addressId: null }), null);
  assert.equal(buildCreateOrderContent(cart, { ...selection, deliveryDate: null }), null);
});

test("con retiro en tienda se manda el grupo para que el servidor diga que todavía no se puede (no se pierde en silencio)", () => {
  const mixed = [...cart, { id: "P1", quantity: 3, channel: "pickup" }];
  const content = buildCreateOrderContent(mixed, { ...selection, pickupSiteId: "CCA" });

  assert.equal(content.pickup.siteId, "CCA");
  assert.deepEqual(content.pickup.lines, [{ itemId: "P1", quantity: 3 }]);
  assert.equal(content.delivery.addressId, 7);
  assert.equal("items" in content, false);
  assert.equal(buildCreateOrderContent(mixed, { ...selection, pickupSiteId: null }), null);
});

test("notas: se limpian los caracteres de control y los espacios sobrantes", () => {
  assert.equal(sanitizeNotes("  Portón \u0007azul\u0000\r\n\t  frente   al parque  "), "Portón azul frente al parque");
  assert.equal(sanitizeNotes(" \r\n "), undefined);
  assert.equal(sanitizeNotes(null), undefined);
  assert.equal(MAX_NOTES_LENGTH, 250);
});

// ---------------------------------------------------------------------------------------------------------------
// Ruta de servidor: cuerpo estricto
// ---------------------------------------------------------------------------------------------------------------

const validBody = () => buildCreateOrderBody(buildCreateOrderContent(cart, selection, "hola"), RID);

test("la ruta acepta el cuerpo válido (forma plana) y lo devuelve limpio", () => {
  const clean = sanitizeCreateOrderBody({ ...validBody(), requestId: RID.toUpperCase() });

  assert.equal(clean.requestId, RID); // en minúscula
  assert.equal(clean.addressId, 7);
  assert.equal(clean.items.length, 2);
  assert.equal(clean.notes, "hola");
});

test("la ruta rechaza CUALQUIER campo desconocido: precios, totales, impuestos, cuenta...", () => {
  for (const field of ["unitPrice", "price", "total", "ttlOrdr", "tax", "discount", "subtotal", "account", "accountNum", "customerId", "cedula", "slsId", "minimumAmount", "extra"]) {
    assert.equal(sanitizeCreateOrderBody({ ...validBody(), [field]: 1 }), null, field);
  }
  for (const field of ["unitPrice", "price", "lineTotal", "tax", "name"]) {
    const body = validBody();
    body.items[0] = { ...body.items[0], [field]: 1 };
    assert.equal(sanitizeCreateOrderBody(body), null, `línea.${field}`);
  }
});

test("la ruta rechaza requestId, fecha, método de pago, cantidades y largos inválidos", () => {
  const bad = (change) => assert.equal(sanitizeCreateOrderBody({ ...validBody(), ...change }), null);
  for (const requestId of [undefined, "", "no-es-un-guid", "00000000-0000-0000-0000-000000000000", 5, null]) bad({ requestId });
  for (const deliveryDate of [undefined, "", "19/10/2026", "2026-10-19T00:00:00", 5]) bad({ deliveryDate });
  for (const paymentMethod of [undefined, "", "cheque", "tarjeta", 5]) bad({ paymentMethod });
  bad({ addressId: 0 });
  bad({ addressId: "7" });
  bad({ notes: "n".repeat(MAX_NOTES_LENGTH + 1) });
  bad({ notes: 5 });
  bad({ items: [] });
  bad({ items: Array.from({ length: 101 }, (_, i) => ({ itemId: `I${i}`, quantity: 1 })) });
  bad({ items: [{ itemId: "A", quantity: 0 }] });
  bad({ items: [{ itemId: "A", quantity: 10000 }] });
  bad({ items: [{ itemId: "A", quantity: 1.5 }] });
  bad({ items: [{ itemId: "A\u0007B", quantity: 1 }] });
  bad({ items: [{ itemId: "A".repeat(51), quantity: 1 }] });
  assert.equal(sanitizeCreateOrderBody(null), null);
  assert.equal(sanitizeCreateOrderBody([]), null);
  assert.equal(sanitizeCreateOrderBody("texto"), null);
});

test("notas: se limpian en la ruta y se aceptan exactamente 250 caracteres", () => {
  assert.equal(sanitizeCreateOrderBody({ ...validBody(), notes: "a\u0007b\r\nc" }).notes, "a b c");
  assert.equal(sanitizeCreateOrderBody({ ...validBody(), notes: "n".repeat(250) }).notes.length, 250);
  assert.equal("notes" in sanitizeCreateOrderBody({ ...validBody(), notes: " \r\n " }), false);
});

test("la forma por grupos con retiro se acepta (el servidor responde pickup_not_supported) y no se puede mezclar con la plana", () => {
  const grouped = buildCreateOrderBody(buildCreateOrderContent([...cart, { id: "P1", quantity: 1, channel: "pickup" }], { ...selection, pickupSiteId: "CCA" }), RID);
  const clean = sanitizeCreateOrderBody(grouped);
  assert.equal(clean.pickup.siteId, "CCA");
  assert.equal(clean.delivery.deliveryDate, "2026-10-19");

  assert.equal(sanitizeCreateOrderBody({ ...grouped, addressId: 7 }), null);
  assert.equal(sanitizeCreateOrderBody({ requestId: RID, paymentMethod: "sinpe" }), null); // sin nada que pedir
  assert.equal(sanitizeCreateOrderBody({ ...grouped, pickup: { siteId: "CCA", lines: [{ itemId: "P", quantity: 1 }], extra: 1 } }), null);
});

// ---------------------------------------------------------------------------------------------------------------
// requestId
// ---------------------------------------------------------------------------------------------------------------

test("requestId: GUID válido y distinto cada vez", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.ok(isRequestId(a));
  assert.notEqual(a, b);
  assert.equal(isRequestId("no-es-guid"), false);
});

test("requestId: nuevo por pantalla de pago, el MISMO en reintentos de la misma confirmación, nuevo si cambió el contenido", () => {
  let n = 0;
  const generate = () => `id-${++n}`;
  const key = createOrderContentKey(buildCreateOrderContent(cart, selection, null));

  const first = resolveRequestId(null, key, generate); // pantalla de pago recién abierta
  assert.equal(first.id, "id-1");
  assert.equal(resolveRequestId(first, key, generate).id, "id-1"); // reintento por timeout o red
  assert.equal(resolveRequestId(first, key, generate).id, "id-1"); // otro más
  assert.equal(n, 1);

  const changed = createOrderContentKey(buildCreateOrderContent(cart, { ...selection, deliveryDate: "2026-10-26" }, null));
  assert.equal(resolveRequestId(first, changed, generate).id, "id-2"); // otro contenido: otro pedido
  assert.equal(resolveRequestId(null, key, generate).id, "id-3"); // pantalla de pago nueva
});

test("requestId: CartDrawer lo descarta al abrir el pago y tras un envío exitoso, y evita dos envíos simultáneos", () => {
  const src = read("components/cart/CartDrawer.tsx");
  assert.match(src, /if \(target === "payment" && step !== "summary"\) requestIdRef\.current = null;/);
  assert.match(src, /requestIdRef\.current = resolveRequestId\(requestIdRef\.current, createOrderContentKey\(content\)\);/);
  assert.match(src, /if \(result\.ok\) \{\s*requestIdRef\.current = null;/);
  assert.match(src, /if \(submittingRef\.current \|\| submit\.status === "sending"\) return;/);
  assert.match(src, /submittingRef\.current = true;/);
  assert.match(src, /submittingRef\.current = false;/);
  // El botón se deshabilita mientras la petición está en curso.
  assert.match(src, /disabled=\{!preview\?\.canOrder \|\| order\.stale \|\| !termsAccepted \|\| submit\.status === "sending"\}/);
  // El carrito solo se vacía al terminar ("Listo"), nunca ante un error.
  const confirm = src.slice(src.indexOf("const confirm = async"), src.indexOf("const openOrders"));
  assert.doesNotMatch(confirm, /clear\(\)/);
});

// ---------------------------------------------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------------------------------------------

test("201 y 202 se leen como pedido recibido, con número solo si trae un formato válido", () => {
  assert.deepEqual(classifyCreateResponse(201, { status: "created", orderNumber: "WEB-000000000001", message: "x" }), { ok: true, kind: "created", orderNumber: "WEB-000000000001" });
  assert.deepEqual(classifyCreateResponse(202, { status: "received", orderNumber: "WEB-1" }), { ok: true, kind: "received", orderNumber: "WEB-1" });
  assert.deepEqual(classifyCreateResponse(202, { status: "processing" }), { ok: true, kind: "processing", orderNumber: null });
  assert.deepEqual(classifyCreateResponse(202, {}), { ok: true, kind: "received", orderNumber: null });
  assert.equal(classifyCreateResponse(201, { orderNumber: "<script>" }).orderNumber, null);
  assert.equal(classifyCreateResponse(201, null).ok, true);
});

test("cada 400 conocido conserva su código; uno desconocido es invalid_request; order_invalid trae solo códigos de línea", () => {
  for (const code of ["min_total_not_met", "payment_method_not_allowed", "pickup_not_supported", "delivery_coordination_not_supported", "delivery_route_missing", "invalid_request", "invalid_request_id"]) {
    assert.deepEqual(classifyCreateResponse(400, { code }), { ok: false, code });
  }
  assert.equal(classifyCreateResponse(400, { code: "algo_interno" }).code, "invalid_request");
  assert.equal(classifyCreateResponse(400, null).code, "invalid_request");
  assert.equal(classifyCreateResponse(400, { code: "service_unavailable" }).code, "invalid_request");

  const invalid = classifyCreateResponse(400, { code: "order_invalid", errors: [{ code: "insufficient_stock", itemId: "A" }, { code: "BAD CODE" }, { code: 5 }, null] });
  assert.deepEqual(invalid, { ok: false, code: "order_invalid", errors: ["insufficient_stock"] });
});

test("401, 404, 429, 503, 504 y lo inesperado", () => {
  assert.deepEqual(classifyCreateResponse(401, {}), { ok: false, code: "session" });
  assert.deepEqual(classifyCreateResponse(404, {}), { ok: false, code: "address_not_found" });
  assert.deepEqual(classifyCreateResponse(429, {}), { ok: false, code: "rate_limited" });
  assert.deepEqual(classifyCreateResponse(504, { code: "order_timeout" }), { ok: false, code: "order_timeout" });
  for (const code of ["ordering_disabled", "ordering_not_available", "order_busy", "order_unavailable", "service_unavailable"]) {
    assert.deepEqual(classifyCreateResponse(503, { code }), { ok: false, code });
  }
  assert.equal(classifyCreateResponse(503, { code: "raro" }).code, "service_unavailable");
  assert.equal(classifyCreateResponse(503, null).code, "service_unavailable");
  assert.equal(classifyCreateResponse(500, {}).code, "unknown");
  assert.equal(isAmbiguousFailure("order_timeout"), true);
  assert.equal(isAmbiguousFailure("service_unavailable"), false);
});

test("pedidos apagados en homex-api: 503 ordering_disabled / ordering_not_available llegan tal cual a la pantalla", () => {
  assert.equal(classifyCreateResponse(503, { code: "ordering_disabled" }).code, "ordering_disabled");
  assert.equal(classifyCreateResponse(503, { code: "ordering_not_available" }).code, "ordering_not_available");
  const drawer = read("components/cart/CartDrawer.tsx");
  assert.match(drawer, /submit\.code === "ordering_disabled" \|\| submit\.code === "ordering_not_available"/);
});

// ---------------------------------------------------------------------------------------------------------------
// submitOrder (cliente)
// ---------------------------------------------------------------------------------------------------------------

const fakeFetch = (respond) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  fn.calls = calls;
  return fn;
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("submitOrder manda el cuerpo estricto por POST a nuestra ruta, con requestId y sin precios", async () => {
  const fetchFn = fakeFetch(() => json(201, { status: "created", orderNumber: "WEB-1" }));
  const body = validBody();

  const result = await submitOrder(body, fetchFn);

  assert.deepEqual(result, { ok: true, kind: "created", orderNumber: "WEB-1" });
  const [{ url, init }] = fetchFn.calls;
  assert.equal(url, "/api/checkout/order");
  assert.equal(init.method, "POST");
  assert.equal(init.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(init.body).requestId, RID);
  assert.ok(init.signal, "con tiempo de espera del navegador");
  assert.ok(ORDER_CLIENT_TIMEOUT_MS > ORDER_PROXY_TIMEOUT_MS);
});

test("submitOrder: un timeout es order_timeout y una caída de red es service_unavailable; el reintento viaja con el MISMO requestId", async () => {
  const timeout = fakeFetch(() => {
    const error = new Error("timeout");
    error.name = "TimeoutError";
    throw error;
  });
  assert.deepEqual(await submitOrder(validBody(), timeout), { ok: false, code: "order_timeout" });

  const network = fakeFetch(() => {
    throw new TypeError("fetch failed");
  });
  assert.deepEqual(await submitOrder(validBody(), network), { ok: false, code: "service_unavailable" });

  // Primer intento con timeout, segundo con éxito: mismo requestId (lo decide resolveRequestId con el mismo contenido).
  const content = buildCreateOrderContent(cart, selection, null);
  const key = createOrderContentKey(content);
  const state1 = resolveRequestId(null, key);
  let first = true;
  const fetchFn = fakeFetch(() => {
    if (first) {
      first = false;
      const error = new Error("timeout");
      error.name = "TimeoutError";
      throw error;
    }
    return json(202, { status: "received" });
  });
  assert.equal((await submitOrder(buildCreateOrderBody(content, state1.id), fetchFn)).ok, false);
  const state2 = resolveRequestId(state1, key);
  assert.equal((await submitOrder(buildCreateOrderBody(content, state2.id), fetchFn)).ok, true);
  assert.equal(JSON.parse(fetchFn.calls[0].init.body).requestId, JSON.parse(fetchFn.calls[1].init.body).requestId);
});

test("submitOrder: cada estado HTTP de la ruta se traduce", async () => {
  const cases = [
    [202, { status: "received" }, { ok: true, kind: "received", orderNumber: null }],
    [400, { code: "min_total_not_met" }, { ok: false, code: "min_total_not_met" }],
    [401, {}, { ok: false, code: "session" }],
    [404, {}, { ok: false, code: "address_not_found" }],
    [429, {}, { ok: false, code: "rate_limited" }],
    [503, { code: "ordering_disabled" }, { ok: false, code: "ordering_disabled" }],
    [504, { code: "order_timeout" }, { ok: false, code: "order_timeout" }],
  ];
  for (const [status, body, expected] of cases) {
    assert.deepEqual(await submitOrder(validBody(), fakeFetch(() => json(status, body))), expected, String(status));
  }
  // Cuerpo que no es JSON: no revienta.
  assert.equal((await submitOrder(validBody(), fakeFetch(() => new Response("<html>", { status: 502 })))).ok, false);
});

// ---------------------------------------------------------------------------------------------------------------
// Reenvío al servidor (forwardOrderCreate): mapeo y tiempo de espera
// ---------------------------------------------------------------------------------------------------------------

const deps = (fetchFn, over = {}) => ({ token: "jwt-secreto", apiBase: "http://api.test", apiKey: "clave-secreta", fetchFn, ...over });

test("reenvío: URL, JWT y clave de servidor; el cuerpo sale tal cual (ya validado) y la respuesta 201/202 se filtra", async () => {
  const fetchFn = fakeFetch(() => json(201, { status: "created", orderNumber: "WEB-1", slsId: "WEB-1", message: "Pedido recibido; pendiente de verificación de pago", interno: "x" }));
  const reply = await forwardOrderCreate(validBody(), deps(fetchFn));

  const [{ url, init }] = fetchFn.calls;
  assert.equal(url, "http://api.test/api/customer/order");
  assert.equal(init.headers.Authorization, "Bearer jwt-secreto");
  assert.equal(init.headers["X-Api-Key"], "clave-secreta");
  assert.equal(JSON.parse(init.body).requestId, RID);
  assert.equal(init.cache, "no-store");

  assert.equal(reply.status, 201);
  assert.deepEqual(reply.body, { status: "created", orderNumber: "WEB-1", message: "Pedido recibido; pendiente de verificación de pago" }); // sin slsId ni campos internos
  assert.equal((await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(202, { status: "processing" }))))).status, 202);
});

test("reenvío: 400 conserva el code conocido y los errors de línea; el mensaje interno no sale", async () => {
  const reply = await forwardOrderCreate(
    validBody(),
    deps(fakeFetch(() => json(400, { error: "detalle interno de AX", code: "order_invalid", errors: [{ Code: "x" }, { code: "insufficient_stock", itemId: "A", Message: "texto interno" }] }))),
  );

  assert.equal(reply.status, 400);
  assert.deepEqual(reply.body, { error: "Solicitud inválida.", code: "order_invalid", errors: [{ code: "insufficient_stock", itemId: "A" }] });
  assert.doesNotMatch(JSON.stringify(reply.body), /interno|AX/);

  const unknown = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(400, { error: "mensaje", code: "algo_raro" }))));
  assert.equal(unknown.body.code, "invalid_request");
  for (const code of ["min_total_not_met", "payment_method_not_allowed", "pickup_not_supported", "delivery_coordination_not_supported", "delivery_route_missing"]) {
    assert.equal((await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(400, { code }))))).body.code, code);
  }
});

test("reenvío: 401, 404, 429 con Retry-After, 5xx y 503 conservando solo códigos conocidos", async () => {
  assert.equal((await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(401, {}))))).status, 401);
  assert.equal((await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(404, {}))))).status, 404);

  const limited = await forwardOrderCreate(validBody(), deps(fakeFetch(() => new Response("{}", { status: 429, headers: { "Retry-After": "42" } }))));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["Retry-After"], "42");
  const noHeader = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(429, {}))));
  assert.equal(noHeader.headers["Retry-After"], "5");
  const weird = await forwardOrderCreate(validBody(), deps(fakeFetch(() => new Response("{}", { status: 429, headers: { "Retry-After": "abc" } }))));
  assert.equal(weird.headers["Retry-After"], "5");

  for (const code of ["ordering_disabled", "ordering_not_available", "order_busy", "order_unavailable"]) {
    const reply = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(503, { code }))));
    assert.deepEqual([reply.status, reply.body.code], [503, code]);
  }
  const raro = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(503, { code: "detalle_interno" }))));
  assert.equal(raro.body.code, "service_unavailable");
  const fivehundred = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(502, { code: "order_failed", message: "AX falló" }))));
  assert.deepEqual([fivehundred.status, fivehundred.body.code], [503, "service_unavailable"]);
  assert.doesNotMatch(JSON.stringify(fivehundred.body), /AX falló|order_failed/);
});

test("reenvío: red caída y configuración faltante son 503 service_unavailable; el log solo trae el tipo de falla", async () => {
  const logs = [];
  const down = await forwardOrderCreate(
    validBody(),
    deps(fakeFetch(() => { throw new TypeError("fallo con jwt-secreto y WEB-1"); }), { log: (m) => logs.push(m) }),
  );
  assert.deepEqual([down.status, down.body.code], [503, "service_unavailable"]);

  const noConfig = await forwardOrderCreate(validBody(), deps(fakeFetch(() => json(201, {})), { apiBase: undefined, log: (m) => logs.push(m) }));
  assert.equal(noConfig.status, 503);

  const logged = logs.join("\n");
  for (const forbidden of ["jwt-secreto", "clave-secreta", "WEB-1", "ART001", RID, "Portón"]) assert.ok(!logged.includes(forbidden), forbidden);
});

test("reenvío: el tiempo de espera es de 60 s y al vencer responde 504 order_timeout (el pedido pudo haber salido)", async () => {
  assert.equal(ORDER_PROXY_TIMEOUT_MS, 60_000);
  assert.ok(ORDER_PROXY_TIMEOUT_MS > 45_000, "mayor que la espera de mercasa-api");

  // Por defecto se usa la señal de 60 s: no está vencida.
  let signal;
  await forwardOrderCreate(validBody(), deps(fakeFetch((_u, init) => { signal = init.signal; return json(202, {}); })));
  assert.equal(signal.aborted, false);

  // Con un tiempo corto de prueba, un fetch que nunca contesta se aborta y se traduce a 504.
  const hang = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  const reply = await forwardOrderCreate(validBody(), deps(hang, { timeoutMs: 30 }));
  assert.equal(reply.status, 504);
  assert.equal(reply.body.code, "order_timeout");
  assert.equal(classifyCreateResponse(reply.status, reply.body).code, "order_timeout");
});

test("el tiempo de 60 s es SOLO del pedido: los demás endpoints del proxy conservan sus tiempos", () => {
  const proxy = read("lib/checkout-proxy.ts");
  assert.equal([...proxy.matchAll(/AbortSignal\.timeout\(15_000\)/g)].length, 1); // GET
  assert.equal([...proxy.matchAll(/AbortSignal\.timeout\(25_000\)/g)].length, 1); // POST de validar y de precios
  assert.doesNotMatch(proxy, /AbortSignal\.timeout\(60_000\)/); // el 60 s vive en order-create.ts
  assert.match(proxy, /export async function proxyOrderCreate/);
  assert.match(read("lib/order-create-upstream.ts"), /AbortSignal\.timeout\(deps\.timeoutMs \?\? ORDER_PROXY_TIMEOUT_MS\)/);
  // Validar y precios siguen usando proxyCustomerPost (25 s); solo el pedido usa proxyOrderCreate.
  assert.match(read("app/api/checkout/order/validate/route.ts"), /proxyCustomerPost/);
  assert.match(read("app/api/catalog/prices/route.ts"), /proxyCustomerPost/);
  assert.match(read("app/api/checkout/order/route.ts"), /proxyOrderCreate\(body, "order-create"\)/);
});

test("la ruta valida de forma estricta, pide sesión y no registra cuerpos ni datos del cliente", () => {
  const route = read("app/api/checkout/order/route.ts");
  assert.match(route, /sanitizeCreateOrderBody\(raw\)/);
  assert.match(route, /status: 401/);
  assert.doesNotMatch(route, /console\./);

  for (const file of ["lib/order-create.ts", "lib/order-create-upstream.ts", "lib/order-submit.ts", "app/api/checkout/order/route.ts", "components/cart/ConfirmStep.tsx"]) {
    const src = read(file);
    assert.doesNotMatch(src, /console\.(log|info|debug)\(/, file);
    assert.doesNotMatch(src, /localStorage|sessionStorage/, file);
  }
  // Los registros del proxy de pedido reciben solo el tipo de falla.
  const proxy = read("lib/checkout-proxy.ts");
  assert.match(proxy, /log: \(message\) => console\.error\(`\[\$\{logTag\}\] \$\{message\}`\)/);
});

test("el Retry-After de 429 en los demás endpoints ya es un número (antes la expresión no coincidía nunca)", () => {
  assert.match(read("lib/checkout-proxy.ts"), /\/\^\\d\+\$\/\.test\(retryAfter\)/);
});

// ---------------------------------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------------------------------

test("cada código tiene un texto propio en español e inglés y nunca se muestra el código crudo", () => {
  const raw = [];
  for (const locale of ["es", "en"]) {
    for (const code of KNOWN_ORDER_CODES) {
      const key = errorMessageKey(code);
      const value = messages[locale].Cart.order[key];
      assert.equal(typeof value, "string", `${locale}.${key}`);
      assert.ok(value.length > 10);
      if (key !== "sessionExpired") raw.push(value);
      if (code !== "session") assert.ok(!value.includes(code), `el texto de ${code} no debe llevar el código crudo`);
    }
    for (const code of ["item_not_found", "item_unavailable", "insufficient_stock", "invalid_quantity", "unit_not_available", "price_not_available", "pickup_not_available", "price_list_missing", "delivery_date_invalid", "delivery_date_required"]) {
      const key = lineErrorMessageKey(code);
      assert.equal(typeof messages[locale].Cart.order[key], "string", `${locale}.${key}`);
    }
  }
  assert.equal(lineErrorMessageKey("algo_interno"), null);
  assert.equal(errorMessageKey("unknown"), "createUnavailable");
});

test("los mensajes pedidos están: recibido pendiente de verificación, no disponible y verificando tu pedido", () => {
  const es = messages.es.Cart.order;
  assert.equal(es.successPending, "Pedido recibido; pendiente de verificación de pago");
  assert.match(es.createUnavailable, /Intentá de nuevo en unos minutos/);
  assert.match(es.createTimeout, /Estamos verificando tu pedido/);
  assert.match(es.createTimeout, /Mis pedidos/);
  assert.match(es.createMinTotal, /monto mínimo/);
  assert.match(es.createPickupNotSupported, /retiro en tienda todavía no está disponible/i);
  assert.match(es.createCoordination, /zona se coordina/);
  assert.match(es.createRouteMissing, /ruta de entrega/);
  assert.doesNotMatch(JSON.stringify([es.successPending, es.successBody, es.successProcessingBody]), /confirmad/i);
  assert.deepEqual(Object.keys(messages.es.Cart.order).sort(), Object.keys(messages.en.Cart.order).sort());
});

// ---------------------------------------------------------------------------------------------------------------
// Pantalla de confirmación y errores (render)
// ---------------------------------------------------------------------------------------------------------------

stubModule("i18n/navigation", { Link: (props) => React.createElement("a", props) });
const ConfirmStep = loadFromRoot("components/cart/ConfirmStep.tsx").default;
const withIntl = (element, locale = "es") => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const totals = (subtotal, tax) => ({ subtotal, discount: 0, tax, total: subtotal + tax });
const lines = [{ itemId: "A", name: "Producto A", unitId: "UND", factor: 1, quantity: 2, unitPrice: 1000, discount: 0, tax: 260, lineTotal: 2260, available: true, maxAvailable: 9 }];
const preview = parseOrderPreview({
  lines, totals: totals(2000, 260), freight: null, freightPending: true, minimumAmount: 30000, belowMinimum: false, shortfall: 0,
  delivery: { date: "2026-10-19", valid: true, requiresCoordination: false }, canOrder: true, errors: [],
  deliveryGroup: { lines, totals: totals(2000, 260), minimumAmount: 30000, belowMinimum: false, shortfall: 0, canOrder: true, errors: [] },
  pickupGroup: null, grandTotals: totals(2000, 260),
});

const render = (submit, over = {}, locale = "es") =>
  renderToHtml(
    withIntl(
      React.createElement(ConfirmStep, {
        preview, stale: false, deliveryDate: "2026-10-19", paymentMethod: "sinpe", termsAccepted: false, onTermsChange: () => {}, submit,
        notes: "", onNotesChange: () => {}, onOpenOrders: () => {}, contactHref: "https://wa.me/50600000000", ...over,
      }),
      locale,
    ),
  );

test("confirmación 201/202: pedido recibido, pendiente de verificación de pago, número, tiempos y Mis pedidos; jamás 'confirmado'", () => {
  for (const kind of ["created", "received"]) {
    const html = text(render({ status: "done", kind, orderNumber: "WEB-000000000001" }));
    assert.match(html, /¡Pedido recibido!/);
    assert.match(html, /Pedido N\.° WEB-000000000001/);
    assert.match(html, /Pedido recibido; pendiente de verificación de pago/);
    assert.match(html, /personal de Mercasa verifica tu pago antes de confirmarlo/);
    assert.match(html, /Normalmente entra en nuestro sistema en segundos o en unos pocos minutos; a veces puede tardar horas/);
    assert.match(html, /Lo vas a ver en Mis pedidos cuando ya esté registrado/);
    assert.doesNotMatch(html, /pedido (ha sido )?confirmado|Tu pedido está confirmado/i);
  }
  assert.match(text(render({ status: "done", kind: "processing", orderNumber: null })), /Estamos procesando tu pedido/);
  assert.doesNotMatch(text(render({ status: "done", kind: "received", orderNumber: null })), /Pedido N\./); // sin número no se inventa
});

test("confirmación: datos del comprobante de Sinpe o transferencia = los de los mensajes; si no hay, texto neutro (nada inventado)", () => {
  const sinpe = text(render({ status: "done", kind: "received", orderNumber: null }, { paymentMethod: "sinpe" }));
  const transfer = text(render({ status: "done", kind: "received", orderNumber: null }, { paymentMethod: "transfer" }));
  for (const html of [sinpe, transfer]) {
    assert.match(html, /Te enviaremos los datos de pago y cómo mandar tu comprobante/);
    assert.doesNotMatch(html, /\d{4}-?\d{4}|IBAN|CR\d{2}/); // ningún número de cuenta o teléfono inventado
  }

  const withData = { ...messages.es, Cart: { ...messages.es.Cart, order: { ...messages.es.Cart.order, sinpeInstructions: "Enviá el comprobante al número de prueba" } } };
  const html = text(renderToHtml(React.createElement(NextIntlClientProvider, { locale: "es", messages: withData }, React.createElement(ConfirmStep, {
    preview, stale: false, deliveryDate: "2026-10-19", paymentMethod: "sinpe", termsAccepted: false, onTermsChange: () => {},
    submit: { status: "done", kind: "received", orderNumber: null }, notes: "", onNotesChange: () => {}, onOpenOrders: () => {}, contactHref: "#",
  }))));
  assert.match(html, /Enviá el comprobante al número de prueba/);
  assert.doesNotMatch(html, /Te enviaremos los datos de pago y cómo mandar/);
});

test("cada 400 conocido se muestra con su texto claro; nunca el código ni mensajes internos", () => {
  const expected = {
    min_total_not_met: /no alcanza el monto mínimo/,
    payment_method_not_allowed: /método de pago no está disponible/,
    pickup_not_supported: /retiro en tienda todavía no está disponible/,
    delivery_coordination_not_supported: /zona se coordina con servicio al cliente/,
    delivery_route_missing: /no tiene una ruta de entrega/,
    invalid_request: /No pudimos enviar tu pedido/,
    rate_limited: /varios intentos seguidos/,
    order_busy: /procesando otro pedido/,
    address_not_found: /No encontramos esa dirección/,
    service_unavailable: /Intentá de nuevo en unos minutos/,
    order_unavailable: /Intentá de nuevo en unos minutos/,
    unknown: /Intentá de nuevo en unos minutos/,
  };
  for (const [code, pattern] of Object.entries(expected)) {
    const html = text(render({ status: "error", code }));
    assert.match(html, pattern, code);
    assert.ok(!html.includes(code), `no debe mostrar el código crudo ${code}`);
    assert.match(render({ status: "error", code }), /role="alert"/);
  }
  assert.match(text(render({ status: "error", code: "session" })), /sesión venció/);
});

test("order_invalid explica cada error de línea con texto propio, sin repetir ni mostrar códigos", () => {
  const html = text(render({ status: "error", code: "order_invalid", errors: ["insufficient_stock", "item_unavailable", "unit_not_available", "algo_interno"] }));

  assert.match(html, /Revisá tu pedido: hay productos o datos que corregir/);
  assert.equal([...html.matchAll(/No disponible/g)].length, 1); // insufficient_stock e item_unavailable comparten texto
  assert.match(html, /Presentación no disponible/);
  assert.doesNotMatch(html, /insufficient_stock|item_unavailable|algo_interno/);
});

test("timeout: 'Estamos verificando tu pedido', con Mis pedidos y WhatsApp, y sin invitar a reintentar a ciegas", () => {
  const html = render({ status: "error", code: "order_timeout" });
  const plain = text(html);

  assert.match(plain, /Estamos verificando tu pedido\. Revisalo en Mis pedidos o contactanos antes de volver a enviarlo/);
  assert.match(plain, /Ver Mis pedidos/);
  assert.match(html, /href="https:\/\/wa\.me\/50600000000"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.doesNotMatch(plain, /intentá de nuevo|volvé a intentar|reintent/i);
  assert.doesNotMatch(plain, /No pudimos enviar tu pedido/);
});

test("apagado: el estado ordering_disabled sigue mostrando 'no habilitado' sin romperse (el pie ofrece la cotización por WhatsApp)", () => {
  const html = text(render({ status: "error", code: "ordering_disabled" }));
  assert.match(html, /Los pedidos en línea todavía no están habilitados/);
  assert.doesNotMatch(html, /ordering_disabled/);
});

test("instrucciones de entrega: campo con límite de 250 caracteres y contador (solo si hay grupo a domicilio)", () => {
  const html = render({ status: "idle" }, { notes: "Portón azul" });
  assert.match(html, /<textarea[^>]*id="order-notes"[^>]*maxLength="250"/);
  assert.match(text(html), /Instrucciones de entrega \(opcional\)/);
  assert.match(text(html), /11\/250/);
  assert.match(html, /Portón azul/);
});

test("en inglés: confirmación y errores con texto propio", () => {
  const done = text(render({ status: "done", kind: "received", orderNumber: "WEB-1" }, {}, "en"));
  assert.match(done, /Order received; pending payment verification/);
  assert.match(done, /Order No\. WEB-1/);
  assert.doesNotMatch(done, /confirmed/i);
  assert.match(text(render({ status: "error", code: "order_timeout" }, {}, "en")), /We(?:'|&#x27;)re verifying your order/);
  assert.match(text(render({ status: "error", code: "min_total_not_met" }, {}, "en")), /minimum amount/);
});
