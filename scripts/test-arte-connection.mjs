// Script TEMPORAL de solo lectura — prueba si la tabla Arte (base "sa" de
// producción, ver prompt-conectar-tabla-arte.md) tiene imágenes reales para
// los productos del catálogo de Mercasa, y si esas URLs de SharePoint son
// públicamente accesibles. NO construye el endpoint final, NO conecta a la
// UI, NO hace ningún INSERT/UPDATE/DELETE — solo SELECT.
//
// Uso: node scripts/test-arte-connection.mjs
// Lee ARTE_DB_* y MERCASAVIP_API_* desde .env.local — nunca imprime la
// contraseña ni ningún valor de credencial.
//
// Borrar este archivo (o dejarlo pero jamás commitearlo) una vez terminada
// la prueba — las credenciales "sa" no deben llegar nunca a git.

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

// ItemId reales ya confirmados contra el catálogo de MercasaVIP (ver
// prompt-portar-proxy-imagenes.md) — cubren las 5 familias.
const KNOWN_REAL_ITEM_IDS = [
  "MMTBIGA01", // Alimentos
  "MTCHCL07", // Alimentos
  "MTCLLI01", // Cuidado del Hogar
  "MTBECB04", // Cuidado Personal
  "MMTFBBE01", // Bebidas
  "MTEZVE01", // Electrónica
];

const baseConfig = {
  user: env.ARTE_DB_USER,
  password: env.ARTE_DB_PASSWORD,
  database: env.ARTE_DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 20000,
};

// El intento base (host simple) llegó a hacer el handshake TLS pero
// OpenSSL 3.x (Node 20+) lo rechazó con "unsupported protocol" — típico de
// un SQL Server viejo que solo ofrece TLS 1.0 en el pre-login. Se agregan
// variantes bajando el mínimo de TLS y sin cifrado antes de probar nombre
// de instancia (esas dos primeras variantes ya dieron ETIMEOUT: el puerto
// UDP 1434 de SQL Browser no está alcanzable desde acá, así que no vale la
// pena repetir esa ruta).
function buildConnectionAttempts() {
  const server = env.ARTE_DB_SERVER;
  return [
    // Confirmado funcionando: el servidor no soporta el TLS que exige
    // OpenSSL 3.x/Node 20+ con encrypt:true, pero acepta conexión sin
    // cifrar en esta red interna. Va primero para no perder tiempo en los
    // otros dos intentos (que sí fallan) en cada corrida.
    {
      label: `${server} (sin cifrado)`,
      config: { ...baseConfig, server, options: { ...baseConfig.options, encrypt: false } },
    },
    { label: `${server} (default)`, config: { ...baseConfig, server } },
    {
      label: `${server} (TLS mínimo 1.0)`,
      config: {
        ...baseConfig,
        server,
        options: { ...baseConfig.options, cryptoCredentialsDetails: { minVersion: "TLSv1" } },
      },
    },
  ];
}

async function connectWithFallback() {
  const attempts = buildConnectionAttempts();
  for (const attempt of attempts) {
    console.log(`Probando conexión: ${attempt.label} ...`);
    try {
      const pool = await new sql.ConnectionPool(attempt.config).connect();
      console.log(`Conectado usando: ${attempt.label}\n`);
      return pool;
    } catch (err) {
      console.log(`  Falló (${err.code ?? err.name}): ${err.message}`);
    }
  }
  throw new Error("No se pudo conectar con ninguna variante de servidor probada.");
}

async function fetchUrl(url) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const contentType = res.headers.get("content-type") ?? "(sin content-type)";
    const location = res.headers.get("location");
    return {
      url,
      status: res.status,
      contentType,
      redirectTo: location ?? null,
      ms: Date.now() - startedAt,
    };
  } catch (err) {
    return { url, status: null, error: String(err), ms: Date.now() - startedAt };
  }
}

