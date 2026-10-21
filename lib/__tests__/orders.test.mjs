// "Mis pedidos" (historial del cliente, solo lectura): parseo con lista cerrada de campos, parámetros acotados, errores,
// fechas, render de cada estado (carga, error, vacío, lista, paginación, detalle) en es/en, llaves de mensajes y garantías de
// seguridad / accesibilidad en el código. Datos inventados.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";
import {
  ORDER_STATUSES,
  classifyOrdersError,
  formatOrderDateTime,
  isOrderStatus,
  isValidOrderId,
  parseListParams,
  parseOrderDetail,
  parseOrderList,
} from "../orders.ts";

const require = createRequire(import.meta.url);
const { NextIntlClientProvider } = require("next-intl");
const messages = { es: JSON.parse(fs.readFileSync("messages/es.json", "utf8")), en: JSON.parse(fs.readFileSync("messages/en.json", "utf8")) };
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const summary = (over = {}) => ({
  orderId: "403-0001",
  createdAt: "2026-10-14T08:30:00",
  status: "invoiced",
  total: 11300.5,
  channel: "delivery",
  deliveryDate: "2026-10-20T00:00:00",
  addressName: "Casa de prueba",
  ...over,
});

// ---- Parseo (lista cerrada de campos) ----

test("la lista deja pasar solo los campos permitidos y descarta lo demás", () => {
  const list = parseOrderList({
    items: [{ ...summary(), employeeId: "EMP9", paymentReceiptId: "9", customerId: "TEST-A1", cost: 5 }],
    page: 2,
    pageSize: 10,
    hasMore: true,
    internal: "x",
  });

  assert.deepEqual(Object.keys(list).sort(), ["hasMore", "items", "page", "pageSize"]);
  assert.deepEqual(Object.keys(list.items[0]).sort(), ["addressName", "channel", "createdAt", "deliveryDate", "orderId", "status", "total"]);
  assert.equal(list.page, 2);
  assert.equal(list.hasMore, true);
});

test("estado desconocido = En proceso; canal desconocido = domicilio; id inválido se descarta; forma inesperada = null", () => {
  const list = parseOrderList({ items: [summary({ status: "algo-nuevo" }), summary({ orderId: "403 9; DROP" }), summary({ orderId: "403-0002", channel: "otro" }), null, 5] });
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].status, "processing");
  assert.equal(list.items[1].channel, "delivery");

  for (const bad of [null, undefined, 5, "x", [], {}, { items: "no" }]) assert.equal(parseOrderList(bad), null);
});

test("el detalle deja pasar solo líneas y línea de tiempo con campos permitidos; los estados desconocidos de la línea se omiten", () => {
  const detail = parseOrderDetail({
    order: summary(),
    lines: [{ itemId: "ART1", itemName: "Artículo de prueba", unit: "CAJA", quantity: 2, unitPrice: 100, lineTotal: 200, cost: 80 }, "no"],
    timeline: [{ status: "received", date: "2026-10-14T08:00:00", notes: "interno" }, { status: "estado-raro", date: "x" }, null],
  });

  assert.deepEqual(Object.keys(detail).sort(), ["lines", "order", "timeline"]);
  assert.deepEqual(Object.keys(detail.lines[0]).sort(), ["itemId", "itemName", "lineTotal", "quantity", "unit", "unitPrice"]);
  assert.equal(detail.lines.length, 1);
  assert.deepEqual(detail.timeline, [{ status: "received", date: "2026-10-14T08:00:00" }]);
  assert.equal(parseOrderDetail({ lines: [] }), null);
  assert.equal(parseOrderDetail({ order: { orderId: "../x" } }), null);
});

test("los 14 estados son los acordados (los 4 del pedido recién hecho primero) y se reconocen", () => {
  assert.deepEqual([...ORDER_STATUSES], ["received", "pending_payment_verification", "confirmed", "review", "processing", "postponed", "cancelled", "approved", "invoiced", "on_route", "delivered", "partial", "returned", "later"]);
  for (const status of ORDER_STATUSES) assert.equal(isOrderStatus(status), true);
  assert.equal(isOrderStatus("nope"), false);
});

