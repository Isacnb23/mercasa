// Desplegable propio del formulario de direcciones (components/ui/Combobox.tsx + lib/combobox.ts). Datos inventados.
// No hay DOM en el test runner (sin jsdom): el comportamiento con teclado y mouse se prueba en la lógica pura que el
// componente usa para cada tecla, el render con react-dom/server y el cableado con comprobaciones sobre el código.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";

const { COMBOBOX_SEARCH_THRESHOLD, comboboxKeyAction, filterOptions, isSearchable, placeListbox } = loadFromRoot("lib/combobox.ts");
const Combobox = loadFromRoot("components/ui/Combobox.tsx").default;
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

const opts = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Opción ${i + 1}` }));
const base = { open: true, active: 1, count: 5, searchable: false };
const key = (k, over = {}) => comboboxKeyAction(k, { ...base, ...over });

// ---- Búsqueda ----

test("la búsqueda aparece solo con listas largas (cantones y distritos), no con provincias", () => {
  assert.equal(COMBOBOX_SEARCH_THRESHOLD, 8);
  assert.equal(isSearchable(7), false); // provincias
  assert.equal(isSearchable(8), false);
  assert.equal(isSearchable(9), true);
  assert.equal(isSearchable(81), true);
});

test("filtra sin distinguir tildes ni mayúsculas, conserva el orden y sin texto devuelve todo", () => {
  const list = [
    { id: "1", name: "León Cortés" },
    { id: "2", name: "Alajuela" },
    { id: "3", name: "San Pedro" },
    { id: "4", name: "San José" },
  ];
  assert.deepEqual(filterOptions(list, "leon").map((o) => o.id), ["1"]);
  assert.deepEqual(filterOptions(list, "  SAN ").map((o) => o.id), ["3", "4"]);
  assert.deepEqual(filterOptions(list, "jose").map((o) => o.id), ["4"]);
  assert.deepEqual(filterOptions(list, "zzz"), []);
  assert.deepEqual(filterOptions(list, "").map((o) => o.id), ["1", "2", "3", "4"]);
  assert.notEqual(filterOptions(list, ""), list); // copia: no se muta la lista de entrada
});

// ---- Teclado ----

test("flechas: abren si está cerrada y mueven la opción activa sin pasarse de los extremos; no mueven el scroll del panel", () => {
  assert.deepEqual(key("ArrowDown", { open: false }), { action: { type: "open", index: null }, preventDefault: true, stopPropagation: false });
  assert.deepEqual(key("ArrowUp", { open: false }).action, { type: "open", index: null });
  assert.deepEqual(key("ArrowDown").action, { type: "move", index: 2 });
  assert.deepEqual(key("ArrowDown", { active: 4 }).action, { type: "move", index: 4 });
  assert.deepEqual(key("ArrowUp").action, { type: "move", index: 0 });
  assert.deepEqual(key("ArrowUp", { active: 0 }).action, { type: "move", index: 0 });
  assert.equal(key("ArrowDown").preventDefault, true);
  // sin resultados no hay a dónde moverse
  assert.deepEqual(key("ArrowDown", { count: 0, active: -1 }).action, { type: "move", index: -1 });
});

test("Inicio y Fin mueven la opción solo en listas sin búsqueda (con búsqueda mueven el cursor del texto)", () => {
  assert.deepEqual(key("Home").action, { type: "move", index: 0 });
  assert.deepEqual(key("End").action, { type: "move", index: 4 });
  assert.equal(key("Home", { searchable: true }).action.type, "none");
  assert.equal(key("End", { searchable: true }).preventDefault, false);
  assert.equal(key("Home", { open: false }).action.type, "none");
});

test("Enter: elige la opción activa, nunca envía el formulario y cerrada abre la lista", () => {
  assert.deepEqual(key("Enter").action, { type: "select", index: 1 });
  assert.equal(key("Enter").preventDefault, true);
  assert.deepEqual(key("Enter", { open: false }).action, { type: "open", index: null });
  assert.equal(key("Enter", { open: false }).preventDefault, true);
  // abierta sin resultados: no elige nada pero tampoco envía el formulario
  const empty = key("Enter", { count: 0, active: -1 });
  assert.equal(empty.action.type, "none");
  assert.equal(empty.preventDefault, true);
});

test("Espacio: como un select nativo sin búsqueda; con búsqueda es un carácter más del texto", () => {
  assert.deepEqual(key(" ").action, { type: "select", index: 1 });
  assert.deepEqual(key(" ", { open: false }).action, { type: "open", index: null });
  assert.equal(key(" ", { searchable: true }).action.type, "none");
  assert.equal(key(" ", { searchable: true }).preventDefault, false);
});

test("Escape: abierta cierra SOLO la lista (no llega al panel); cerrada sigue su camino y cierra el panel", () => {
  assert.deepEqual(key("Escape"), { action: { type: "close" }, preventDefault: true, stopPropagation: true });
  assert.deepEqual(key("Escape", { open: false }), { action: { type: "none" }, preventDefault: false, stopPropagation: false });
});

test("Tab cierra la lista sin atrapar el foco; otras teclas no hacen nada", () => {
  assert.deepEqual(key("Tab"), { action: { type: "close" }, preventDefault: false, stopPropagation: false });
  assert.equal(key("Tab", { open: false }).action.type, "none");
  for (const k of ["a", "Backspace", "ArrowLeft", "Shift"]) assert.equal(key(k).action.type, "none");
});

// ---- Posición de la lista ----

test("la lista va debajo del campo si cabe y arriba si no, y nunca más alta que el espacio libre", () => {
  assert.deepEqual(placeListbox({ top: 100, bottom: 148 }, 800), { placement: "below", maxHeight: 288 });
  // poco sitio abajo y más arriba: se abre hacia arriba
  assert.deepEqual(placeListbox({ top: 600, bottom: 648 }, 700), { placement: "above", maxHeight: 288 });
  // poco sitio en ambos lados (teclado en pantalla): se elige el mayor y se acota
  const tight = placeListbox({ top: 120, bottom: 168 }, 330);
  assert.equal(tight.placement, "below");
  assert.ok(tight.maxHeight >= 96 && tight.maxHeight <= 288);
  const above = placeListbox({ top: 300, bottom: 348 }, 360);
  assert.equal(above.placement, "above");
});

// ---- Render ----

const props = (over = {}) => ({
  id: "canton",
  label: "Cantón",
  value: "",
  options: opts(3),
  onChange: () => {},
  placeholder: "Seleccioná una opción",
  loadingText: "Cargando...",
  searchPlaceholder: "Escribí para buscar",
  emptyText: "Sin resultados",
  ...over,
});
const render = (over) => renderToHtml(React.createElement(Combobox, props(over)));

test("render: etiqueta asociada al campo, rol combobox, cerrado y sin lista en el DOM", () => {
  const html = render();
  assert.match(html, /<label[^>]*for="canton"[^>]*>Cantón<\/label>/);
  assert.match(html, /<input[^>]*id="canton"[^>]*role="combobox"|<input[^>]*role="combobox"[^>]*id="canton"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-autocomplete="none"/);
  assert.match(html, /readOnly=""|readonly=""/); // lista corta: sin escribir
  assert.match(html, /placeholder="Seleccioná una opción"/);
  assert.doesNotMatch(html, /role="listbox"/); // la lista se pinta solo al abrir, en un portal
  assert.doesNotMatch(html, /aria-controls|aria-activedescendant/);
});

test("render: valor inicial (editar una dirección) muestra el nombre de la opción elegida", () => {
  const html = render({ value: "2" });
  assert.match(html, /value="Opción 2"/);
  assert.doesNotMatch(html, /value="Opción 1"/);
  // un valor que no está en la lista no inventa texto
  assert.match(render({ value: "999" }), /value=""/);
});

test("render: lista larga permite escribir (búsqueda); lista corta no", () => {
  const long = render({ options: opts(30) });
  assert.match(long, /aria-autocomplete="list"/);
  assert.doesNotMatch(long, /readOnly=""|readonly=""/);
  assert.match(render({ options: opts(5) }), /readOnly=""|readonly=""/);
});

test("render: deshabilitado (sin padre), cargando y sin opciones; el estado de carga y el de error se anuncian", () => {
  assert.match(render({ disabled: true }), /<input[^>]*disabled=""/);
  assert.match(render({ options: [] }), /<input[^>]*disabled=""/);
  const loading = render({ loading: true, options: [] });
  assert.match(loading, /<input[^>]*disabled=""/);
  assert.match(loading, /placeholder="Cargando\.\.\."/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /animate-spin/);

  const failed = render({ options: [], error: "No se pudieron cargar las opciones." });
  assert.match(failed, /No se pudieron cargar las opciones\./);
  assert.match(failed, /aria-describedby="[^"]+"/);
  assert.doesNotMatch(render(), /aria-describedby/);
  assert.doesNotMatch(render(), /aria-busy/);
});

// ---- Cableado en el código ----

test("el componente cablea ARIA, teclado, foco y portal como se espera", () => {
  const src = read("components/ui/Combobox.tsx");
  // roles y estados
  assert.match(src, /role="combobox"/);
  assert.match(src, /role="listbox"/);
  assert.match(src, /role="option"/);
  assert.match(src, /aria-selected=\{isSelected\}/);
  assert.match(src, /aria-activedescendant=\{isOpen && active >= 0 \? optionId\(active\) : undefined\}/);
  assert.match(src, /aria-controls=\{isOpen \? listId : undefined\}/);
  assert.match(src, /<label id=\{labelId\} htmlFor=\{id\}/);
  assert.match(src, /aria-labelledby=\{labelId\}/);
  // el foco se queda en el campo: la lista no roba el foco y tocarla no lo quita
  assert.match(src, /onMouseDown=\{\(e\) => e\.preventDefault\(\)\}/);
  assert.doesNotMatch(src, /tabIndex/);
  // Escape con la lista abierta no cierra el panel
  assert.match(src, /if \(stopPropagation\) e\.stopPropagation\(\)/);
  // la lista flota fuera del panel con scroll, encima del panel (z 310) y con su propio scroll
  assert.match(src, /createPortal\(/);
  assert.match(src, /document\.body/);
  assert.match(src, /fixed z-\[330\]/);
  assert.match(src, /data-lenis-prevent/);
  assert.match(src, /overscroll-contain/);
  // se recoloca al hacer scroll del panel o redimensionar, y un toque fuera la cierra
  assert.match(src, /addEventListener\("scroll", update, true\)/);
  assert.match(src, /addEventListener\("pointerdown", onPointerDown\)/);
  // misma apariencia que los demás campos del panel
  assert.match(src, /FIELD_CLASS/);
  assert.match(src, /shadow-\[0_14px_36px_-8px_rgba\(8,43,92,0\.28\)\]/);
  // indicador de la opción elegida y resaltado de la activa
  assert.match(src, /isSelected && <Check/);
  assert.match(src, /background: isActive \? SELECTED_BG : undefined/);
  // sin dependencias nuevas de UI
  assert.doesNotMatch(src, /from "(@radix-ui|@headlessui|downshift|react-select|cmdk)/);
});

test("el formulario usa el desplegable propio en provincia, cantón, distrito y ciudad y ya no hay <select> ni <option>", () => {
  const flow = read("components/profile/AddressFlow.tsx");
  assert.doesNotMatch(flow, /<select|<option/);
  assert.match(flow, /import Combobox from "@\/components\/ui\/Combobox"/);
  for (const id of ["province", "canton", "district", "city"]) assert.match(flow, new RegExp(`"${id}",`));
  assert.equal((flow.match(/<Combobox/g) ?? []).length, 1); // un solo punto, usado por los cuatro niveles
  // bloqueado sin padre, cargando y error de carga siguen igual que antes
  assert.match(flow, /disabled=\{locked\}/);
  assert.match(flow, /loading=\{state\.loading\}/);
  assert.match(flow, /error=\{state\.failed \? t\("optionsError"\) : null\}/);
});

test("la cascada se conserva: cambiar un nivel reinicia los de abajo y apaga el prellenado desde ese nivel", () => {
  const flow = read("components/profile/AddressFlow.tsx");
  const handler = (id) => {
    const start = flow.indexOf(`"${id}",`);
    return flow.slice(start, flow.indexOf("      )}", start));
  };
  const resets = { province: ["setCantonSel", "setDistrictSel", "setCitySel"], canton: ["setDistrictSel", "setCitySel"], district: ["setCitySel"], city: [] };
  const levels = { province: 1, canton: 2, district: 3, city: 4 };
  for (const [id, children] of Object.entries(resets)) {
    const code = handler(id);
    for (const child of children) assert.match(code, new RegExp(`${child}\\(""\\)`), `${id} reinicia ${child}`);
    assert.match(code, new RegExp(`disablePrefill\\(${levels[id]}\\)`));
  }
  // el cantón sigue bloqueado hasta tener provincia, el distrito hasta tener cantón, la ciudad hasta tener distrito
  assert.match(handler("canton"), /!provinceId/);
  assert.match(handler("district"), /!cantonId/);
  assert.match(flow, /cities,\s+!districtId/);
});

test("llaves nuevas del desplegable: presentes y con texto en es y en", () => {
  const es = JSON.parse(read("messages/es.json")).Profile.address;
  const en = JSON.parse(read("messages/en.json")).Profile.address;
  for (const k of ["searchPlaceholder", "noResults"]) {
    assert.ok(es[k]?.trim() && en[k]?.trim(), k);
  }
  assert.equal(es.noResults, "Sin resultados");
  assert.equal(en.noResults, "No results");
});
