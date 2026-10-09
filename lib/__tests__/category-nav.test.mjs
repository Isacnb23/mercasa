// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  activeCategoryId,
  countMenuCategories,
  filterMenuSections,
  normalizeSearch,
  planJump,
  visiblePageIndexes,
} from "../category-nav.ts";

// Libro de 10 páginas (total par, la última va sola):
// 0 portada | 1,2 portafolio | 3 divisor | 4,5 A | 6 B | 7 C | 8,9 D.
const pageCategory = [null, null, null, null, "A", "A", "B", "C", "D", "D"];
const categoryStart = new Map([["A", 4], ["B", 6], ["C", 7], ["D", 8]]);
const base = { totalPages: 10, portrait: false, pageCategory, categoryStart, jumpTarget: null };

test("visiblePageIndexes: portada sola, spreads [1,2],[3,4]..., última sola si el total es par, portrait una", () => {
  assert.deepEqual(visiblePageIndexes(0, 10, false), [0]);
  assert.deepEqual(visiblePageIndexes(1, 10, false), [1, 2]);
  assert.deepEqual(visiblePageIndexes(5, 10, false), [5, 6]);
  assert.deepEqual(visiblePageIndexes(9, 10, false), [9]);
  assert.deepEqual(visiblePageIndexes(5, 10, true), [5]);
});

test("categoría actual: la que EMPIEZA en la página derecha del spread (antes marcaba la anterior)", () => {
  // Spread [5,6]: la página 5 es de A y en la 6 empieza B -> B (antes solo se miraba la izquierda y daba A).
  assert.equal(activeCategoryId({ ...base, currentPage: 5 }), "B");
  // Spread [3,4]: divisor + inicio de A -> A.
  assert.equal(activeCategoryId({ ...base, currentPage: 3 }), "A");
});

test("categoría actual: la que empieza a la derecha, y la última sola es de su categoría", () => {
  assert.equal(activeCategoryId({ ...base, currentPage: 7 }), "D"); // [7,8]: en la 8 empieza D (la 7 es de C)
  assert.equal(activeCategoryId({ ...base, currentPage: 9 }), "D");
});

test("categoría actual: portada y portafolio -> ninguna todavía; luego la última anterior", () => {
  assert.equal(activeCategoryId({ ...base, currentPage: 0 }), null);
  assert.equal(activeCategoryId({ ...base, currentPage: 1 }), null);
});

test("categoría elegida en el menú manda mientras su primera página siga a la vista", () => {
  // C empieza en 7 (izquierda del spread [7,8]) y D empieza en 8 (derecha): sin jumpTarget ganaría D.
  assert.equal(activeCategoryId({ ...base, currentPage: 7, jumpTarget: "C" }), "C");
  // Si el lector pasa de página y C ya no está a la vista, deja de mandar.
  assert.equal(activeCategoryId({ ...base, currentPage: 9, jumpTarget: "C" }), "D");
});

test("portrait: una sola página; la categoría es la de esa página", () => {
  assert.equal(activeCategoryId({ ...base, portrait: true, currentPage: 5 }), "A");
  assert.equal(activeCategoryId({ ...base, portrait: true, currentPage: 6 }), "B");
});

test("elegir una categoría: pasa de página salvo que su primera página ya esté a la vista", () => {
  assert.deepEqual(planJump(8, 1, 10, false), { kind: "flip", page: 8 });
  assert.deepEqual(planJump(6, 5, 10, false), { kind: "stay" }); // B empieza en la derecha del spread actual
  assert.deepEqual(planJump(4, 3, 10, false), { kind: "stay" });
  assert.deepEqual(planJump(4, 5, 10, true), { kind: "flip", page: 4 });
});

const sections = [
  { id: "s1", name: "Bebidas", categories: [{ id: "c1", name: "Café molido", itemCount: 12 }, { id: "c2", name: "Té", itemCount: 4 }] },
  { id: "s2", name: "Electrónica", categories: [{ id: "c3", name: "Televisores", itemCount: 9 }] },
];

test("búsqueda del menú: sin acentos ni mayúsculas, por categoría o sub-familia, sin secciones vacías", () => {
  assert.equal(normalizeSearch("  ELECTRÓNICA "), "electronica");
  assert.deepEqual(filterMenuSections(sections, "cafe").map((s) => s.categories.map((c) => c.id)), [["c1"]]);
  assert.deepEqual(filterMenuSections(sections, "electronica").map((s) => s.categories.map((c) => c.id)), [["c3"]]); // por sub-familia
  assert.deepEqual(filterMenuSections(sections, "zzz"), []);
  assert.equal(filterMenuSections(sections, "").length, 2);
  assert.equal(countMenuCategories(sections), 3);
});
