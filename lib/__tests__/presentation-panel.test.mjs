// Estabilidad del modal de producto: al alternar presentaciones, la ESTRUCTURA del panel (nodos y clases de las
// líneas reservadas) no cambia; solo cambian textos, resaltado y precio. Renderiza el componente puro con
// react-dom/server (ver helpers/load-tsx.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";

const Panel = loadFromRoot("components/modals/product-catalog/PresentationPanel.tsx").default;

const u = (unitId, factor, baseUnitId, unitPrice, extra = {}) => ({
  unitId,
  label: unitId,
  unitPrice,
  tax: 0,
  factor,
  baseUnitId,
  available: 10,
  isDefault: false,
  ...extra,
});

const beer = [u("LATA", 1, "LATA", 629.54, { isDefault: true }), u("CAJA", 24, "LATA", 15108.99)];
const oats = [u("SACO", 1, "SACO", 19733.68, { isDefault: true }), u("TARIMA", 15, "SACO", 295265.14)];
const oreo = [u("DISPL", 1, "DISPL", 1813.15, { isDefault: true }), u("CAJA", 6, "DISPL", 10878.9), u("TARIMA", 390, "DISPL", 705361.53)];
const single = [u("UND", 1, "UND", 500, { isDefault: true })];

const labels = {
  selector: "Presentación",
  equivalenceTitle: "Equivalencias",
  vat: "IVA incluido",
  priceVatIncluded: (p) => `${p} IVA incluido`,
  perUnit: (unit) => `por ${unit}`,
  approx: (p, unit) => `≈ ${p} por ${unit}`,
  equivalence: (big, amount, small) => `1 ${big} = ${amount} ${small}`,
  soldBy: (unit) => `Se vende por ${unit}`,
};

const render = (units, selectedUnitId) =>
  renderToHtml(
    React.createElement(Panel, {
      units,
      selectedUnitId,
      onSelect: () => {},
      locale: "es",
      formatPrice: (n) => `₡${n.toFixed(2)}`,
      formatTotal: (n) => `₡${n}`,
      labels,
    })
  );

// Estructura: sin estilos en línea (el resaltado), sin estado de selección y sin textos.
const skeleton = (html) =>
  html
    .replace(/ style="[^"]*"/g, "")
    .replace(/ aria-(?:checked|current|hidden)="[^"]*"/g, "")
    .replace(/ tabindex="[^"]*"/g, "")
    .replace(/>[^<]*</g, "><");

const slots = (html, name) => [...html.matchAll(new RegExp(`data-slot="${name}"`, "g"))].length;

const stable = (label, units) => {
  test(`el panel no cambia de estructura al alternar presentaciones: ${label}`, () => {
    const reference = skeleton(render(units, units[0].unitId));
    for (const unit of units) {
      const html = render(units, unit.unitId);
      assert.equal(skeleton(html), reference, `cambió la estructura al elegir ${unit.unitId}`);
      // Las líneas reservadas siguen presentes aunque no apliquen.
      for (const slot of ["price", "price-main", "per-unit", "approx", "selector", "equivalences"]) assert.equal(slots(html, slot), 1, slot);
      assert.equal(slots(html, "card"), units.length);
      assert.equal(slots(html, "card-eq"), units.length);
      assert.equal(slots(html, "eq-line"), units.length - 1);
    }
  });
};

stable("cerveza (Lata/Caja)", beer);
stable("avena (Saco/Tarima)", oats);
stable("Oreo (Displ/Caja/Tarima)", oreo);

