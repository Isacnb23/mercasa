// Verifica que todas las llaves t("...") usadas en RecruitmentPopover.tsx existan en
// messages/es.json y messages/en.json (namespace "Recruitment"), y que ambos idiomas
// tengan exactamente las mismas llaves. Corre como `prebuild`: si falta una, el build falla.
import { readFileSync } from "node:fs";

const SOURCE = "components/layout/RecruitmentPopover.tsx";
const NAMESPACE = "Recruitment";

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

const src = readFileSync(SOURCE, "utf8");
const usedNamespace = src.match(/useTranslations\("([^"]+)"\)/)?.[1];
const used = [...new Set([...src.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]))];
const problems = [];

if (usedNamespace !== NAMESPACE) problems.push(`${SOURCE} usa el namespace "${usedNamespace}", se esperaba "${NAMESPACE}"`);

const keys = {};
for (const locale of ["es", "en"]) {
  const ns = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))[NAMESPACE];
  if (!ns) {
    problems.push(`messages/${locale}.json no tiene el namespace "${NAMESPACE}"`);
    continue;
  }
  keys[locale] = new Set(flatten(ns));
  for (const key of used) if (!keys[locale].has(key)) problems.push(`falta ${NAMESPACE}.${key} en messages/${locale}.json`);
}
if (keys.es && keys.en) {
  for (const k of keys.es) if (!keys.en.has(k)) problems.push(`${NAMESPACE}.${k} está en es.json pero no en en.json`);
  for (const k of keys.en) if (!keys.es.has(k)) problems.push(`${NAMESPACE}.${k} está en en.json pero no en es.json`);
}

if (problems.length) {
  console.error("Llaves de traducción con problemas:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`i18n OK: ${used.length} llaves de ${NAMESPACE} verificadas en es y en.`);
