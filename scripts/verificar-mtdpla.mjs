// Script TEMPORAL de solo lectura — ver verificar-cobertura-mtdpla.md.
// Responde: ¿existe el prefijo MTDPLA en la tabla Arte en algún formato?
// ¿cuántas filas exactas hay? ¿el formato de comparación es consistente
// con un ItemId que sí funciona (MTCHCL07)? NO hace INSERT/UPDATE/DELETE.
//
// Uso: node scripts/verificar-mtdpla.mjs
// Lee ARTE_DB_* desde .env.local — nunca imprime la contraseña.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sql from "mssql";

const PROJECT_DIR = fileURLToPath(new URL("..", import.meta.url));

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
const REQUIRED = ["ARTE_DB_SERVER", "ARTE_DB_DATABASE", "ARTE_DB_USER", "ARTE_DB_PASSWORD"];
for (const key of REQUIRED) {
  if (!env[key]) {
    console.error(`Falta ${key} en .env.local`);
    process.exit(1);
  }
}

async function main() {
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
    console.log("=== 1) ¿Existe ALGUNA fila con '%DPLA%' o '%dpla%'? ===");
    const likeResult = await pool
      .request()
      .query(
        "SELECT TOP 20 ITEMID, Nombre_Archivo, Variante FROM Arte WHERE ITEMID LIKE '%DPLA%' OR ITEMID LIKE '%dpla%'"
      );
    console.log(`${likeResult.recordset.length} fila(s) encontrada(s).`);
    if (likeResult.recordset.length > 0) console.table(likeResult.recordset);

    console.log("\n=== 2) Conteo exacto de ITEMID distintos con prefijo 'MTDPLA%' ===");
    const countResult = await pool
      .request()
      .query("SELECT COUNT(DISTINCT ITEMID) as total_en_arte FROM Arte WHERE ITEMID LIKE 'MTDPLA%'");
    console.log(countResult.recordset[0]);

    console.log("\n=== 3) Control: ItemId que sí funciona (MTCHCL07) ===");
    const controlResult = await pool
      .request()
      .query("SELECT ITEMID, Nombre_Archivo, Variante FROM Arte WHERE ITEMID = 'MTCHCL07'");
    console.log(`${controlResult.recordset.length} fila(s) encontrada(s).`);
    if (controlResult.recordset.length > 0) console.table(controlResult.recordset);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
