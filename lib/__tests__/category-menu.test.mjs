// Menú "Ir a categoría": roles accesibles, categoría actual marcada, conteos y búsqueda (solo con más de 10
// categorías). Renderiza el componente con react-dom/server (ver helpers/load-tsx.mjs). La navegación (a qué
// página lleva cada opción) está cubierta en category-nav.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { loadFromRoot, renderToHtml, React } from "./helpers/load-tsx.mjs";

const CategoryMenu = loadFromRoot("components/modals/product-catalog/CategoryMenu.tsx").default;

const labels = {
  button: "Ir a categoría",
  title: "Categorías",
  searchPlaceholder: "Buscar categoría",
  searchEmpty: "Sin resultados",
  current: "Categoría actual",
  products: (count) => `${count} productos`,
};

const sectionOf = (id, name, count, start = 0) => ({
  id,
  name,
  categories: Array.from({ length: count }, (_, i) => ({ id: `${id}-c${start + i}`, name: `Categoría ${start + i}`, itemCount: 3 + i })),
});

const render = (props) =>
  renderToHtml(
    React.createElement(CategoryMenu, {
      sections: [sectionOf("s1", "Bebidas", 3), sectionOf("s2", "Lácteos", 2, 3)],
      activeCategoryId: "s1-c1",
      open: true,
      onOpenChange: () => {},
      onSelect: () => {},
      labels,
      ...props,
    })
  );

test("cerrado: solo el botón, anuncia un listbox y no está expandido", () => {
  const html = render({ open: false });
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="listbox"/);
});

test("abierto: listbox con opciones, la categoría actual marcada y el conteo de productos", () => {
  const html = render({});
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /role="listbox"/);
  assert.equal([...html.matchAll(/role="option"/g)].length, 5);
  const selected = [...html.matchAll(/role="option" aria-selected="true"[^>]*>(.*?)<\/div>/g)];
  assert.equal(selected.length, 1);
  assert.match(selected[0][1], /Categoría 1/);
  assert.match(selected[0][1], /4 productos/); // 3 + índice 1
  assert.equal([...html.matchAll(/aria-selected="false"/g)].length, 4);
});

test("las categorías van agrupadas por sub-familia con rol group; una sola sección no repite el título", () => {
  const html = render({});
  assert.equal([...html.matchAll(/role="group"/g)].length, 2);
  assert.match(html, />Bebidas</);
  assert.match(html, />Lácteos</);
  const single = render({ sections: [sectionOf("s1", "Bebidas", 3)] });
  assert.doesNotMatch(single, />Bebidas</);
});

test("buscador: solo con más de 10 categorías", () => {
  assert.doesNotMatch(render({}), /role="combobox"/);
  const many = render({ sections: [sectionOf("s1", "Bebidas", 6), sectionOf("s2", "Lácteos", 5, 6)] }); // 11
  assert.match(many, /role="combobox"/);
  assert.match(many, /placeholder="Buscar categoría"/);
  const ten = render({ sections: [sectionOf("s1", "Bebidas", 5), sectionOf("s2", "Lácteos", 5, 5)] }); // 10
  assert.doesNotMatch(ten, /role="combobox"/);
});

test("sin categoría actual (portada): ninguna opción marcada", () => {
  const html = render({ activeCategoryId: null });
  assert.equal([...html.matchAll(/aria-selected="true"/g)].length, 0);
});

test("el botón tiene el mismo estilo compacto que Glosario (píldora con borde) y nombre accesible", () => {
  const html = render({ open: false });
  assert.match(html, /rounded-full border px-3 py-1\.5 text-\[13\.5px\] font-semibold/);
  assert.match(html, /aria-label="Ir a categoría"/);
});
