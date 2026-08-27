import "server-only";
import sql from "mssql";

// Capa server-side para el endpoint real de imágenes de producto
// (app/api/product-images/[itemId]/route.ts): resuelve ITEMID -> nombre de
// archivo real vía la tabla Arte (SQL Server) y trae el contenido desde la
// carpeta Arte en SharePoint vía Microsoft Graph (client credentials).
// Reemplaza al proxy de HomeX (app/api/images/[itemId] — portado en
// prompt-portar-proxy-imagenes.md) ahora que hay una fuente real de fotos de
// Mercasa. Ver prompt-endpoint-imagenes-produccion.md y memoria de proyecto
// "Arte table findings" para el contexto completo de cómo se llegó a estos
// valores (SITE_ID/DRIVE_ID resueltos y verificados con scripts/test-*.mjs).

// ⚠️⚠️⚠️ TODO DE SEGURIDAD ANTES DE DEPLOYAR ⚠️⚠️⚠️
// ARTE_DB_USER en .env.local es actualmente "sa" (administrador total de
// SQL Server) — es la credencial de PRUEBA que se usó para verificar que
// esta tabla tenía lo que necesitábamos, NO debe llegar a producción/Vercel
// así. Reemplazarla por un usuario de SOLO LECTURA sobre la tabla Arte antes
// de cualquier deploy. El warning de abajo lo recuerda en cada arranque del
// servidor mientras siga sin cambiar.
if (process.env.ARTE_DB_USER === "sa") {
  console.warn(
    "[lib/arte] ATENCION: ARTE_DB_USER='sa' (credencial de prueba, admin total). " +
      "NO DEPLOYAR a Vercel/producción así — reemplazar por un usuario de SOLO LECTURA " +
      "sobre la tabla Arte antes de cualquier deploy. Ver prompt-endpoint-imagenes-produccion.md."
  );
}

// Resueltos y verificados end-to-end (ver prompt-verificar-credenciales-
// nuevas.md) — no son secretos, son identificadores de recurso, por eso van
// como constantes y no como variable de entorno.
const SITE_ID =
  "parnersenseitcs.sharepoint.com,a67ca6e8-fa47-4c67-8961-80fad4fdf89e,dba1ef8d-5532-40ee-acd1-88a72fbce53d";
const DRIVE_ID = "b!6KZ8pkf6Z0yJYYD61P34no3vodsyVe5ArNGIpy-85T29Hi4Fg-kWSqA_BCCjQ5VU";
const ARTE_FOLDER_PATH =
  "Centro de Documentación Grupo Inteca Digitalizado/Proveedores/Productos/Documentos para entidades/Arte";
const ENCODED_ARTE_FOLDER_PATH = ARTE_FOLDER_PATH.split("/").map(encodeURIComponent).join("/");

export type ImageVariant = "s" | "m" | "l";

// --- Tabla Arte (SQL Server): ITEMID + Variante -> Nombre_Archivo --------

let poolPromise: Promise<sql.ConnectionPool> | null = null;

// Conexión perezosa y reutilizada entre requests del mismo proceso — si una
// conexión previa quedó rota, se descarta la promesa cacheada para permitir
// reconectar en el siguiente pedido en vez de quedar rota para siempre.
function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      server: process.env.ARTE_DB_SERVER!,
      database: process.env.ARTE_DB_DATABASE!,
      user: process.env.ARTE_DB_USER!,
      password: process.env.ARTE_DB_PASSWORD!,
      // encrypt:true (el default de mssql) falla contra este servidor con
      // "ssl_choose_client_version: unsupported protocol" — su TLS es
      // demasiado viejo para OpenSSL 3.x/Node 20+. Confirmado en
      // scripts/test-arte-connection.mjs; encrypt:false funciona bien en
      // esta red interna.
      options: { encrypt: false },
      connectionTimeout: 15000,
      requestTimeout: 20000,
    })
      .connect()
      .catch((err: unknown) => {
        // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
        console.error("[product-images] Falló la conexión a SQL Server:", err);
        poolPromise = null;
        throw err;
      });
  }
  // `poolPromise` se reasigna dentro del closure de arriba, así que
  // TypeScript no lo vuelve a angostar a no-null acá abajo (limitación
  // conocida del control-flow analysis con reasignaciones en closures).
  return poolPromise as Promise<sql.ConnectionPool>;
}

