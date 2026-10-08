// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderRequest,
  canAdvance,
  hasLineErrors,
  lineErrorsByItem,
  nextStep,
  orderRequestKey,
  parseOrderPreview,
  previousStep,
  sanitizeOrderRequest,
} from "../order-logic.ts";

const previewRaw = (over = {}) => ({
  lines: [{ itemId: "A", name: "Prod A", quantity: 2, unitPrice: 1000, discount: 0, tax: 260, lineTotal: 2260, available: true }],
  totals: { subtotal: 2000, discount: 0, tax: 260, total: 2260 },
  freight: null,
  freightPending: true,
  minimumAmount: 30000,
  belowMinimum: false,
  shortfall: 0,
  delivery: { date: "2026-10-12", valid: true, requiresCoordination: false },
  canOrder: true,
  errors: [],
  ...over,
});

// --- el navegador solo manda itemId y cantidad ---

test("buildOrderRequest: solo itemId y cantidad salen de los ítems del carrito", () => {
  const cart = [{ id: "A", name: "Prod A", packSize: "25kg", quantity: 2, price: 999, unitPrice: 999, total: 1998 }];

  const body = buildOrderRequest(cart, 7, "2026-10-12", "sinpe");

  assert.deepEqual(Object.keys(body).sort(), ["addressId", "deliveryDate", "items", "paymentMethod"]);
  assert.deepEqual(body.items, [{ itemId: "A", quantity: 2 }]);
  assert.deepEqual(Object.keys(body.items[0]).sort(), ["itemId", "quantity"]);
});

test("sanitizeOrderRequest descarta campos de precio, total, descuento y mínimo", () => {
  const raw = {
    addressId: 7, deliveryDate: "2026-10-12", paymentMethod: "sinpe",
    total: 1, subtotal: 1, discount: 99, minimumAmount: 1, freight: 0,
    items: [{ itemId: "A", quantity: 2, unitPrice: 1, price: 1, discount: 99, tax: 0, lineTotal: 1 }],
  };

  const clean = sanitizeOrderRequest(raw);

  assert.deepEqual(Object.keys(clean).sort(), ["addressId", "deliveryDate", "items", "paymentMethod"]);
  assert.deepEqual(clean.items, [{ itemId: "A", quantity: 2 }]);
  assert.equal(JSON.stringify(clean).includes("price"), false);
  assert.equal(JSON.stringify(clean).includes("total"), false);
});

test("sanitizeOrderRequest rechaza cuerpos mal formados", () => {
  const ok = { addressId: 1, deliveryDate: null, paymentMethod: null, items: [{ itemId: "A", quantity: 1 }] };
  assert.notEqual(sanitizeOrderRequest(ok), null);
  assert.equal(sanitizeOrderRequest(null), null);
  assert.equal(sanitizeOrderRequest("x"), null);
  assert.equal(sanitizeOrderRequest({ ...ok, addressId: "1" }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, addressId: 0 }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, deliveryDate: "12/10/2026" }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, items: [] }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, items: Array.from({ length: 101 }, (_, i) => ({ itemId: `I${i}`, quantity: 1 })) }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, items: [{ itemId: "", quantity: 1 }] }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, items: [{ itemId: "A", quantity: 1.5 }] }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, items: [{ itemId: "x".repeat(51), quantity: 1 }] }), null);
});

test("orderRequestKey cambia al cambiar la cantidad, la fecha o el pago", () => {
  const base = buildOrderRequest([{ id: "A", quantity: 1 }], 1, "2026-10-12", "sinpe");
  assert.notEqual(orderRequestKey(base), orderRequestKey({ ...base, items: [{ itemId: "A", quantity: 2 }] }));
  assert.notEqual(orderRequestKey(base), orderRequestKey({ ...base, deliveryDate: "2026-10-19" }));
  assert.notEqual(orderRequestKey(base), orderRequestKey({ ...base, paymentMethod: "transfer" }));
});

// --- lectura de la respuesta ---

test("parseOrderPreview lee la respuesta del servidor", () => {
  const p = parseOrderPreview(previewRaw());
  assert.equal(p.totals.total, 2260);
  assert.equal(p.freight, null);
  assert.equal(p.freightPending, true);
  assert.equal(p.canOrder, true);
  assert.equal(p.lines[0].unitPrice, 1000);
});

