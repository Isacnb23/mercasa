// Script TEMPORAL de solo lectura — ver reporte-fotos-faltantes.md.
// Cruza el catálogo completo de MercasaVIP (HE_GetInventoryItemsFMCM) contra
// la tabla Arte (SQL Server) y genera un CSV con todos los ItemId que NO
// tienen ninguna fila en Arte (ninguna variante l/m/s), organizados por
// Familia -> Sub-familia, más un resumen de cobertura al inicio del archivo.
//
// No toca /api/product-images/[itemId] ni ningún otro código de producción.
// No hace INSERT/UPDATE/DELETE — solo SELECT + fetch GET.
//
// Uso: node scripts/diagnostics/reporte-fotos-faltantes.mjs
// Lee ARTE_DB_* y MERCASAVIP_API_* desde .env.local — nunca las imprime.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sql from "mssql";

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
const REQUIRED = [
  "ARTE_DB_SERVER",
  "ARTE_DB_DATABASE",
  "ARTE_DB_USER",
  "ARTE_DB_PASSWORD",
  "MERCASAVIP_API_BASE",
  "MERCASAVIP_API_KEY",
];
for (const key of REQUIRED) {
  if (!env[key]) {
    console.error(`Falta ${key} en .env.local`);
    process.exit(1);
  }
}

// Mismo criterio de limpieza que lib/mercasavip-catalog.ts: colapsar espacios
// repetidos y bordes — la API trae valores con espaciado inconsistente.
function normalizeLabel(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

// Clave case/acento-insensitive para agrupar Familia (ej. "ALIMENTOS" y
// "Alimentos" son la misma familia) — mismo criterio que normalizeKey() en
// lib/mercasavip-catalog.ts.
function normalizeKey(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
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

async function fetchArteItemIds() {
  const pool = await new sql.ConnectionPool({
    server: env.ARTE_DB_SERVER,
    database: env.ARTE_DB_DATABASE,
    user: env.ARTE_DB_USER,
    password: env.ARTE_DB_PASSWORD,
    // encrypt:false confirmado funcionando contra este servidor (ver lib/arte.ts).
    options: { encrypt: false },
    connectionTimeout: 15000,
    requestTimeout: 20000,
  }).connect();

  try {
    const result = await pool.request().query("SELECT DISTINCT ITEMID FROM Arte");
    return new Set(result.recordset.map((r) => normalizeLabel(r.ITEMID).toUpperCase()));
  } finally {
    await pool.close();
  }
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values) {
  return values.map(csvEscape).join(",") + "\r\n";
}

async function main() {
  console.log("Trayendo catálogo completo de MercasaVIP...");
  const rawItems = await fetchCatalog();
  console.log(`${rawItems.length} filas recibidas de la API (item+sucursal).`);

  console.log("Trayendo ItemId distintos con foto en Arte...");
  const arteItemIds = await fetchArteItemIds();
  console.log(`${arteItemIds.size} ItemId distintos tienen al menos una fila en Arte.`);

  // Un producto por ItemId (dedup de las filas item+sucursal), conservando la
  // primera jerarquía/nombre no vacío visto para ese ItemId.
  const products = new Map();
  for (const row of rawItems) {
    const itemId = normalizeLabel(row.ItemId);
    if (!itemId) continue;
    if (!products.has(itemId)) {
      products.set(itemId, {
        itemId,
        familia: normalizeLabel(row.Hierarchy1),
        subFamilia: normalizeLabel(row.Hierarchy2),
        categoria: normalizeLabel(row.Hierarchy3),
        subCategoria: normalizeLabel(row.Hierarchy4),
        nombre: normalizeLabel(row.ItemName),
      });
    } else {
      const existing = products.get(itemId);
      if (!existing.nombre && row.ItemName) existing.nombre = normalizeLabel(row.ItemName);
    }
  }

  const allProducts = Array.from(products.values());
  const missing = allProducts.filter((p) => !arteItemIds.has(p.itemId.toUpperCase()));

  const totalProducts = allProducts.length;
  const totalConFoto = totalProducts - missing.length;
  const coberturaGeneral = totalProducts > 0 ? (totalConFoto / totalProducts) * 100 : 0;

  // Cobertura por familia (dedup case/acento-insensitive, se conserva el
  // label de la primera aparición como display).
  const porFamilia = new Map();
  for (const p of allProducts) {
    const label = p.familia || "(sin familia)";
    const key = normalizeKey(label);
    const entry = porFamilia.get(key) ?? { label, total: 0, conFoto: 0 };
    entry.total += 1;
    if (arteItemIds.has(p.itemId.toUpperCase())) entry.conFoto += 1;
    porFamilia.set(key, entry);
  }
  const familiaStats = Array.from(porFamilia.values(), (stats) => ({
    familia: stats.label,
    total: stats.total,
    conFoto: stats.conFoto,
    sinFoto: stats.total - stats.conFoto,
    pct: stats.total > 0 ? (stats.conFoto / stats.total) * 100 : 0,
  })).sort((a, b) => a.familia.localeCompare(b.familia, "es"));

  missing.sort(
    (a, b) =>
      a.familia.localeCompare(b.familia, "es") ||
      a.subFamilia.localeCompare(b.subFamilia, "es") ||
      a.categoria.localeCompare(b.categoria, "es") ||
      a.itemId.localeCompare(b.itemId, "es")
  );

  // --- Armado del CSV ---
  let csv = "";
  csv += csvRow(["RESUMEN DE COBERTURA DE FOTOS - Tabla Arte vs Catálogo MercasaVIP"]);
  csv += csvRow(["Total de productos en la API", totalProducts]);
  csv += csvRow(["Total con foto en Arte", totalConFoto]);
  csv += csvRow(["Total sin foto", missing.length]);
  csv += csvRow(["% de cobertura general", `${coberturaGeneral.toFixed(1)}%`]);
  csv += csvRow([]);
  csv += csvRow(["Cobertura por Familia"]);
  csv += csvRow(["Familia", "Total", "Con foto", "Sin foto", "% cobertura"]);
  for (const f of familiaStats) {
    csv += csvRow([f.familia, f.total, f.conFoto, f.sinFoto, `${f.pct.toFixed(1)}%`]);
  }
  csv += csvRow([]);
  csv += csvRow(["DETALLE - ItemId sin foto en Arte"]);
  csv += csvRow(["Familia", "Sub-familia", "Categoría", "Sub-categoría", "ItemId", "Nombre del producto"]);
  for (const p of missing) {
    csv += csvRow([p.familia, p.subFamilia, p.categoria, p.subCategoria, p.itemId, p.nombre]);
  }

  const outDir = `${PROJECT_DIR}/reportes`;
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = `${outDir}/fotos-faltantes-${stamp}.csv`;
  // BOM para que Excel detecte UTF-8 y no rompa acentos/ñ al abrir el CSV.
  writeFileSync(outPath, "﻿" + csv, "utf8");

  console.log(`\nArchivo generado: ${outPath}`);
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total productos: ${totalProducts}`);
  console.log(`Con foto: ${totalConFoto}`);
  console.log(`Sin foto: ${missing.length}`);
  console.log(`Cobertura general: ${coberturaGeneral.toFixed(1)}%`);
  console.log(`\n=== Cobertura por familia ===`);
  console.table(
    familiaStats.map((f) => ({
      Familia: f.familia,
      Total: f.total,
      "Con foto": f.conFoto,
      "Sin foto": f.sinFoto,
      "% cobertura": `${f.pct.toFixed(1)}%`,
    }))
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