// Los nombres de archivo no cambian seguido — 24hs de caché evita pegarle a
// SQL Server en cada request de imagen. Se cachea también el `null` (sin
// registro) para no re-consultar en cada carga de una categoría con ítems
// sin foto (ej. Electrónica, ver memoria de proyecto de cobertura).
const ARTE_LOOKUP_TTL_MS = 24 * 60 * 60 * 1000;
const arteLookupCache = new Map<string, { fileName: string | null; expiresAt: number }>();

async function getArteFileName(itemId: string, variant: ImageVariant): Promise<string | null> {
  const cacheKey = `${itemId}:${variant}`;
  const cached = arteLookupCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
    console.log(`[product-images] getArteFileName: HIT de caché para ${cacheKey} -> ${cached.fileName}`);
    return cached.fileName;
  }

  // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
  console.log(`[product-images] Conectando a SQL... (${process.env.ARTE_DB_SERVER}/${process.env.ARTE_DB_DATABASE})`);
  const pool = await getSqlPool();
  console.log("[product-images] Conexión SQL OK, corriendo query...");
  const result = await pool
    .request()
    .input("itemId", sql.VarChar(64), itemId)
    .input("variant", sql.VarChar(32), variant)
    .query("SELECT TOP 1 Nombre_Archivo FROM Arte WHERE ITEMID = @itemId AND Variante = @variant");
  console.log(
    `[product-images] Resultado SQL para itemId=${itemId} variant=${variant}: ${result.recordset.length} fila(s)`,
    result.recordset[0] ?? null
  );

  const fileName = (result.recordset[0]?.Nombre_Archivo as string | undefined) ?? null;
  arteLookupCache.set(cacheKey, { fileName, expiresAt: Date.now() + ARTE_LOOKUP_TTL_MS });
  return fileName;
}

// --- Microsoft Graph: access token + contenido del archivo --------------

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getGraphAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
    console.log("[product-images] Token de Graph: HIT de caché");
    return cachedToken.accessToken;
  }

  // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
  console.log(`[product-images] Pidiendo token de Graph... (tenant=${process.env.SHAREPOINT_TENANT_ID?.slice(0, 8)}...)`);

  const url = `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.SHAREPOINT_CLIENT_ID!,
    client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`No se pudo obtener token de Microsoft Graph (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // El token de Graph dura ~3600s — se renueva 10 minutos antes de que
  // expire de verdad para no arriesgarse a usar uno vencido a mitad de un
  // request lento.
  const ttlMs = Math.max(0, data.expires_in - 600) * 1000;
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + ttlMs };
  return cachedToken.accessToken;
}

export interface ArteFileContent {
  contentType: string;
  body: ReadableStream<Uint8Array>;
}

// Trae el contenido de un archivo puntual de la carpeta Arte. Devuelve
// `null` si el archivo no existe en SharePoint (404 limpio para el cliente,
// no un error) — cualquier otro status no-ok se trata como falla real.
async function fetchArteFileContent(fileName: string): Promise<ArteFileContent | null> {
  // DEBUG TEMPORAL — ver diagnostico-product-images-404.md
  console.log(`[product-images] Llamando a Graph API para archivo: ${fileName}`);
  const token = await getGraphAccessToken();
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${ENCODED_ARTE_FOLDER_PATH}/${encodeURIComponent(fileName)}:/content`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  console.log(`[product-images] Respuesta Graph status: ${res.status} para ${fileName}`);

  if (res.status === 404) return null;
  if (!res.ok || !res.body) {
    throw new Error(`Microsoft Graph respondió ${res.status} pidiendo ${fileName}`);
  }

  return {
    contentType: res.headers.get("content-type") ?? "image/png",
    body: res.body,
  };
}

// Punto de entrada único para el endpoint: ITEMID + variante -> contenido de
// imagen, o `null` si no hay registro en Arte o el archivo no está en
// SharePoint (ambos casos son 404 limpio, no error).
export async function getProductImage(itemId: string, variant: ImageVariant): Promise<ArteFileContent | null> {
  const fileName = await getArteFileName(itemId, variant);
  if (!fileName) return null;
  return fetchArteFileContent(fileName);
}
