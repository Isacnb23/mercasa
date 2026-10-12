import assert from "node:assert/strict";
import test from "node:test";
import {
  anchorOf,
  chooseBookLayout,
  findAnchor,
  LAYOUT_CANDIDATES,
  pageSize,
  rowsFor,
  sameLayout,
} from "../book-density.ts";

test("elige el nivel más holgado que quepa", () => {
  assert.deepEqual(chooseBookLayout(() => true), { perPage: 9, level: 1 });
  assert.deepEqual(chooseBookLayout((l) => l.perPage === 9 && l.level >= 2), { perPage: 9, level: 2 });
  assert.deepEqual(chooseBookLayout((l) => l.perPage === 9 && l.level === 3), { perPage: 9, level: 3 });
});

test("solo pasa a 6 tarjetas por hoja cuando ningún nivel de 9 cabe, y ahí vuelve al nivel más holgado", () => {
  assert.deepEqual(chooseBookLayout((l) => l.perPage === 6), { perPage: 6, level: 1 });
  assert.deepEqual(chooseBookLayout((l) => l.perPage === 6 && l.level >= 2), { perPage: 6, level: 2 });
});

test("si nada cabe, el último recurso es 6 tarjetas con el nivel más compacto", () => {
  assert.deepEqual(chooseBookLayout(() => false), { perPage: 6, level: 3 });
});

test("recorre los candidatos en orden, de más a menos holgado, sin repetir", () => {
  const seen = [];
  chooseBookLayout((l) => (seen.push(l), false));
  assert.equal(seen.length, LAYOUT_CANDIDATES.length);
  assert.ok(seen.every((l, i) => sameLayout(l, LAYOUT_CANDIDATES[i])));
  assert.equal(new Set(seen.map((l) => `${l.perPage}/${l.level}`)).size, seen.length);
});

test("filas por hoja: 9 tarjetas = 3 filas, 6 = 2", () => {
  assert.equal(rowsFor(9), 3);
  assert.equal(rowsFor(6), 2);
});

const NOMINAL = { width: 600, height: 820 };

test("tamaño de hoja: limitado por el alto, por el ancho, en vertical y con tope de ancho", () => {
  // Libro de 2 hojas, alto manda: la hoja usa todo el alto de la caja.
  const tall = pageSize({ width: 1200, height: 600 }, false, NOMINAL, 860);
  assert.equal(Math.round(tall.height), 600);
  assert.equal(Math.round(tall.width), 439);
  // Ancho manda: media caja de ancho y alto según la proporción.
  const wide = pageSize({ width: 600, height: 2000 }, false, NOMINAL, 860);
  assert.equal(wide.width, 300);
  assert.equal(Math.round(wide.height), 410);
  // Vertical: una sola hoja del ancho completo.
  const portrait = pageSize({ width: 320, height: 600 }, true, NOMINAL, 860);
  assert.equal(portrait.width, 320);
  assert.equal(Math.round(portrait.height), 437);
  // Tope de ancho de hoja.
  assert.equal(pageSize({ width: 3000, height: 3000 }, false, NOMINAL, 860).width, 860);
});

const pages = (perPage) => {
  const list = [{ kind: "cover" }, { kind: "portfolio-info" }, { kind: "portfolio-visual" }, { kind: "subfamily-divider", subFamily: { id: "S1" } }];
  for (const [id, count] of [["A", 20], ["B", 7]]) {
    const totalParts = Math.ceil(count / perPage);
    for (let part = 1; part <= totalParts; part++) list.push({ kind: "category", category: { id }, part });
  }
  list.push({ kind: "back" });
  return list;
};

test("al cambiar de 9 a 6 tarjetas, el lector sigue en el mismo producto", () => {
  const nine = pages(9); // A: partes 1..3 (0-8, 9-17, 18-19)
  const six = pages(6); //  A: partes 1..4 (0-5, 6-11, 12-17, 18-19)
  const iPart2 = nine.findIndex((p) => p.category?.id === "A" && p.part === 2); // abre en el producto 9
  const anchor = anchorOf(nine[iPart2], 9);
  const idx = findAnchor(six, anchor, 6);
  assert.equal(six[idx].category.id, "A");
  assert.equal(six[idx].part, 2); // producto 9 cae en la parte 2 de 6 (6-11)
  // Y de vuelta a 9 desde la parte 4 de 6 (producto 18).
  const back = findAnchor(nine, anchorOf(six.find((p) => p.category?.id === "A" && p.part === 4), 6), 9);
  assert.equal(nine[back].part, 3);
});

test("las páginas que no son de categoría se reubican por su identidad (portada, divisor, contraportada)", () => {
  const nine = pages(9);
  const six = pages(6);
  for (const i of [0, 1, 2, 3]) assert.equal(findAnchor(six, anchorOf(nine[i], 9), 6), i);
  assert.equal(findAnchor(six, anchorOf(nine[nine.length - 1], 9), 6), six.length - 1);
});

test("un ancla que ya no existe cae en la portada, sin romper", () => {
  assert.equal(findAnchor(pages(9), { key: "category:Z", firstProduct: 0 }, 9), 0);
  assert.equal(anchorOf(undefined, 9), null);
});
