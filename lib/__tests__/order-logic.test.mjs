// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderRequest,
  canAdvance,
  groupFor,
  hasError,
  hasLineErrors,
  lineErrorsByItem,
  matchPreviewLines,
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

const sel = (over = {}) => ({ addressId: 7, deliveryDate: "2026-10-12", paymentMethod: "sinpe", pickupSiteId: "ALA", ...over });

// --- el navegador solo manda itemId, presentación y cantidad ---

test("buildOrderRequest: solo itemId, presentación y cantidad salen de las líneas; cada una va al grupo de su canal", () => {
  const cart = [
    { id: "A", name: "Prod A", packSize: "25kg", quantity: 2, price: 999, unitPrice: 999, total: 1998, channel: "delivery" },
    { id: "A", name: "Prod A", quantity: 1, unitId: "CAJA", price: 1, channel: "pickup" },
    { id: "B", name: "Viejo sin canal", quantity: 3 },
  ];

  const body = buildOrderRequest(cart, sel());

  assert.deepEqual(Object.keys(body).sort(), ["delivery", "paymentMethod", "pickup"]);
  assert.deepEqual(body.delivery, { addressId: 7, deliveryDate: "2026-10-12", lines: [{ itemId: "A", quantity: 2 }, { itemId: "B", quantity: 3 }] });
  assert.deepEqual(body.pickup, { siteId: "ALA", lines: [{ itemId: "A", unitId: "CAJA", quantity: 1 }] });
  assert.equal(JSON.stringify(body).includes("price"), false);
});

test("buildOrderRequest: solo se arman los grupos que existen (y tienen con qué): solo domicilio, solo retiro, sin dirección o sin tienda", () => {
  const delivery = { id: "A", quantity: 1, channel: "delivery" };
  const pickup = { id: "P", quantity: 1, channel: "pickup" };

  assert.equal(buildOrderRequest([delivery], sel()).pickup, null);
  assert.equal(buildOrderRequest([pickup], sel()).delivery, null);
  assert.equal(buildOrderRequest([delivery, pickup], sel({ addressId: null })).delivery, null);
  assert.equal(buildOrderRequest([delivery, pickup], sel({ pickupSiteId: null })).pickup, null);
});

test("sanitizeOrderRequest descarta campos de precio, total, descuento y mínimo en los dos grupos", () => {
  const raw = {
    paymentMethod: "sinpe", total: 1, subtotal: 1, discount: 99, minimumAmount: 1, freight: 0,
    delivery: { addressId: 7, deliveryDate: "2026-10-12", total: 5, lines: [{ itemId: "A", quantity: 2, unitPrice: 1, price: 1, discount: 99, tax: 0, lineTotal: 1 }] },
    pickup: { siteId: " ALA ", minimumAmount: 0, lines: [{ itemId: "P", unitId: " CAJA ", quantity: 1, price: 1 }] },
  };

  const clean = sanitizeOrderRequest(raw);

  assert.deepEqual(Object.keys(clean).sort(), ["delivery", "paymentMethod", "pickup"]);
  assert.deepEqual(clean.delivery, { addressId: 7, deliveryDate: "2026-10-12", lines: [{ itemId: "A", quantity: 2 }] });
  assert.deepEqual(clean.pickup, { siteId: "ALA", lines: [{ itemId: "P", unitId: "CAJA", quantity: 1 }] });
  assert.equal(JSON.stringify(clean).includes("price"), false);
  assert.equal(JSON.stringify(clean).includes("total"), false);
});

test("sanitizeOrderRequest rechaza cuerpos mal formados", () => {
  const line = { itemId: "A", quantity: 1 };
  const ok = { paymentMethod: null, delivery: { addressId: 1, deliveryDate: null, lines: [line] }, pickup: null };
  assert.notEqual(sanitizeOrderRequest(ok), null);
  assert.notEqual(sanitizeOrderRequest({ pickup: { siteId: "ALA", lines: [line] } }), null); // solo retiro
  assert.equal(sanitizeOrderRequest(null), null);
  assert.equal(sanitizeOrderRequest("x"), null);
  assert.equal(sanitizeOrderRequest({}), null); // ningún grupo
  assert.equal(sanitizeOrderRequest({ delivery: null, pickup: null }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, addressId: "1" } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, addressId: 0 } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, deliveryDate: "12/10/2026" } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, lines: [] } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, lines: Array.from({ length: 101 }, (_, i) => ({ itemId: `I${i}`, quantity: 1 })) } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, lines: [{ itemId: "", quantity: 1 }] } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, lines: [{ itemId: "A", quantity: 1.5 }] } }), null);
  assert.equal(sanitizeOrderRequest({ ...ok, delivery: { ...ok.delivery, lines: [{ itemId: "x".repeat(51), quantity: 1 }] } }), null);
  assert.equal(sanitizeOrderRequest({ pickup: { siteId: "", lines: [line] } }), null);
  assert.equal(sanitizeOrderRequest({ pickup: { siteId: "X".repeat(40), lines: [line] } }), null);
  assert.equal(sanitizeOrderRequest({ pickup: { siteId: "ALA", lines: [] } }), null);
  assert.equal(sanitizeOrderRequest({ pickup: "ALA" }), null);
});

