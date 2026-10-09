// Navegación del libro (menú "Ir a categoría"): una sola navegación a la vez, sin mezclar animaciones.
import test from "node:test";
import assert from "node:assert/strict";
import { createBookNavigator } from "../book-navigator.ts";
import { categoryLanding, planJump, spreadIndexOfPage } from "../category-nav.ts";

// Libro de 11 páginas (total impar, con contraportada): 0 portada | 1,2 portafolio | 3 divisor | 4,5 A | 6 B | 7 C | 8,9 D | 10 contraportada.
const TOTAL = 11;

function fakeBook(state = "read") {
  const calls = [];
  return {
    calls,
    state,
    flip: (page) => calls.push(["flip", page]),
    turnToPage: (page) => calls.push(["turn", page]),
    getState() {
      return this.state;
    },
  };
}

function setup({ currentPage = 1, portrait = false, state = "read", reduced = false } = {}) {
  const book = fakeBook(state);
  const view = { currentPage, totalPages: TOTAL, portrait };
  const busy = [];
  const navigator = createBookNavigator({
    plan: planJump,
    getBook: () => book,
    getView: () => view,
    reducedMotion: () => reduced,
    onBusyChange: (b) => busy.push(b),
    watchdogMs: 0,
  });
  return { book, view, navigator, busy };
}

test("aterrizaje: categoría que empieza en página IMPAR queda a la izquierda de su spread", () => {
  assert.deepEqual(categoryLanding(5, TOTAL, false), { spreadIndex: 3, pages: [5, 6], side: "left" });
  assert.deepEqual(categoryLanding(7, TOTAL, false), { spreadIndex: 4, pages: [7, 8], side: "left" });
});

test("aterrizaje: categoría que empieza en página PAR queda a la derecha y el spread se muestra completo", () => {
  assert.deepEqual(categoryLanding(4, TOTAL, false), { spreadIndex: 2, pages: [3, 4], side: "right" });
  assert.deepEqual(categoryLanding(6, TOTAL, false), { spreadIndex: 3, pages: [5, 6], side: "right" });
});

test("aterrizaje: extremos (primera categoría, última y portada) y portrait", () => {
  assert.deepEqual(categoryLanding(4, TOTAL, false).pages, [3, 4]); // primera categoría
  assert.deepEqual(categoryLanding(8, TOTAL, false), { spreadIndex: 4, pages: [7, 8], side: "right" }); // última categoría D empieza en 8 (par)
  assert.deepEqual(categoryLanding(0, TOTAL, false), { spreadIndex: 0, pages: [0], side: "single" }); // portada
  assert.deepEqual(categoryLanding(6, TOTAL, true), { spreadIndex: 6, pages: [6], side: "single" });
  // Con total impar nunca hay una página final sola: el último spread es [9,10].
  assert.deepEqual(categoryLanding(9, TOTAL, false).pages, [9, 10]);
});

test("el spread de aterrizaje siempre contiene la primera página de la categoría", () => {
  for (const portrait of [false, true]) {
    for (let page = 0; page < TOTAL; page++) {
      const landing = categoryLanding(page, TOTAL, portrait);
      assert.ok(landing.pages.includes(page), `página ${page} portrait=${portrait}`);
      assert.equal(landing.spreadIndex, spreadIndexOfPage(page, portrait));
    }
  }
});

test("plan: ya a la vista, un spread (animar) o varios (directo)", () => {
  assert.deepEqual(planJump(6, 5, TOTAL, false), { kind: "stay" });
  assert.deepEqual(planJump(7, 5, TOTAL, false), { kind: "animate", page: 7 }); // spread [5,6] -> [7,8]
  assert.deepEqual(planJump(8, 1, TOTAL, false), { kind: "turn", page: 8 });
  assert.deepEqual(planJump(9, 0, TOTAL, false), { kind: "turn", page: 9 });
});

test("elegir una categoría llama UNA sola vez a la navegación con el índice correcto", () => {
  const { book, navigator, busy } = setup({ currentPage: 1 });
  assert.equal(navigator.go(8), "turn");
  assert.deepEqual(book.calls, [["turn", 8]]); // varios spreads: directo, sin animación larga
  assert.equal(navigator.isBusy(), false);
  assert.deepEqual(busy, [true, false]);
});

test("un spread de distancia se anima con UN flip y queda ocupado hasta que el libro vuelve a reposo", () => {
  const { book, navigator } = setup({ currentPage: 5 });
  assert.equal(navigator.go(7), "animate");
  assert.deepEqual(book.calls, [["flip", 7]]);
  assert.equal(navigator.isBusy(), true);
  navigator.onIdle();
  assert.equal(navigator.isBusy(), false);
  assert.equal(book.calls.length, 1);
});

test("con una animación en curso NO se dispara otra: se encola y se aplica al volver a reposo (gana la última)", () => {
  const { book, view, navigator } = setup({ currentPage: 5 });
  assert.equal(navigator.go(7), "animate");
  assert.equal(navigator.go(4), "queued"); // ya navegando
  assert.equal(navigator.go(9), "queued"); // reemplaza a la anterior
  assert.deepEqual(book.calls, [["flip", 7]]); // ninguna mezcla encima
  assert.equal(navigator.hasPending(), true);

  view.currentPage = 7; // el libro llegó a [7,8]
  navigator.onIdle();
  assert.equal(book.calls.length, 2);
  assert.deepEqual(book.calls[0], ["flip", 7]);
  assert.equal(book.calls[1][1], 9);
  assert.equal(navigator.hasPending(), false);
});

test("si el libro está animando por su cuenta (flechas/esquina), la petición espera", () => {
  const { book, navigator } = setup({ currentPage: 5, state: "flipping" });
  assert.equal(navigator.go(8), "queued");
  assert.deepEqual(book.calls, []);
  book.state = "read";
  navigator.onIdle();
  assert.equal(book.calls.length, 1);
});

test("destino ya a la vista: no hace nada (solo se marca como actual)", () => {
  const { book, navigator } = setup({ currentPage: 5 });
  assert.equal(navigator.go(6), "stay");
  assert.deepEqual(book.calls, []);
  assert.equal(navigator.isBusy(), false);
});

test("movimiento reducido: sin animación aunque sea un spread de distancia", () => {
  const { book, navigator } = setup({ currentPage: 5, reduced: true });
  assert.equal(navigator.go(7), "turn");
  assert.deepEqual(book.calls, [["turn", 7]]);
});

test("el salto directo puede envolverse con un fundido: no navega hasta aplicarlo", () => {
  const book = fakeBook();
  const view = { currentPage: 1, totalPages: TOTAL, portrait: false };
  let applyLater = null;
  const navigator = createBookNavigator({
    plan: planJump,
    getBook: () => book,
    getView: () => view,
    reducedMotion: () => false,
    turn: (_page, apply) => {
      applyLater = apply;
    },
    watchdogMs: 0,
  });
  assert.equal(navigator.go(8), "turn");
  assert.deepEqual(book.calls, []);
  assert.equal(navigator.isBusy(), true);
  assert.equal(navigator.go(5), "queued"); // mientras se funde no entra otra
  applyLater();
  assert.deepEqual(book.calls, [["turn", 8]]);
});

test("sin libro (todavía no montó): se ignora", () => {
  const navigator = createBookNavigator({ plan: planJump, getBook: () => null, getView: () => ({ currentPage: 0, totalPages: TOTAL, portrait: false }), reducedMotion: () => false, watchdogMs: 0 });
  assert.equal(navigator.go(5), "ignored");
});
