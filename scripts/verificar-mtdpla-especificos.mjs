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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}
const env = loadEnvLocal();
const pool = await new sql.ConnectionPool({
  server: env.ARTE_DB_SERVER, database: env.ARTE_DB_DATABASE, user: env.ARTE_DB_USER, password: env.ARTE_DB_PASSWORD,
  options: { encrypt: false }, connectionTimeout: 15000, requestTimeout: 20000,
}).connect();

console.log("=== Todos los ITEMID distintos con prefijo MTDPLA ===");
const all = await pool.request().query("SELECT DISTINCT ITEMID FROM Arte WHERE ITEMID LIKE 'MTDPLA%' ORDER BY ITEMID");
console.log(all.recordset.map(r => r.ITEMID).join(", "));

console.log("\n=== Los que fallaron en el catálogo (MTDPLA123, MTDPLA118, MTDPLA128) ===");
for (const id of ["MTDPLA123", "MTDPLA118", "MTDPLA128"]) {
  const r = await pool.request().input("id", sql.VarChar, id).query("SELECT * FROM Arte WHERE ITEMID = @id");
  console.log(`${id}: ${r.recordset.length} fila(s)`);
}
await pool.close();