test("orderRequestKey cambia al cambiar la cantidad, la fecha, la tienda o el pago", () => {
  const cart = [{ id: "A", quantity: 1, channel: "delivery" }, { id: "P", quantity: 1, channel: "pickup" }];
  const base = buildOrderRequest(cart, sel());
  assert.notEqual(orderRequestKey(base), orderRequestKey(buildOrderRequest([{ ...cart[0], quantity: 2 }, cart[1]], sel())));
  assert.notEqual(orderRequestKey(base), orderRequestKey(buildOrderRequest(cart, sel({ deliveryDate: "2026-10-19" }))));
  assert.notEqual(orderRequestKey(base), orderRequestKey(buildOrderRequest(cart, sel({ paymentMethod: "transfer" }))));
  assert.notEqual(orderRequestKey(base), orderRequestKey(buildOrderRequest(cart, sel({ pickupSiteId: "CCA" }))));
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

// --- dos grupos (fase 2) ---

const totals = (subtotal, tax) => ({ subtotal, discount: 0, tax, total: subtotal + tax });
const groupedRaw = (over = {}) =>
  previewRaw({
    deliveryGroup: { lines: previewRaw().lines, totals: totals(2000, 260), minimumAmount: 30000, belowMinimum: false, shortfall: 0, canOrder: true, errors: [] },
    pickupGroup: {
      siteId: "ALA",
      lines: [{ itemId: "P", name: "Retiro P", unitId: "CAJA", factor: 12, quantity: 3, unitPrice: 1100, discount: 0, tax: 143, lineTotal: 1243, available: false, maxAvailable: 2 }],
      totals: totals(3300, 429),
      minimumAmount: null,
      belowMinimum: false,
      shortfall: 0,
      canOrder: false,
      errors: [{ code: "item_unavailable", itemId: "P", message: "" }],
      sites: [
        { siteId: "ALA", unavailableItems: 1, name: "Homex Alajuela", city: "Alajuela, La Trinidad", address: "x", hours: "y", mapUrl: "https://maps.example/ala" },
        { siteId: "CCA", unavailableItems: 0, name: "Homex Tejar", city: "Cartago", address: "", hours: "", mapUrl: "" },
      ],
    },
    grandTotals: totals(5300, 689),
    canOrder: false,
    ...over,
  });

test("parseOrderPreview lee los dos grupos, el máximo disponible, las tiendas y el total general", () => {
  const p = parseOrderPreview(groupedRaw());
  assert.equal(p.deliveryGroup.totals.total, 2260);
  assert.equal(p.pickupGroup.siteId, "ALA");
  assert.equal(p.pickupGroup.minimumAmount, null); // sin mínimo
  assert.equal(p.pickupGroup.lines[0].maxAvailable, 2);
  assert.equal(p.pickupGroup.lines[0].factor, 12);
  assert.deepEqual(p.pickupGroup.sites.map((s) => [s.siteId, s.unavailableItems, s.name]), [["ALA", 1, "Homex Alajuela"], ["CCA", 0, "Homex Tejar"]]);
  assert.equal(p.grandTotals.total, 5989);
  assert.equal(groupFor(p, "pickup"), p.pickupGroup);
  assert.equal(groupFor(p, "delivery"), p.deliveryGroup);
});

test("parseOrderPreview: forma anterior (sin grupos) = un grupo de domicilio con los campos de arriba", () => {
  const p = parseOrderPreview(previewRaw());
  assert.equal(p.pickupGroup, null);
  assert.equal(p.deliveryGroup.totals.total, 2260);
  assert.equal(p.grandTotals.total, 2260);
});

test("parseOrderPreview: solo retiro (sin grupo de domicilio) y grupos mal formados", () => {
  const onlyPickup = parseOrderPreview(groupedRaw({ deliveryGroup: null, lines: [], totals: totals(0, 0) }));
  assert.equal(onlyPickup.deliveryGroup, null);
  assert.equal(onlyPickup.pickupGroup.siteId, "ALA");
  assert.equal(parseOrderPreview(groupedRaw({ pickupGroup: { ...groupedRaw().pickupGroup, totals: { subtotal: 1 } } })), null);
  assert.equal(parseOrderPreview(groupedRaw({ pickupGroup: { ...groupedRaw().pickupGroup, minimumAmount: "30" } })), null);
});

test("errores por línea por grupo: los de retiro no se mezclan con los de domicilio", () => {
  const p = parseOrderPreview(groupedRaw());
  assert.deepEqual(lineErrorsByItem(p, "pickup").get("p"), ["item_unavailable"]);
  assert.equal(lineErrorsByItem(p, "delivery").size, 0);
  assert.equal(hasLineErrors(p), true);
  assert.equal(hasError(p, "item_unavailable"), true);
});

test("matchPreviewLines por grupo: el mismo producto en los dos canales se une a la línea de SU grupo", () => {
  const p = parseOrderPreview(groupedRaw({
    pickupGroup: { ...groupedRaw().pickupGroup, lines: [{ ...groupedRaw().pickupGroup.lines[0], itemId: "A", unitId: "", unitPrice: 900, lineTotal: 900 }] },
  }));
  const delivery = matchPreviewLines([{ id: "A" }], p.deliveryGroup.lines).get("A|");
  const pickup = matchPreviewLines([{ id: "A" }], p.pickupGroup.lines).get("A|");
  assert.equal(delivery.unitPrice, 1000);
  assert.equal(pickup.unitPrice, 900);
});

test("canAdvance con dos grupos: el carrito exige que CADA grupo esté bien (errores, mínimo, existencia)", () => {
  const s = { deliveryDate: null, paymentMethod: null };
  const both = { delivery: true, pickup: true };
  const failing = parseOrderPreview(groupedRaw());
  assert.equal(canAdvance("cart", failing, s, both), false); // el retiro tiene un error por línea

  const clean = parseOrderPreview(groupedRaw({
    pickupGroup: { ...groupedRaw().pickupGroup, errors: [], canOrder: true },
    canOrder: true,
  }));
  assert.equal(canAdvance("cart", clean, s, both), true);

  const belowPickupMin = parseOrderPreview(groupedRaw({
    pickupGroup: { ...groupedRaw().pickupGroup, errors: [], canOrder: false, minimumAmount: 5000, belowMinimum: true, shortfall: 100 },
  }));
  assert.equal(canAdvance("cart", belowPickupMin, s, both), false);

  const belowDeliveryMin = parseOrderPreview(groupedRaw({
    pickupGroup: { ...groupedRaw().pickupGroup, errors: [], canOrder: true },
    deliveryGroup: { ...groupedRaw().deliveryGroup, belowMinimum: true, shortfall: 10 },
  }));
  assert.equal(canAdvance("cart", belowDeliveryMin, s, both), false);
});

test("canAdvance solo retiro: no pide dirección ni fecha de entrega (sí la de retiro); solo domicilio: no pide tienda", () => {
  const onlyPickup = parseOrderPreview(groupedRaw({
    deliveryGroup: null, lines: [], totals: totals(0, 0),
    pickupGroup: { ...groupedRaw().pickupGroup, errors: [], canOrder: true },
    delivery: { date: null, valid: false, requiresCoordination: false }, // lo que manda el servidor sin grupo de domicilio
  }));
  const s = { deliveryDate: null, paymentMethod: null, pickupDate: "2026-10-13" };
  assert.equal(canAdvance("cart", onlyPickup, s, { delivery: false, pickup: true }), true);
  assert.equal(canAdvance("delivery", onlyPickup, s, { delivery: false, pickup: true }), true); // sin fecha de entrega
  // La fecha de retiro es obligatoria: sin ella no se pasa del paso de entrega.
  assert.equal(canAdvance("delivery", onlyPickup, { ...s, pickupDate: null }, { delivery: false, pickup: true }), false);

  const onlyDelivery = parseOrderPreview(previewRaw());
  assert.equal(canAdvance("delivery", onlyDelivery, { deliveryDate: "2026-10-12", paymentMethod: null }), true);
  assert.equal(canAdvance("delivery", onlyDelivery, { deliveryDate: "2026-10-12", paymentMethod: null }, { delivery: true, pickup: true }), false); // faltaría el grupo de retiro

  // Mixto: hace falta la fecha del domicilio Y la respuesta de la tienda.
  const mixed = parseOrderPreview(groupedRaw({ pickupGroup: { ...groupedRaw().pickupGroup, errors: [], canOrder: true } }));
  assert.equal(canAdvance("delivery", mixed, { deliveryDate: null, paymentMethod: null, pickupDate: "2026-10-13" }, { delivery: true, pickup: true }), false);
  assert.equal(canAdvance("delivery", mixed, { deliveryDate: "2026-10-12", paymentMethod: null }, { delivery: true, pickup: true }), false); // falta la fecha de retiro
  assert.equal(canAdvance("delivery", mixed, { deliveryDate: "2026-10-12", paymentMethod: null, pickupDate: "2026-10-13" }, { delivery: true, pickup: true }), true);
});

test("canAdvance summary: el canOrder global (todos los grupos y el pago)", () => {
  const s = { deliveryDate: null, paymentMethod: "sinpe" };
  assert.equal(canAdvance("summary", parseOrderPreview(groupedRaw()), s, { delivery: true, pickup: true }), false);
  assert.equal(canAdvance("summary", parseOrderPreview(groupedRaw({ canOrder: true })), s, { delivery: true, pickup: true }), true);
});