// ---- Parámetros y errores ----

test("parámetros de la lista acotados: page 1..50 y pageSize 1..20; nunca una cuenta", () => {
  const p = (q) => parseListParams(new URLSearchParams(q));
  assert.deepEqual(p(""), { page: 1, pageSize: 10 });
  assert.deepEqual(p("page=3&pageSize=5"), { page: 3, pageSize: 5 });
  assert.deepEqual(p("page=0&pageSize=0"), { page: 1, pageSize: 1 });
  assert.deepEqual(p("page=9999&pageSize=9999"), { page: 50, pageSize: 20 });
  assert.deepEqual(p("page=abc&pageSize=-3"), { page: 1, pageSize: 10 });
  assert.deepEqual(Object.keys(p("account=TEST-A&accountNum=X&vat=1&page=2")).sort(), ["page", "pageSize"]); // ignora cuenta y cédula
});

test("id de pedido: solo letras, números y guion, hasta 30", () => {
  for (const ok of ["403-0001234", "A1", "1".repeat(30)]) assert.equal(isValidOrderId(ok), true, ok);
  for (const bad of ["", "403 1", "403;", "../x", "1".repeat(31), "403/1"]) assert.equal(isValidOrderId(bad), false, bad);
});

test("clasificación de errores: history_disabled oculta la entrada; 401, 404, 429 y el resto", () => {
  assert.equal(classifyOrdersError(503, { code: "history_disabled" }), "disabled");
  assert.equal(classifyOrdersError(401, { error: "x" }), "unauthorized");
  assert.equal(classifyOrdersError(404, { code: "not_found" }), "notFound");
  assert.equal(classifyOrdersError(429, {}), "rateLimited");
  assert.equal(classifyOrdersError(503, { code: "service_unavailable" }), "unavailable");
  assert.equal(classifyOrdersError(0, null), "unavailable");
});

test("fechas: la hora local de AX (sin zona) no se corre; es y en", () => {
  assert.match(formatOrderDateTime("2026-10-14T08:30:00", "es"), /14 oct 2026.*8:30/);
  assert.match(formatOrderDateTime("2026-10-14T08:30:00", "en"), /Oct 14, 2026.*8:30\s?AM/);
  assert.match(formatOrderDateTime("2026-10-14", "es"), /14 oct 2026/);
  assert.doesNotMatch(formatOrderDateTime("2026-10-14", "es"), /:/); // solo fecha
  assert.equal(formatOrderDateTime("no es fecha", "es"), "");
});

// ---- Render ----

const { OrdersListView, OrderDetailBody } = loadFromRoot("components/profile/OrdersPanel.tsx");
const withIntl = (element, locale) => React.createElement(NextIntlClientProvider, { locale, messages: messages[locale] }, element);
const noop = () => {};
const list = (props, locale = "es") =>
  renderToHtml(withIntl(React.createElement(OrdersListView, { phase: "ready", items: [], hasMore: false, onBack: noop, onRetry: noop, onMore: noop, onOpen: noop, ...props }), locale));
const detailHtml = (props, locale = "es") =>
  renderToHtml(withIntl(React.createElement(OrderDetailBody, { summary: summary(), phase: "ready", detail: null, onBack: noop, onRetry: noop, ...props }), locale));

test("carga: esqueleto con estado accesible, sin lista ni error", () => {
  const html = list({ phase: "loading" });
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(text(html), /Cargando tus pedidos/);
  assert.match(html, /motion-safe:animate-pulse/); // la animación respeta reducir movimiento
  assert.doesNotMatch(html, /<ul|role="alert"/);
});

test("error: mensaje en alerta y botón para reintentar", () => {
  const html = list({ phase: "error" });
  assert.match(html, /role="alert"/);
  assert.match(text(html), /No pudimos cargar tus pedidos/);
  assert.match(text(html), /Reintentar/);
});

test("vacío: 'Todavía no tenés pedidos' (y en inglés)", () => {
  assert.match(text(list({ phase: "ready", items: [] })), /Todavía no tenés pedidos/);
  assert.match(text(list({ phase: "ready", items: [] }, "en")), /You do not have any orders yet/);
});