test("parseOrderPreview devuelve null si falta o es inválido un número (nunca inventa valores)", () => {
  assert.equal(parseOrderPreview(null), null);
  assert.equal(parseOrderPreview({}), null);
  assert.equal(parseOrderPreview(previewRaw({ totals: { subtotal: 1, discount: 0, tax: 0 } })), null);
  assert.equal(parseOrderPreview(previewRaw({ totals: { subtotal: "1", discount: 0, tax: 0, total: 1 } })), null);
  assert.equal(parseOrderPreview(previewRaw({ minimumAmount: NaN })), null);
  assert.equal(parseOrderPreview(previewRaw({ canOrder: "yes" })), null);
});

test("lineErrorsByItem agrupa por ítem sin distinguir mayúsculas y hasLineErrors lo detecta", () => {
  const p = parseOrderPreview(previewRaw({
    errors: [
      { code: "item_unavailable", itemId: "A", message: "x" },
      { code: "price_list_missing", message: "y" },
    ],
  }));
  assert.deepEqual(lineErrorsByItem(p).get("a"), ["item_unavailable"]);
  assert.equal(hasLineErrors(p), true);
  assert.equal(hasLineErrors(parseOrderPreview(previewRaw({ errors: [{ code: "price_list_missing", message: "y" }] }))), false);
});

// --- reglas de avance ---

test("canAdvance cart: bloquea con errores por línea, sin lista de precios o por debajo del mínimo", () => {
  const sel = { deliveryDate: null, paymentMethod: null };
  assert.equal(canAdvance("cart", parseOrderPreview(previewRaw()), sel), true);
  assert.equal(canAdvance("cart", parseOrderPreview(previewRaw({ belowMinimum: true, shortfall: 5000 })), sel), false);
  assert.equal(canAdvance("cart", parseOrderPreview(previewRaw({ errors: [{ code: "item_unavailable", itemId: "A", message: "" }] })), sel), false);
  assert.equal(canAdvance("cart", parseOrderPreview(previewRaw({ errors: [{ code: "price_list_missing", message: "" }] })), sel), false);
  assert.equal(canAdvance("cart", null, sel), false);
});

test("canAdvance delivery: fecha válida, o zona por coordinar sin fecha", () => {
  const ok = parseOrderPreview(previewRaw());
  assert.equal(canAdvance("delivery", ok, { deliveryDate: "2026-10-12", paymentMethod: null }), true);
  assert.equal(canAdvance("delivery", ok, { deliveryDate: null, paymentMethod: null }), false);
  assert.equal(canAdvance("delivery", parseOrderPreview(previewRaw({ delivery: { date: "2026-10-12", valid: false, requiresCoordination: false } })),
    { deliveryDate: "2026-10-12", paymentMethod: null }), false);

  const coordination = parseOrderPreview(previewRaw({ delivery: { date: null, valid: true, requiresCoordination: true } }));
  assert.equal(canAdvance("delivery", coordination, { deliveryDate: null, paymentMethod: null }), true);
});

test("canAdvance payment y summary", () => {
  const ok = parseOrderPreview(previewRaw());
  assert.equal(canAdvance("payment", ok, { deliveryDate: null, paymentMethod: "sinpe" }), true);
  assert.equal(canAdvance("payment", ok, { deliveryDate: null, paymentMethod: null }), false);
  assert.equal(canAdvance("summary", ok, { deliveryDate: null, paymentMethod: null }), true);
  assert.equal(canAdvance("summary", parseOrderPreview(previewRaw({ canOrder: false })), { deliveryDate: null, paymentMethod: null }), false);
});

test("nextStep y previousStep recorren los cuatro pasos", () => {
  assert.equal(nextStep("cart"), "delivery");
  assert.equal(nextStep("delivery"), "payment");
  assert.equal(nextStep("payment"), "summary");
  assert.equal(previousStep("summary"), "payment");
  assert.equal(previousStep("payment"), "delivery");
  assert.equal(previousStep("delivery"), "cart");
  assert.equal(previousStep("cart"), "cart");
});
