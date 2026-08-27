// Script TEMPORAL de solo lectura — verifica acceso real a la carpeta
// "Arte" en SharePoint vía Microsoft Graph (client credentials), resolviendo
// el site_id correcto por hostname en vez de confiar en un SITE_ID
// hardcodeado que podría ser de otro sitio. Ver
// prompt-verificar-sharepoint-graph.md. Solo hace GET — nunca escribe nada.
//
// Uso: node scripts/test-sharepoint-graph.mjs
// Lee SHAREPOINT_TENANT_ID / SHAREPOINT_CLIENT_ID / SHAREPOINT_CLIENT_SECRET
// desde .env.local. Nunca imprime el secret completo (solo un prefijo corto
// para confirmar que se leyó bien) — Isaac va a regenerar este client
// secret después de esta prueba de todos modos.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
const REQUIRED = ["SHAREPOINT_TENANT_ID", "SHAREPOINT_CLIENT_ID", "SHAREPOINT_CLIENT_SECRET"];
for (const key of REQUIRED) {
  if (!env[key]) {
    console.error(`Falta ${key} en .env.local`);
    process.exit(1);
  }
}
console.log(
  `Credenciales leídas OK (client_id=${env.SHAREPOINT_CLIENT_ID.slice(0, 8)}..., tenant=${env.SHAREPOINT_TENANT_ID.slice(0, 8)}..., secret=${env.SHAREPOINT_CLIENT_SECRET.slice(0, 4)}... [oculto, se va a regenerar])\n`
);

// Credenciales NUEVAS (registradas por Luis directo en el tenant
// parnersenseitcs, ver prompt-verificar-credenciales-nuevas.md) — la corrida
// anterior con las credenciales viejas resolvía a grupointeca.sharepoint.com
// (tenant equivocado, sitio real pero sin la carpeta Arte). Se prueba
// parnersenseitcs primero; grupointeca queda como comparación en el loop de
// abajo para confirmar que efectivamente cambió de tenant.
const HOSTNAME = "parnersenseitcs.sharepoint.com";
const SITE_PATH = "/sites/CentrodeDocumentacinGrupoInteca";
// Ruta real de carpetas dentro del drive, tal como aparece en la URL
// compartida (decodificada) — se prueban variantes de encoding porque
// "Documentación" tiene tilde y la URL compartida además muestra el nombre
// del sitio SIN tildes ("Documentacin"), así que puede que el path de
// carpetas físicas sí las tenga.
const FOLDER_PATH =
  "Centro de Documentación Grupo Inteca Digitalizado/Proveedores/Productos/Documentos para entidades/Arte";
const SAMPLE_FILE = "ART-000.png";