test("lista: número, fecha, estado con TEXTO, total y canal; título enfocable; sin 'Ver más' si no hay más", () => {
  const html = list({
    items: [summary(), summary({ orderId: "403-0002", channel: "pickup", status: "received", total: 500 })],
    hasMore: false,
  });
  assert.match(html, /<h3[^>]*tabindex="-1"[^>]*>Mis pedidos<\/h3>/);
  assert.match(html, /<ul[^>]*aria-label="Tus pedidos"/);
  assert.equal([...html.matchAll(/data-order-key=/g)].length, 2);
  assert.match(text(html), /Pedido 403-0001/);
  assert.match(text(html), /Facturado/);
  assert.match(text(html), /Recibido/);
  assert.match(text(html), /14 oct 2026/);
  assert.match(text(html), /A domicilio/);
  assert.match(text(html), /Retiro en tienda/);
  assert.match(text(html), /₡11\.300,50|₡11,300\.50/);
  assert.doesNotMatch(text(html), /Ver más pedidos/);
});

test("paginación: 'Ver más' solo con más páginas, deshabilitado mientras carga y con reintento si falla", () => {
  assert.match(text(list({ items: [summary()], hasMore: true })), /Ver más pedidos/);
  const loading = list({ items: [summary()], hasMore: true, loadingMore: true });
  assert.match(loading, /<button[^>]*disabled[^>]*>Cargando\.\.\./);
  const failed = list({ items: [summary()], hasMore: true, moreFailed: true });
  assert.match(failed, /role="alert"/);
  assert.match(text(failed), /Reintentar/);
});

test("los 14 estados tienen su texto en español (los acordados) y en inglés", () => {
  const es = { received: "Recibido", pending_payment_verification: "Verificando pago", confirmed: "Confirmado", review: "En revisión", processing: "En proceso", postponed: "Postergado", cancelled: "Cancelado", approved: "Aprobado", invoiced: "Facturado", on_route: "En ruta", delivered: "Entregado", partial: "Entrega parcial", returned: "Devuelto", later: "Entrega posterior" };
  for (const status of ORDER_STATUSES) {
    assert.equal(messages.es.Orders.status[status], es[status], status);
    assert.ok(messages.en.Orders.status[status]?.trim(), status);
    assert.match(text(list({ items: [summary({ status })] })), new RegExp(es[status]));
  }
});

const detail = (over = {}) => ({
  order: summary({ status: "invoiced", total: 282.5, channel: "delivery" }),
  lines: [
    { itemId: "ART1", itemName: "Artículo A", unit: "CAJA", quantity: 2, unitPrice: 100, lineTotal: 200 },
    { itemId: "ART2", itemName: "Artículo B", unit: "UNIDAD", quantity: 1, unitPrice: 50, lineTotal: 50 },
  ],
  timeline: [
    { status: "received", date: "2026-10-14T08:00:00" },
    { status: "invoiced", date: "2026-10-15T10:00:00" },
  ],
  ...over,
});

test("detalle: líneas con presentación, cantidad, precio y total; entrega, dirección y línea de tiempo con estados y fechas", () => {
  const html = detailHtml({ detail: detail() });
  assert.match(html, /<h3[^>]*tabindex="-1"[^>]*>Pedido 403-0001<\/h3>/);
  assert.match(text(html), /Volver a mis pedidos/);
  assert.match(text(html), /Artículo A/);
  assert.match(text(html), /2 × CAJA/);
  assert.match(text(html), /c\/u/);
  assert.match(text(html), /Fecha de entrega/);
  assert.match(text(html), /Dirección de entrega/);
  assert.match(text(html), /Casa de prueba/);
  assert.match(html, /<ol/);
  assert.match(text(html), /Seguimiento/);
  assert.match(text(html), /Recibido.*15 oct 2026|Recibido.*14 oct 2026/);
  assert.match(text(html), /Facturado/);
});

test("detalle de retiro: 'Tienda de retiro' en vez de dirección de entrega", () => {
  const html = detailHtml({ summary: summary({ channel: "pickup" }), detail: detail({ order: summary({ channel: "pickup" }) }) });
  assert.match(text(html), /Tienda de retiro/);
  assert.doesNotMatch(text(html), /Dirección de entrega/);
});