async function main() {
  const pool = await connectWithFallback();

  try {
    console.log("=== SELECT TOP 20 * FROM Arte ===");
    const top20 = await pool.request().query("SELECT TOP 20 * FROM Arte");
    console.log(`${top20.recordset.length} filas recibidas.`);
    console.table(
      top20.recordset.map((r) => ({
        ID_Arte: r.ID_Arte,
        ITEMID: r.ITEMID,
        Nombre_Archivo: r.Nombre_Archivo,
        Variante: r.Variante,
        ID_Marca: r.ID_Marca,
      }))
    );

    console.log("\n=== Conteo total de ITEMID distintos en Arte ===");
    const distinctCount = await pool
      .request()
      .query("SELECT COUNT(DISTINCT ITEMID) AS distinctItemIds, COUNT(*) AS totalRows FROM Arte");
    console.log(distinctCount.recordset[0]);

    console.log("\n=== Búsqueda por ItemId real conocido (uno por uno) ===");
    for (const itemId of KNOWN_REAL_ITEM_IDS) {
      const result = await pool
        .request()
        .input("itemId", sql.VarChar, itemId)
        .query("SELECT * FROM Arte WHERE ITEMID = @itemId");
      console.log(`${itemId}: ${result.recordset.length} fila(s) encontrada(s)`);
      if (result.recordset.length > 0) {
        console.table(
          result.recordset.map((r) => ({
            Variante: r.Variante,
            Nombre_Archivo: r.Nombre_Archivo,
            Ruta_URL: r.Ruta_URL,
          }))
        );
      }
    }

    console.log("\n=== Cobertura contra una muestra más grande del catálogo real ===");
    const apiBase = env.MERCASAVIP_API_BASE;
    const apiKey = env.MERCASAVIP_API_KEY;
    let sampleIds = KNOWN_REAL_ITEM_IDS;
    if (apiBase && apiKey) {
      const url = new URL("/Inventory/HE_GetInventoryItemsFMCM", apiBase);
      url.searchParams.set("PriceGroup", "AF");
      url.searchParams.set("AddressId", "-1");
      const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });
      if (res.ok) {
        const items = await res.json();
        const uniqueIds = Array.from(new Set(items.map((i) => i.ItemId))).sort();
        const step = Math.max(1, Math.floor(uniqueIds.length / 150));
        sampleIds = uniqueIds.filter((_, i) => i % step === 0).slice(0, 150);
        console.log(`Muestra tomada del catálogo real: ${sampleIds.length} de ${uniqueIds.length} ItemId totales.`);
      } else {
        console.log("No se pudo traer el catálogo real (usando solo la lista corta conocida).");
      }
    } else {
      console.log("MERCASAVIP_API_BASE/KEY no configuradas — usando solo la lista corta conocida.");
    }

    // Sin CREATE TYPE (sería DDL, no permitido acá): se arma un IN (...) con
    // un parámetro nombrado por ItemId en vez de un table-valued parameter.
    const request = pool.request();
    const placeholders = sampleIds.map((id, i) => {
      const paramName = `id${i}`;
      request.input(paramName, sql.VarChar(64), id);
      return `@${paramName}`;
    });
    const matchResult = await request.query(
      `SELECT DISTINCT ITEMID FROM Arte WHERE ITEMID IN (${placeholders.join(", ")})`
    );
    const matched = matchResult.recordset.length;
    console.log(
      `Cobertura: ${matched}/${sampleIds.length} ItemId de la muestra real tienen fila en Arte (${((matched / sampleIds.length) * 100).toFixed(1)}%).`
    );

    console.log("\n=== Fetch de prueba: URL de ejemplo del prompt original ===");
    const exampleUrl =
      "https://parnersenseitcs.sharepoint.com/sites/CentrodeDocumentacinGrupoInteca/Documentos%20compartidos/Centro%20de%20Documentaci%C3%B3n%20Grupo%20Inteca%20Digitalizado/Proveedores/Productos/Documentos%20para%20entidades/Arte/ART-000.png";
    console.log(await fetchUrl(exampleUrl));

    console.log("\n=== Fetch de prueba: 3 Ruta_URL reales encontradas en Arte ===");
    const sampleUrls = await pool.request().query("SELECT TOP 3 Ruta_URL FROM Arte WHERE Ruta_URL IS NOT NULL");
    for (const row of sampleUrls.recordset) {
      console.log(await fetchUrl(row.Ruta_URL));
    }
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
