// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderRequest, matchPreviewLines, parseOrderPreview, sanitizeOrderRequest } from "../order-logic.ts";

test("buildOrderRequest: unitId solo cuando hay presentación elegida y nunca otros campos", () => {
  const request = buildOrderRequest(
    [
      { id: "A", quantity: 2, unitId: "CAJA", name: "x", price: 5 },
      { id: "B", quantity: 1 },
      { id: "P", quantity: 3, unitId: "TARIMA", channel: "pickup" },
    ],
    { addressId: 1, deliveryDate: null, paymentMethod: null, pickupSiteId: "ALA" }
  );
  assert.deepEqual(request.delivery.lines, [{ itemId: "A", unitId: "CAJA", quantity: 2 }, { itemId: "B", quantity: 1 }]);
  assert.deepEqual(request.pickup.lines, [{ itemId: "P", unitId: "TARIMA", quantity: 3 }]);
});

test("sanitizeOrderRequest: conserva unitId válido y descarta precios; rechaza unitId inválido", () => {
  const ok = sanitizeOrderRequest({
    delivery: {
      addressId: 1,
      deliveryDate: null,
      lines: [{ itemId: "A", unitId: " CAJA ", quantity: 2, unitPrice: 1, factor: 24 }, { itemId: "B", unitId: "", quantity: 1 }],
    },
    paymentMethod: null,
  });
  assert.deepEqual(ok.delivery.lines, [{ itemId: "A", unitId: "CAJA", quantity: 2 }, { itemId: "B", quantity: 1 }]);
  for (const unitId of [5, "X".repeat(21)]) {
    assert.equal(sanitizeOrderRequest({ delivery: { addressId: 1, lines: [{ itemId: "A", unitId, quantity: 1 }] } }), null);
    assert.equal(sanitizeOrderRequest({ pickup: { siteId: "ALA", lines: [{ itemId: "A", unitId, quantity: 1 }] } }), null);
  }
});

test("matchPreviewLines: el mismo ítem en dos presentaciones se une con su línea; la sin unidad toma la por defecto", () => {
  const lines = [
    { itemId: "MTMSGR205", unitId: "SACO", quantity: 3 },
    { itemId: "MTMSGR205", unitId: "TARIMA", quantity: 1 },
    { itemId: "OTRO", unitId: "UND", quantity: 1 },
  ];
  const items = [{ id: "MTMSGR205" }, { id: "MTMSGR205", unitId: "tarima" }, { id: "OTRO" }];
  const matched = matchPreviewLines(items, lines);
  assert.equal(matched.get("MTMSGR205|").unitId, "SACO");
  assert.equal(matched.get("MTMSGR205|TARIMA").unitId, "TARIMA");
  assert.equal(matched.get("OTRO|").unitId, "UND");
  assert.equal(matched.size, 3);
});

test("parseOrderPreview: lee unitId y factor de la línea (factor 1 si falta)", () => {
  const base = {
    totals: { subtotal: 1, discount: 0, tax: 0, total: 1 },
    minimumAmount: 0,
    shortfall: 0,
    canOrder: true,
    belowMinimum: false,
    delivery: {},
    errors: [],
  };
  const preview = parseOrderPreview({
    ...base,
    lines: [
      { itemId: "A", unitId: "CAJA", factor: 24, quantity: 1, unitPrice: 1, discount: 0, tax: 0, lineTotal: 1 },
      { itemId: "B", quantity: 1, unitPrice: 1, discount: 0, tax: 0, lineTotal: 1 },
    ],
  });
  assert.deepEqual([preview.lines[0].unitId, preview.lines[0].factor], ["CAJA", 24]);
  assert.deepEqual([preview.lines[1].unitId, preview.lines[1].factor], ["", 1]);
});