test("pedido que aún no se crea en AX: sin líneas muestra el aviso, no una tabla vacía", () => {
  const html = detailHtml({ detail: detail({ lines: [], timeline: [] }) });
  assert.match(text(html), /Estamos procesando tu pedido/);
  assert.doesNotMatch(html, /orders-timeline-title/);
});

test("detalle: carga (con lo que ya se sabe de la lista), error con reintento y no encontrado sin reintento", () => {
  const loading = detailHtml({ phase: "loading" });
  assert.match(text(loading), /Cargando el pedido/);
  assert.match(text(loading), /Pedido 403-0001/);

  const failed = detailHtml({ phase: "error", errorKind: "unavailable" });
  assert.match(text(failed), /No pudimos cargar este pedido/);
  assert.match(text(failed), /Reintentar/);

  const notFound = detailHtml({ phase: "error", errorKind: "notFound" });
  assert.match(text(notFound), /No encontramos ese pedido/);
  assert.doesNotMatch(text(notFound), /Reintentar/);
});

test("lista y detalle en inglés con la misma estructura", () => {
  const es = list({ items: [summary()] });
  const en = list({ items: [summary()] }, "en");
  assert.match(en, /<h3[^>]*>My orders<\/h3>/);
  assert.match(text(en), /Order 403-0001/);
  assert.match(text(en), /Invoiced/);
  assert.equal([...en.matchAll(/data-order-key=/g)].length, [...es.matchAll(/data-order-key=/g)].length);
  assert.match(text(detailHtml({ detail: detail() }, "en")), /Back to my orders/);
});

// ---- Llaves de mensajes ----

const lookup = (lang, namespace, key) => `${namespace}.${key}`.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), messages[lang]);
const keysOf = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keysOf(v, `${p}${k}.`) : [`${p}${k}`]));

test("llaves de Orders iguales en es y en, con texto, y sin llaves sin resolver", () => {
  assert.deepEqual(keysOf(messages.es.Orders).sort(), keysOf(messages.en.Orders).sort());
  assert.ok(messages.es.Profile.ordersCta && messages.en.Profile.ordersCta);

  const src = read("components/profile/OrdersPanel.tsx");
  const requested = [...src.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(requested.length > 25);
  const missing = [];
  for (const key of requested) for (const lang of ["es", "en"]) {
    const value = lookup(lang, "Orders", key);
    if (typeof value !== "string" || !value.trim()) missing.push(`${lang}: Orders.${key}`);
  }
  assert.deepEqual(missing, []);

  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /t\("ordersCta"\)/);
});

test("no quedan llaves de Orders sin usar", () => {
  const src = read("components/profile/OrdersPanel.tsx");
  const used = new Set([...src.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]));
  const unused = keysOf(messages.es.Orders).filter((k) => !used.has(k));
  assert.deepEqual(unused, []);
});

// ---- Seguridad y accesibilidad en el código ----

test("las rutas de la web: sin sesión 401 antes de llamar, sin caché, sin cuenta en la URL ni en el log; history_disabled se conserva", () => {
  const proxy = read("lib/orders-proxy.ts");
  assert.ok(proxy.indexOf("sessionGate(") < proxy.indexOf("fetch("), "401 sin sesión (sessionGate) antes de llamar a mercasa-api");
  assert.match(proxy, /method: "GET"/);
  assert.match(proxy, /cache: "no-store"/);
  assert.match(proxy, /"Cache-Control": "private, no-store"/);
  assert.match(proxy, /history_disabled/);
  assert.doesNotMatch(proxy, /console\.(log|info|warn|error)\([^)]*(body|token|orderId|path|id\b)/);

  const list = read("app/api/customer/orders/route.ts");
  assert.match(list, /parseListParams/);
  assert.doesNotMatch(list, /\b(account\w*|vat\w*|cedula)\b/i);

  const detail = read("app/api/customer/orders/[id]/route.ts");
  assert.match(detail, /isValidOrderId\(id\)/);
  assert.doesNotMatch(detail, /\b(account\w*|vat\w*|cedula)\b/i);
});

