// Cargador de pruebas: transpila .ts/.tsx con el `typescript` ya instalado y los ejecuta en memoria (CommonJS),
// para renderizar componentes con react-dom/server sin agregar dependencias de prueba. Resuelve el alias "@/".
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const nodeRequire = createRequire(import.meta.url);
const cache = new Map();

function resolveFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`No se pudo resolver ${base}`);
}

export function loadModule(file) {
  const abs = path.resolve(file);
  if (cache.has(abs)) return cache.get(abs).exports;

  const source = fs.readFileSync(abs, "utf8");
  const output = ts.transpileModule(source, {
    fileName: abs,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  cache.set(abs, mod);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadModule(resolveFile(path.join(root, specifier.slice(2))));
    if (specifier.startsWith(".")) return loadModule(resolveFile(path.resolve(path.dirname(abs), specifier)));
    return nodeRequire(specifier);
  };
  new Function("require", "module", "exports", output)(localRequire, mod, mod.exports);
  return mod.exports;
}

export function loadFromRoot(relative) {
  return loadModule(path.join(root, relative));
}

export function renderToHtml(element) {
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  return renderToStaticMarkup(element);
}

export const React = nodeRequire("react");

// Sustituye un módulo del proyecto (ruta relativa a la raíz) por un doble de prueba. Sirve para lo que no se puede
// cargar fuera de Next (p. ej. "i18n/navigation", que depende de next/navigation). Llamar ANTES de cargar quien lo importa.
export function stubModule(relative, exports) {
  const abs = path.resolve(root, relative);
  const file = [abs, `${abs}.ts`, `${abs}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  cache.set(file ?? abs, { exports });
}