test("equivalencias: SIEMPRE todas, con la elegida resaltada (mismo texto en cualquier selección)", () => {
  const lines = (html) => [...html.matchAll(/data-slot="eq-line"[^>]*>([^<]*)</g)].map((m) => m[1]);
  const a = lines(render(oreo, "DISPL"));
  const b = lines(render(oreo, "TARIMA"));
  assert.deepEqual(a, ["1 Caja = 6 Displays", "1 Tarima = 65 Cajas"]);
  assert.deepEqual(b, a);
  // aria-current marca solo las líneas de la presentación elegida.
  const current = (html) => [...html.matchAll(/data-slot="eq-line"[^>]*aria-current="true"[^>]*>([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(current(render(oreo, "CAJA")), ["1 Caja = 6 Displays", "1 Tarima = 65 Cajas"]);
  assert.deepEqual(current(render(oreo, "TARIMA")), ["1 Tarima = 65 Cajas"]);
  assert.deepEqual(current(render(oreo, "DISPL")), ["1 Caja = 6 Displays"]);
});

test("la línea '≈ por Lata' reserva su alto: texto con Caja y espacio vacío con la base (misma clase)", () => {
  const approxTag = (html) => /<span class="([^"]*)"[^>]*data-slot="approx"[^>]*>([^<]*)</.exec(html);
  const withCase = approxTag(render(beer, "CAJA"));
  const withBase = approxTag(render(beer, "LATA"));
  assert.ok(withCase[1].includes("min-h-[20px]"));
  assert.equal(withBase[1], withCase[1]);
  assert.match(withCase[2], /≈ ₡629\.54 por lata/);
  assert.equal(withBase[2].trim(), "");
});

test("las tarjetas del selector miden lo mismo y todas traen su línea de equivalencia reservada", () => {
  const html = render(beer, "LATA");
  const classes = [...html.matchAll(/<button[^>]*data-slot="card"[^>]*class="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(classes.length, 2);
  assert.equal(classes[0], classes[1]);
  assert.ok(classes[0].includes("min-h-[76px]"));
  const eq = [...html.matchAll(/class="([^"]*)"[^>]*data-slot="card-eq"[^>]*>([^<]*)</g)];
  assert.equal(eq.length, 2);
  assert.equal(eq[0][1], eq[1][1]);
  assert.equal(eq[0][2].trim(), ""); // la Lata (base) no trae equivalencia, pero la línea existe
  assert.equal(eq[1][2], "24 latas");
});

test("una sola presentación: sin selector y una línea fija 'Se vende por Unidad' en lugar de quitar el bloque", () => {
  const html = render(single, "UND");
  assert.equal(slots(html, "selector"), 0);
  assert.equal(slots(html, "equivalences"), 1);
  assert.equal(slots(html, "eq-line"), 1);
  assert.match(html, /Se vende por Unidad/);
  assert.equal(slots(html, "approx"), 1);
});

test("el selector es un grupo de opciones accesible: radiogroup + radio con aria-checked", () => {
  const html = render(oreo, "CAJA");
  assert.match(html, /role="radiogroup"/);
  assert.equal([...html.matchAll(/role="radio"/g)].length, 3);
  assert.equal([...html.matchAll(/aria-checked="true"/g)].length, 1);
  assert.match(html, /data-unit="CAJA"[^>]*>|aria-checked="true"[^>]*data-slot="card"[^>]*data-unit="CAJA"/);
});

test("precio con IVA: cada presentación muestra SU precio + SU IVA (nunca el de la base × factor), en colones enteros", () => {
  const withTax = [
    u("LATA", 1, "LATA", 629.54, { isDefault: true, tax: 81.84 }), // 711,38 -> 711
    u("CAJA", 24, "LATA", 15108.99, { tax: 1964.17 }), // 17073,16 -> 17073 (24 x 711 = 17064: no es base x factor)
  ];
  const big = (html) => /data-slot="price-main"[^>]*>\s*<span[^>]*>([^<]*)</.exec(html)[1];
  const cards = (html) => [...html.matchAll(/data-slot="card"[\s\S]*?<span[^>]*tabular-nums[^>]*>([^<]*)</g)].map((m) => m[1]);
  const lata = render(withTax, "LATA");
  const caja = render(withTax, "CAJA");
  assert.equal(big(lata), "₡711");
  assert.equal(big(caja), "₡17073");
  assert.deepEqual(cards(lata), ["₡711 IVA incluido", "₡17073 IVA incluido"]);
  assert.match(lata, /IVA incluido<\/span>/);
  assert.doesNotMatch(lata, /\+ IVA/);
  // El "≈ por lata" sale del TOTAL de la caja (17073,16 ÷ 24 = 711,38), no del precio sin IVA.
  assert.match(caja, /≈ ₡711.38 por lata/);
});
