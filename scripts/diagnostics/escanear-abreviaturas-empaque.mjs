// Script TEMPORAL de solo lectura — ver fix-truncamiento-y-glosario.md.
// Trae el catálogo completo de MercasaVIP y escanea ItemName + Hierarchy4
// buscando patrones de abreviatura de empaque (NNU/P, NNP/C, NNC/T,
// "Display", "Bulto", y cualquier otro patrón "letra(s)/letra(s)" o
// palabra suelta en mayúsculas que se repita) — para confirmar con Isaac
// cuáles hace falta definir en el glosario ANTES de publicarlo, en vez de
// inventar significados no confirmados.
//
// No modifica nada — solo lee. Uso:
// node scripts/diagnostics/escanear-abreviaturas-empaque.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PROJECT_DIR = fileURLToPath(new URL("../..", import.meta.url));

function loadEnvLocal() {
  const raw = readFileSync(`${PROJECT_DIR}/.env.local`, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
for (const key of ["MERCASAVIP_API_BASE", "MERCASAVIP_API_KEY"]) {
  if (!env[key]) {
    console.error(`Falta ${key} en .env.local`);
    process.exit(1);
  }
}

function normalizeLabel(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

async function fetchCatalog() {
  const url = new URL("/Inventory/HE_GetInventoryItemsFMCM", env.MERCASAVIP_API_BASE);
  url.searchParams.set("PriceGroup", "AF");
  url.searchParams.set("AddressId", "-1");

  const res = await fetch(url, {
    headers: { "X-Api-Key": env.MERCASAVIP_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MercasaVIP API respondió ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Patrón "NN + letra(s) / letra(s)" tipo 12U/P, 16P/C, 40C/T, 6PZA/C, etc.
const SLASH_PATTERN = /\b\d{1,4}\s?([A-ZÁÉÍÓÚÑ]{1,5})\s?\/\s?([A-ZÁÉÍÓÚÑ]{1,5})\b/gi;
// Palabras sueltas conocidas mencionadas por Isaac + candidatas genéricas
// de empaque que suelen aparecer sin barra (Display, Bulto, Granel, etc.)
const WORD_CANDIDATES = /\b(display|bulto|granel|fardo|caja|paquete|surtido)\b/gi;

async function main() {
  console.log("Trayendo catálogo completo de MercasaVIP...");
  const rawItems = await fetchCatalog();
  console.log(`${rawItems.length} filas recibidas de la API (item+sucursal).\n`);

  const seenProducts = new Map(); // itemId -> {name, hierarchy4}
  for (const row of rawItems) {
    const itemId = normalizeLabel(row.ItemId);
    if (!itemId || seenProducts.has(itemId)) continue;
    seenProducts.set(itemId, {
      name: normalizeLabel(row.ItemName),
      h4: normalizeLabel(row.Hierarchy4),
    });
  }
  console.log(`${seenProducts.size} productos distintos.\n`);

  const slashPatterns = new Map(); // "U/P" -> {count, examples:Set}
  const wordPatterns = new Map();

  for (const { name, h4 } of seenProducts.values()) {
    const haystack = `${name} ${h4}`;

    for (const match of haystack.matchAll(SLASH_PATTERN)) {
      const key = `${match[1].toUpperCase()}/${match[2].toUpperCase()}`;
      const entry = slashPatterns.get(key) ?? { count: 0, examples: new Set() };
      entry.count++;
      if (entry.examples.size < 3) entry.examples.add(name);
      slashPatterns.set(key, entry);
    }

    for (const match of haystack.matchAll(WORD_CANDIDATES)) {
      const key = match[1].toUpperCase();
      const entry = wordPatterns.get(key) ?? { count: 0, examples: new Set() };
      entry.count++;
      if (entry.examples.size < 3) entry.examples.add(name);
      wordPatterns.set(key, entry);
    }
  }

  console.log("=== PATRONES TIPO 'NNx/x' ENCONTRADOS (ordenados por frecuencia) ===\n");
  const sortedSlash = Array.from(slashPatterns.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [key, { count, examples }] of sortedSlash) {
    console.log(`${key}  (${count} apariciones)`);
    for (const ex of examples) console.log(`    ej: ${ex}`);
  }

  console.log("\n=== PALABRAS SUELTAS DE EMPAQUE ENCONTRADAS ===\n");
  const sortedWords = Array.from(wordPatterns.entries()).sort((a, b) => b[1].count - a[1].count);
  if (sortedWords.length === 0) {
    console.log("(ninguna de las candidatas: display, bulto, granel, fardo, caja, paquete, surtido)");
  }
  for (const [key, { count, examples }] of sortedWords) {
    console.log(`${key}  (${count} apariciones)`);
    for (const ex of examples) console.log(`    ej: ${ex}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
