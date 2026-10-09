// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  allEquivalences,
  approxBasePrice,
  equivalences,
  formatAmount,
  pickInitialUnit,
  shortEquivalence,
  sortUnits,
  unitLabel,
  unitName,
  unitTitle,
} from "../presentations.ts";

const u = (unitId, factor, baseUnitId, extra = {}) => ({
  unitId,
  label: unitId,
  unitPrice: 1000,
  tax: 0,
  factor,
  baseUnitId,
  available: 10,
  isDefault: false,
  ...extra,
});

// Casos reales de la lista AF.
const beer = [u("CAJA", 24, "LATA", { unitPrice: 15108.99705 }), u("LATA", 1, "LATA", { unitPrice: 629.54, isDefault: true })];
const oats = [u("TARIMA", 15, "SACO", { unitPrice: 295265.14 }), u("SACO", 1, "SACO", { isDefault: true, unitPrice: 19733.68 })];
const oreo = [u("TARIMA", 390, "DISPL"), u("DISPL", 1, "DISPL", { isDefault: true }), u("CAJA", 6, "DISPL")];
const sack = [u("SACO", 45.36, "KILO", { isDefault: true }), u("KILO", 1, "KILO")]; // MTMSGR19: listado SACO, base KILO
const tuna = [u("CAJA", 24, "UND"), u("UND", 1, "UND", { isDefault: true })];

test("sortUnits: de menor a mayor factor (Lata, Caja, Tarima)", () => {
  assert.deepEqual(sortUnits(oreo).map((x) => x.unitId), ["DISPL", "CAJA", "TARIMA"]);
  assert.deepEqual(sortUnits(beer).map((x) => x.unitId), ["LATA", "CAJA"]);
});

test("pickInitialUnit: abre con la presentación de la tarjeta (atún 2PACK: UND aunque CAJA vaya primero)", () => {
  assert.equal(pickInitialUnit(tuna, "UND").unitId, "UND");
  assert.equal(pickInitialUnit(tuna, " und ").unitId, "UND");
  // Aunque el servidor marcara otra como por defecto, manda la unidad de la tarjeta.
  const wrongDefault = [u("CAJA", 24, "UND", { isDefault: true }), u("UND", 1, "UND")];
  assert.equal(pickInitialUnit(wrongDefault, "UND").unitId, "UND");
});

test("pickInitialUnit: ítem cuya unidad del listado no es la base (MTMSGR19: SACO contra base KILO)", () => {
  assert.equal(pickInitialUnit(sack, "SACO").unitId, "SACO");
  assert.equal(pickInitialUnit(sack, "SACO").factor, 45.36);
});

test("pickInitialUnit: sin unidad en la tarjeta usa la del servidor; si la de la tarjeta no está, null", () => {
  assert.equal(pickInitialUnit(beer, null).unitId, "LATA");
  assert.equal(pickInitialUnit(beer, "TARIMA"), null);
  assert.equal(pickInitialUnit(null, "UND"), null);
  assert.equal(pickInitialUnit([], "UND"), null);
});

test("equivalencias: cerveza (Lata/Caja x24)", () => {
  assert.deepEqual(equivalences(beer, "CAJA"), [{ bigUnitId: "CAJA", smallUnitId: "LATA", amount: 24, toBase: false }]);
  assert.deepEqual(equivalences(beer, "LATA"), [{ bigUnitId: "CAJA", smallUnitId: "LATA", amount: 24, toBase: false }]);
});

test("equivalencias: avena (Saco/Tarima x15)", () => {
  assert.deepEqual(equivalences(oats, "TARIMA"), [{ bigUnitId: "TARIMA", smallUnitId: "SACO", amount: 15, toBase: false }]);
  assert.deepEqual(equivalences(oats, "SACO"), [{ bigUnitId: "TARIMA", smallUnitId: "SACO", amount: 15, toBase: false }]);
});

test("equivalencias: Oreo (Displ / Caja x6 / Tarima x390) cambian con la presentación elegida", () => {
  assert.deepEqual(equivalences(oreo, "CAJA"), [
    { bigUnitId: "CAJA", smallUnitId: "DISPL", amount: 6, toBase: false },
    { bigUnitId: "TARIMA", smallUnitId: "CAJA", amount: 65, toBase: false }, // 390 / 6
  ]);
  assert.deepEqual(equivalences(oreo, "TARIMA"), [{ bigUnitId: "TARIMA", smallUnitId: "CAJA", amount: 65, toBase: false }]);
  assert.deepEqual(equivalences(oreo, "DISPL"), [{ bigUnitId: "CAJA", smallUnitId: "DISPL", amount: 6, toBase: false }]);
});

