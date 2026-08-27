// Script TEMPORAL de solo lectura — ver listar-subfamilias-completo.md.
// Trae el catálogo completo de MercasaVIP (HE_GetInventoryItemsFMCM) y lista
// Familia -> Sub-familia con conteo de productos distintos (ItemId), para
// planificar cuántas imágenes divisoras hacen falta y con qué nombre exacto.
//
// No modifica nada — no toca lib/mercasavip-catalog.ts ni ningún código de
// producción. Solo lee.
// Uso: node scripts/diagnostics/listar-subfamilias.mjs

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
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

// Mismo criterio de limpieza/dedup que lib/mercasavip-catalog.ts.
function normalizeLabel(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
function normalizeKey(value) {
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

  // Familia -> { label, itemIds:Set, subFamilias: Map<key, {label, itemIds:Set}> }
  const familias = new Map();

  for (const row of rawItems) {
    const h1 = normalizeLabel(row.Hierarchy1);
    const h2 = normalizeLabel(row.Hierarchy2);
    const itemId = normalizeLabel(row.ItemId);
    if (!h1 || !itemId) continue;

    const famKey = normalizeKey(h1);
    if (!familias.has(famKey)) {
      familias.set(famKey, { label: h1, itemIds: new Set(), subFamilias: new Map() });
    }
    const fam = familias.get(famKey);
    fam.itemIds.add(itemId);

    if (!h2) continue;
    const subKey = normalizeKey(h2);
    if (!fam.subFamilias.has(subKey)) {
      fam.subFamilias.set(subKey, { label: h2, itemIds: new Set() });
    }
    fam.subFamilias.get(subKey).itemIds.add(itemId);
  }

  // Orden: familias por conteo descendente (mismo criterio que el sitio),
  // sub-familias también por conteo descendente.
  const familiaList = Array.from(familias.values())
    .map((fam) => ({
      label: fam.label,
      total: fam.itemIds.size,
      subFamilias: Array.from(fam.subFamilias.values())
        .map((sf) => ({ label: sf.label, total: sf.itemIds.size }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es")),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es"));

  let out = "";
  out += "LISTA COMPLETA: Familia -> Sub-familia (con conteo de productos)\n";
  out += `Generado: ${new Date().toISOString().slice(0, 10)} — fuente: MercasaVIP HE_GetInventoryItemsFMCM\n`;
  out += "=".repeat(70) + "\n\n";

  for (const fam of familiaList) {
    out += `${fam.label.toUpperCase()} (${fam.total} productos)\n`;
    for (const sf of fam.subFamilias) {
      out += `  - ${sf.label} (${sf.total})\n`;
    }
    out += "\n";
  }

  console.log(out);

  const outDir = `${PROJECT_DIR}/scripts/diagnostics/output`;
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/subfamilias-completo.txt`;
  writeFileSync(outPath, out, "utf8");
  console.log(`Archivo generado: ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
