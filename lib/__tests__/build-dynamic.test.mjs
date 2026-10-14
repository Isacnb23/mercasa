// Build determinista: la home (que lee el catálogo con no-store) es dinámica a propósito, las páginas que se
// prerenderizan no llaman a la API, y el respaldo del catálogo es explícito y registrado.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("la home es explícitamente dinámica (lee el catálogo con no-store; no se prerenderiza)", () => {
  assert.match(read("app/[locale]/page.tsx"), /^export const dynamic = "force-dynamic";$/m);
});

test("las páginas que se prerenderizan (legales) no llaman a la API ni usan no-store", () => {
  for (const page of ["app/[locale]/legal/politica-de-privacidad/page.tsx", "app/[locale]/legal/terminos-y-condiciones/page.tsx", "components/sections/legal/LegalPage.tsx"]) {
    const src = read(page);
    assert.doesNotMatch(src, /no-store|mercasavip-catalog|fetch\(|cookies\(|headers\(/, page);
  }
});

test("solo el catálogo del servidor usa fetch no-store en páginas; las rutas /api son dinámicas por naturaleza", () => {
  const loaders = ["components/sections/products/ProductsExplorerLoader.tsx", "components/sections/customer-class/MarketSegmentSectionLoader.tsx"];
  for (const loader of loaders) assert.match(read(loader), /getProductHierarchy/);
  // el único módulo de página que alcanza la API con no-store es el catálogo, y la home que lo usa es force-dynamic
  assert.match(read("lib/mercasavip-catalog.ts"), /cache: "no-store"/);
});

test("el respaldo cmer-only es explícito y registrado, sin datos personales, y se registra al recuperarse", () => {
  const src = read("lib/mercasavip-catalog.ts");
  assert.match(src, /console\.warn\(`\[catalog\] RESPALDO ACTIVO/);
  assert.match(src, /console\.info\("\[catalog\] Catálogo único disponible otra vez/);
  assert.match(src, /let usingFallback = false/);
  assert.doesNotMatch(src.match(/RESPALDO ACTIVO[^`]*`/)[0], /cédula|correo|password|token/i);
});