async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: env.SHAREPOINT_CLIENT_ID,
    client_secret: env.SHAREPOINT_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Auth falló (${res.status}): ${JSON.stringify(data)}`);
  }
  console.log(`Token obtenido OK (expira en ${data.expires_in}s).\n`);
  return data.access_token;
}

async function graphGet(token, path, { raw = false } = {}) {
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (raw) return res;
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

function decodeJwtRoles(token) {
  const payload = token.split(".")[1];
  const json = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(json);
}

async function main() {
  const token = await getAccessToken();

  console.log("=== -1. Permisos (roles) realmente concedidos en el token ===");
  const claims = decodeJwtRoles(token);
  console.log(`roles: ${JSON.stringify(claims.roles ?? [])}`);
  console.log(`app_displayname: ${claims.app_displayname ?? "?"}, appid: ${claims.appid}\n`);

  console.log("=== 0. Diagnóstico: ¿a qué tenant/hostname pertenece esta app? ===");
  const rootSite = await graphGet(token, "/sites/root");
  console.log(`GET /sites/root -> status=${rootSite.status}`);
  if (rootSite.ok) {
    console.log(`  id=${rootSite.data.id}`);
    console.log(`  webUrl=${rootSite.data.webUrl}`);
  } else {
    console.log(`  ${JSON.stringify(rootSite.data)}`);
  }
  const followedSites = await graphGet(token, "/sites?search=*");
  console.log(`GET /sites?search=* -> status=${followedSites.status}`);
  if (followedSites.ok) {
    for (const s of followedSites.data.value ?? []) {
      console.log(`  - ${s.webUrl}`);
    }
  } else {
    console.log(`  ${JSON.stringify(followedSites.data)}`);
  }
  console.log("");

  for (const hostname of [HOSTNAME, "grupointeca.sharepoint.com"]) {
    console.log(`=== 1. Resolver sitio por hostname: ${hostname}:${SITE_PATH} ===`);
    const attempt = await graphGet(token, `/sites/${hostname}:${SITE_PATH}`);
    console.log(`status=${attempt.status}`);
    console.log(JSON.stringify(attempt.data, null, 2));
    console.log("");
  }

  console.log(`=== 1b. Resolver sitio por hostname (repetido, usado más abajo): ${HOSTNAME}:${SITE_PATH} ===`);
  const site = await graphGet(token, `/sites/${HOSTNAME}:${SITE_PATH}`);
  console.log(`status=${site.status}`);
  if (!site.ok) {
    console.log(JSON.stringify(site.data, null, 2));
    console.log("\nNo se pudo resolver el sitio — deteniendo acá.");
    return;
  }
  const siteId = site.data.id;
  console.log(`SITE_ID resuelto: ${siteId}`);
  console.log(`displayName: ${site.data.displayName}, webUrl: ${site.data.webUrl}\n`);

  console.log("=== 2. Listar drives (bibliotecas de documentos) del sitio ===");
  const drives = await graphGet(token, `/sites/${siteId}/drives`);
  console.log(`status=${drives.status}`);
  if (!drives.ok) {
    console.log(JSON.stringify(drives.data, null, 2));
    console.log("\nNo se pudo listar drives — deteniendo acá.");
    return;
  }
  for (const d of drives.data.value) {
    console.log(`- ${d.name} (id=${d.id}, driveType=${d.driveType})`);
  }
  const drive = drives.data.value.find((d) => /documento/i.test(d.name)) ?? drives.data.value[0];
  if (!drive) {
    console.log("\nNingún drive encontrado en el sitio — deteniendo acá.");
    return;
  }
  const driveId = drive.id;
  console.log(`\nUsando drive: "${drive.name}" (${driveId})\n`);

  console.log(`=== 3. Navegar hasta la carpeta Arte, paso a paso desde la raíz ===`);
  const segments = FOLDER_PATH.split("/");
  let walkedPath = "";
  let currentItemId = "root";
  for (const segment of segments) {
    const listing = await graphGet(token, `/sites/${siteId}/drives/${driveId}/items/${currentItemId}/children`);
    if (!listing.ok) {
      console.log(`No se pudo listar hijos de "${walkedPath || "(raíz)"}": ${JSON.stringify(listing.data)}`);
      return;
    }
    const names = listing.data.value.map((it) => it.name);
    const match = listing.data.value.find((it) => it.name === segment);
    console.log(`En "${walkedPath || "(raíz)"}" buscando "${segment}": ${match ? "encontrado" : "NO encontrado"}`);
    if (!match) {
      console.log(`  Carpetas/archivos reales ahí: ${names.join(" | ")}`);

      console.log("\n=== Diagnóstico extra: listas del sitio y sub-sitios ===");
      const lists = await graphGet(token, `/sites/${siteId}/lists`);
      console.log(`GET /sites/{id}/lists -> status=${lists.status}`);
      if (lists.ok) {
        for (const l of lists.data.value) {
          console.log(`  - ${l.displayName} (template=${l.list?.template})`);
        }
      } else {
        console.log(`  ${JSON.stringify(lists.data)}`);
      }
      const subsites = await graphGet(token, `/sites/${siteId}/sites`);
      console.log(`GET /sites/{id}/sites -> status=${subsites.status}`);
      if (subsites.ok) {
        for (const s of subsites.data.value ?? []) console.log(`  - ${s.webUrl}`);
      } else {
        console.log(`  ${JSON.stringify(subsites.data)}`);
      }

      console.log("\nDeteniendo acá — ajustar FOLDER_PATH con el nombre real de arriba.");
      return;
    }
    currentItemId = match.id;
    walkedPath = walkedPath ? `${walkedPath}/${segment}` : segment;
  }

  console.log(`\nRuta completa confirmada: ${walkedPath}`);
  const folder = await graphGet(token, `/sites/${siteId}/drives/${driveId}/items/${currentItemId}/children`);
  console.log(`status=${folder.status}`);
  if (!folder.ok) {
    console.log(JSON.stringify(folder.data, null, 2));
    console.log("\nNo se pudo listar la carpeta Arte — deteniendo acá.");
    return;
  }
  const encodedPath = walkedPath.split("/").map(encodeURIComponent).join("/");
  console.log(`${folder.data.value.length} elemento(s) encontrados. Primeros 10:`);
  for (const item of folder.data.value.slice(0, 10)) {
    console.log(`- ${item.name} (${item.size ?? "?"} bytes)`);
  }

  console.log(`\n=== 4. Descargar un archivo real: ${SAMPLE_FILE} ===`);
  const filePath = `${encodedPath}/${encodeURIComponent(SAMPLE_FILE)}`;
  const fileRes = await graphGet(token, `/sites/${siteId}/drives/${driveId}/root:/${filePath}:/content`, {
    raw: true,
  });
  const contentType = fileRes.headers.get("content-type");
  const buffer = await fileRes.arrayBuffer();
  console.log(`status=${fileRes.status}`);
  console.log(`content-type=${contentType}`);
  console.log(`tamaño descargado=${buffer.byteLength} bytes`);

  console.log("\n=== Resumen ===");
  console.log(`SITE_ID: ${siteId}`);
  console.log(`DRIVE_ID: ${driveId}`);
  console.log(`Carpeta Arte accesible: ${folder.ok ? "SÍ" : "NO"}`);
  console.log(
    `Descarga de archivo real: ${fileRes.status === 200 && contentType?.startsWith("image/") ? "SÍ, imagen real" : "NO / revisar"}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