test("foco: al abrir la lista o el detalle va al título; al volver regresa al pedido abierto; sin cuenta en las peticiones del panel", () => {
  const src = read("components/profile/OrdersPanel.tsx");
  assert.equal([...src.matchAll(/headingRef\.current\?\.focus\(\)/g)].length, 2); // lista y detalle
  assert.match(src, /lastOpened\.current = orderKey\(order\)/);
  assert.match(src, /querySelector<HTMLElement>\(`\[data-order-key=/);
  assert.match(src, /target\?\.focus\(\)/);
  assert.doesNotMatch(src, /account|accountNum|cedula|vatNum/i);
  assert.match(src, /motion-safe:animate-pulse/);
});

test("el panel de cuenta: 'Mis pedidos' solo si el servidor no respondió history_disabled; se cierra y se reinicia con el panel", () => {
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /historyAvailable === true && \(/);
  assert.match(drawer, /res\.status === 503 && body\?\.code === "history_disabled"/);
  assert.match(drawer, /user && showingOrders \? \(\s*<OrdersPanel onBack=\{\(\) => setShowingOrders\(false\)\} \/>/);
  assert.match(drawer, /setShowingOrders\(false\);(\s*set\w+\((null|false)\);)*\s*\}\s*\}/); // al cerrar el panel se vuelve a la cuenta
  assert.match(drawer, /!showingOrders && \(/); // el pie de la cuenta no se muestra en el historial
});

// ---- Los cuatro estados del pedido recién hecho: etiqueta + explicación clara ----

const NOTES_ES = {
  received: "Recibimos tu pedido. Lo estamos procesando.",
  pending_payment_verification: "Estamos verificando tu pago.",
  confirmed: "Pedido confirmado.",
  review: "Estamos revisando tu pedido; te contactamos si hace falta.",
};
const NOTES_EN = {
  received: "We received your order. We are processing it.",
  pending_payment_verification: "We are verifying your payment.",
  confirmed: "Order confirmed.",
  review: "We are reviewing your order; we will contact you if needed.",
};

test("cada uno de los cuatro estados muestra SU texto, en la lista y en el detalle, en español e inglés", () => {
  for (const status of Object.keys(NOTES_ES)) {
    assert.equal(messages.es.Orders.statusNote[status], NOTES_ES[status], status);
    assert.equal(messages.en.Orders.statusNote[status], NOTES_EN[status], status);

    assert.ok(text(list({ items: [summary({ status })] })).includes(NOTES_ES[status]), `lista es ${status}`);
    assert.ok(text(detailHtml({ summary: summary({ status }), detail: detail({ order: summary({ status }) }) })).includes(NOTES_ES[status]), `detalle es ${status}`);
    assert.ok(text(list({ items: [summary({ status })] }, "en")).includes(NOTES_EN[status]), `lista en ${status}`);
    assert.ok(text(detailHtml({ summary: summary({ status }), detail: detail({ order: summary({ status }) }) }, "en")).includes(NOTES_EN[status]), `detalle en ${status}`);
  }
});

test("un pedido recién hecho 'recibido' no alarma: texto tranquilo, sin palabras de error, y no es un aviso (sin role=alert)", () => {
  const html = list({ items: [summary({ status: "received" })] });
  assert.ok(text(html).includes("Recibimos tu pedido. Lo estamos procesando."));
  assert.doesNotMatch(html, /role="alert"/);
  assert.doesNotMatch(text(html), /error|falló|problema|cancel/i);
});

test("un estado desconocido que llegue a la web cae al valor seguro (En proceso), con su explicación, nunca vacío", () => {
  const parsed = parseOrderList({ items: [summary({ status: "PSStatus_17" }), summary({ orderId: "403-0002", status: "" }), summary({ orderId: "403-0003", status: null })] });
  for (const item of parsed.items) assert.equal(item.status, "processing");

  const html = text(list({ items: parsed.items }));
  assert.match(html, /En proceso/);
  assert.match(html, /Estamos procesando tu pedido\./);
  assert.doesNotMatch(html, /PSStatus/);
});

test("los estados nuevos también se reconocen en la línea de tiempo del detalle", () => {
  const parsed = parseOrderDetail({
    order: summary({ status: "pending_payment_verification" }),
    lines: [],
    timeline: [{ status: "received", date: "2026-10-14T08:00:00" }, { status: "pending_payment_verification", date: "2026-10-14T08:05:00" }, { status: "raro", date: "x" }],
  });
  assert.deepEqual(parsed.timeline.map((e) => e.status), ["received", "pending_payment_verification"]);
});

// ---- Recarga manual (sin refresco automático) ----

test("lista y detalle ofrecen 'Actualizar' (manual), lo deshabilitan mientras actualiza y avisan si falla sin perder lo que se veía", () => {
  const withButton = list({ items: [summary()], onRefresh: noop });
  assert.match(text(withButton), /Actualizar/);
  assert.doesNotMatch(text(list({ items: [summary()] })), /Actualizar/); // sin el manejador no se ofrece

  const busy = list({ items: [summary()], onRefresh: noop, refreshing: true });
  assert.match(busy, /<button[^>]*disabled[^>]*>Actualizando\.\.\./);

  const failed = list({ items: [summary()], onRefresh: noop, refreshFailed: true });
  assert.match(failed, /role="alert"/);
  assert.match(text(failed), /No pudimos actualizar/);
  assert.match(text(failed), /Pedido 403-0001/); // la lista sigue a la vista

  const detailRefresh = detailHtml({ detail: detail(), onRefresh: noop });
  assert.match(text(detailRefresh), /Actualizar/);
  assert.match(detailHtml({ detail: detail(), onRefresh: noop, refreshing: true }), /<button[^>]*disabled[^>]*>Actualizando\.\.\./);
  assert.match(text(detailHtml({ detail: detail(), onRefresh: noop, refreshFailed: true })), /No pudimos actualizar/);
  assert.doesNotMatch(text(detailHtml({ phase: "loading", onRefresh: noop })), /Actualizar/);
  assert.match(text(list({ items: [summary()], onRefresh: noop }, "en")), /Refresh/);
});

test("la pantalla NO se refresca sola: ni temporizadores ni sondeo", () => {
  const code = read("components/profile/OrdersPanel.tsx").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /setInterval|setTimeout|requestAnimationFrame/);
});

test("las rutas de pedidos usan la renovación silenciosa de sesión (sessionGate + withSessionRetry) y no registran datos del cliente", () => {
  const proxy = read("lib/orders-proxy.ts");
  assert.match(proxy, /sessionGate\(/);
  assert.match(proxy, /withSessionRetry\(/);
  assert.doesNotMatch(proxy, /store\.get\(SESSION_COOKIE\)/);
  assert.doesNotMatch(proxy.replace(/\/\/.*$/gm, ""), /console\.(log|info|warn|error)\([^)]*(token|orderId|path\b|body|account|cedula)/);
});

test("un cliente no puede pedir pedidos ajenos: ninguna ruta ni el panel mandan cuenta, cédula ni id de cliente (la cuenta sale del JWT)", () => {
  for (const file of ["app/api/customer/orders/route.ts", "app/api/customer/orders/[id]/route.ts", "lib/orders-proxy.ts", "components/profile/OrdersPanel.tsx"]) {
    const code = read(file).replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /\b(accountNum|account|vatnum|cedula|customerId)\b\s*[:=]/i, file);
  }
  // Un 404 llega igual de la lista de ajenos y de inexistentes: la clasificación no distingue.
  assert.equal(classifyOrdersError(404, { code: "not_found" }), "notFound");
  assert.equal(classifyOrdersError(404, {}), "notFound");
});

test("el acceso a 'Mis pedidos' desde la confirmación del checkout sigue detrás del interruptor de pedidos", () => {
  const confirm = read("components/cart/ConfirmStep.tsx");
  assert.match(confirm, /createOpenOrders/);
  const flags = read("lib/feature-flags.ts");
  assert.match(flags, /NEXT_PUBLIC_ENABLE_ORDERING/);
  assert.match(flags, /=== "true"/); // apagado por defecto
});