test("equivalencias: cerveza con tarima (1 Tarima = 60 Cajas)", () => {
  const withPallet = [...beer, u("TARIMA", 1440, "LATA")];
  assert.deepEqual(equivalences(withPallet, "CAJA"), [
    { bigUnitId: "CAJA", smallUnitId: "LATA", amount: 24, toBase: false },
    { bigUnitId: "TARIMA", smallUnitId: "CAJA", amount: 60, toBase: false },
  ]);
});

test("equivalencias: factor decimal (45,36) se muestra contra la unidad base, no como entero", () => {
  assert.deepEqual(equivalences(sack, "SACO"), [{ bigUnitId: "SACO", smallUnitId: "KILO", amount: 45.36, toBase: true }]);
});

test("equivalencias: una sola presentación", () => {
  assert.deepEqual(equivalences([u("UND", 1, "UND", { isDefault: true })], "UND"), []);
  // Única presentación que no es la base (listado SACO, base KILO): relación con la base.
  assert.deepEqual(equivalences([u("SACO", 45.36, "KILO", { isDefault: true })], "SACO"), [
    { bigUnitId: "SACO", smallUnitId: "KILO", amount: 45.36, toBase: true },
  ]);
  assert.deepEqual(equivalences(beer, "NOPE"), []);
});

test("equivalencias: relación no entera entre presentaciones cae a la base", () => {
  const odd = [u("UND", 1, "UND"), u("PACK", 6, "UND"), u("CAJA", 20, "UND")]; // 20 / 6 no es entero
  assert.deepEqual(equivalences(odd, "CAJA"), [{ bigUnitId: "CAJA", smallUnitId: "UND", amount: 20, toBase: true }]);
});

test("shortEquivalence y approxBasePrice: solo con la base distinta; precio ≈ presentación ÷ factor", () => {
  assert.deepEqual(shortEquivalence(beer[0]), { amount: 24, unitId: "LATA" });
  assert.equal(shortEquivalence(beer[1]), null);
  assert.deepEqual(approxBasePrice({ ...beer[0], unitPrice: 15108.99705 }), { price: 629.54, unitId: "LATA" });
  assert.equal(approxBasePrice(beer[1]), null);
  assert.equal(approxBasePrice({ ...beer[0], baseUnitId: "" }), null);
});

test("unitName / unitLabel: es y en, singular y plural", () => {
  assert.equal(unitName("LATA", 24, "es"), "latas");
  assert.equal(unitName("CAJA", 1, "es"), "caja");
  assert.equal(unitName("TARIMA", 60, "en"), "pallets");
  assert.equal(unitLabel("UND", "es"), "Unidad");
  assert.equal(unitLabel("CAJA", "en"), "Case");
  assert.equal(unitName("XYZ", 2, "es"), "xyz");
  assert.equal(unitName("GALON", 2, "es"), "galon");
});

test("formatAmount: hasta 2 decimales", () => {
  assert.equal(formatAmount(24, "es"), "24");
  assert.equal(formatAmount(45.36, "es"), "45,36");
  assert.equal(formatAmount(45.36, "en"), "45.36");
});

test("unitName: un decimal va en singular (45,36 kilo) y el título capitaliza el plural", () => {
  assert.equal(unitName("KILO", 45.36, "es"), "kilo");
  assert.equal(unitName("KILO", 2, "es"), "kilos");
  assert.equal(unitTitle("LATA", 24, "es"), "Latas");
  assert.equal(unitTitle("CAJA", 1, "es"), "Caja");
  assert.equal(unitTitle("KILO", 45.36, "es"), "Kilo");
});

test('allEquivalences: siempre todas, sin depender de la presentación elegida', () => {
  const withPallet = [...beer, u('TARIMA', 1440, 'LATA')];
  assert.deepEqual(allEquivalences(withPallet), [
    { bigUnitId: 'CAJA', smallUnitId: 'LATA', amount: 24, toBase: false },
    { bigUnitId: 'TARIMA', smallUnitId: 'CAJA', amount: 60, toBase: false },
  ]);
  assert.deepEqual(allEquivalences(beer), [{ bigUnitId: 'CAJA', smallUnitId: 'LATA', amount: 24, toBase: false }]);
  assert.deepEqual(allEquivalences(oreo).map((e) => [e.bigUnitId, e.smallUnitId, e.amount]), [['CAJA', 'DISPL', 6], ['TARIMA', 'CAJA', 65]]);
  assert.deepEqual(allEquivalences([u('UND', 1, 'UND')]), []);
  assert.deepEqual(allEquivalences(sack), [{ bigUnitId: 'SACO', smallUnitId: 'KILO', amount: 45.36, toBase: true }]);
});
