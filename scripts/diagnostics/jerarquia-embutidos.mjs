// Script TEMPORAL de solo lectura — ver diagnostico-jerarquia-embutidos.md.
// Trae el catálogo completo de MercasaVIP (HE_GetInventoryItemsFMCM) y:
//   1. Imprime el árbol completo Familia -> Sub-familia -> Categoría ->
//      Sub-categoría de la familia "Alimentos".
//   2. Busca "embutid" (case/acento-insensitive) en CUALQUIER nivel de
//      TODA la jerarquía (no solo Alimentos), por si existiera en otra
//      familia o mal ubicada.
//   3. Busca productos con nombre que contenga "SALCHICHA" o "TOCINETA" y
//      muestra sus valores de Hierarchy1-4 tal cual los devuelve la API,
//      sin interpretar.
//
// No modifica nada — no toca lib/mercasavip-catalog.ts ni ningún código de
// producción. Solo lee. Uso: node scripts/diagnostics/jerarquia-embutidos.mjs

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

function stripAccents(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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

async function main() {
  console.log("Trayendo catálogo completo de MercasaVIP...");
  const rawItems = await fetchCatalog();
  console.log(`${rawItems.length} filas recibidas de la API (item+sucursal).\n`);

  // --- 1. Árbol completo de "Alimentos" ---
  const tree = new Map(); // h1 -> h2 -> h3 -> Set(h4)
  for (const row of rawItems) {
    const h1 = normalizeLabel(row.Hierarchy1);
    const h2 = normalizeLabel(row.Hierarchy2);
    const h3 = normalizeLabel(row.Hierarchy3);
    const h4 = normalizeLabel(row.Hierarchy4);
    if (!h1) continue;
    if (!tree.has(h1)) tree.set(h1, new Map());
    const h1Map = tree.get(h1);
    if (!h2) continue;
    if (!h1Map.has(h2)) h1Map.set(h2, new Map());
    const h2Map = h1Map.get(h2);
    if (!h3) continue;
    if (!h2Map.has(h3)) h2Map.set(h3, new Set());
    if (h4) h2Map.get(h3).add(h4);
  }

  console.log("=== ÁRBOL COMPLETO: familia \"Alimentos\" (Hierarchy1 -> 2 -> 3 -> 4) ===\n");
  for (const [h1, h1Map] of tree) {
    if (stripAccents(h1) !== "alimentos") continue;
    console.log(`FAMILIA: ${h1}`);
    for (const [h2, h2Map] of h1Map) {
      console.log(`  SUB-FAMILIA: ${h2}`);
      for (const [h3, h4Set] of h2Map) {
        console.log(`    CATEGORIA: ${h3}${h4Set.size ? "" : "  (sin Hierarchy4)"}`);
        for (const h4 of h4Set) {
          console.log(`      H4: ${h4}`);
        }
      }
    }
  }

  // --- 2. Buscar "embutid" en CUALQUIER nivel, cualquier familia ---
  console.log('\n=== BÚSQUEDA: "embutid" en cualquier nivel de TODA la jerarquía ===\n');
  const embutidoMatches = new Set();
  for (const row of rawItems) {
    for (const field of ["Hierarchy1", "Hierarchy2", "Hierarchy3", "Hierarchy4"]) {
      const val = normalizeLabel(row[field]);
      if (val && stripAccents(val).includes("embutid")) {
        embutidoMatches.add(`${field} = "${val}"`);
      }
    }
  }
  if (embutidoMatches.size === 0) {
    console.log('No se encontró NINGÚN valor que contenga "embutid" en Hierarchy1-4, en ninguna familia.');
  } else {
    for (const m of embutidoMatches) console.log(`  ${m}`);
  }

  // --- 3. Productos "SALCHICHA"/"TOCINETA" — jerarquía exacta tal cual la API ---
  console.log('\n=== PRODUCTOS "SALCHICHA" / "TOCINETA" — jerarquía exacta ===\n');
  const seen = new Set();
  for (const row of rawItems) {
    const name = normalizeLabel(row.ItemName);
    const upper = stripAccents(name);
    if (!upper.includes("salchicha") && !upper.includes("tocineta")) continue;
    const key = row.ItemId;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`ItemId: ${row.ItemId}`);
    console.log(`  ItemName:   ${name}`);
    console.log(`  Hierarchy1: "${normalizeLabel(row.Hierarchy1)}"`);
    console.log(`  Hierarchy2: "${normalizeLabel(row.Hierarchy2)}"`);
    console.log(`  Hierarchy3: "${normalizeLabel(row.Hierarchy3)}"`);
    console.log(`  Hierarchy4: "${normalizeLabel(row.Hierarchy4)}"`);
    console.log(`  Hierarchy5: "${normalizeLabel(row.Hierarchy5)}"`);
    console.log("");
  }
  console.log(`Total de ItemId distintos encontrados: ${seen.size}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
