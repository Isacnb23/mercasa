// Nombre de producto para MOSTRAR. AX entrega los nombres en MAYÚSCULAS ("CERVEZA 5.0 PREMIUM LATA ALEMANIA
// 500ML 24U/C 60C/T"); esto los pasa a "Cerveza 5.0 Premium Lata Alemania 500ml 24U/C 60C/T" solo para la
// pantalla. El dato original no se toca: el carrito, el pedido y el servidor siguen usando `product.name`.
// Respeta códigos de empaque (24U/C, 60C/T, 2PACK), números y porcentajes (5.0, 4,8%) y pasa a minúscula solo la
// unidad de las medidas (500ML -> 500ml, 170G -> 170g). Se prueba con `npm test`.

const MEASURE = /^(\d+(?:[.,]\d+)?)(ML|L|LT|LTS|G|GR|GRS|KG|KGS|OZ|LB|LBS|CC|MG|CM|MM|M)$/i;
// Se quedan en mayúscula: siglas conocidas y cualquier palabra sin vocales de 2 a 4 letras (UHT, TV, PVC...).
const ACRONYMS = new Set(["UHT", "PET", "LED", "USB", "PVC", "LCD", "UHD", "HD", "TV", "BBQ", "XL", "XXL", "UV", "DVD", "AA", "AAA"]);
// Palabras que van en minúscula salvo al inicio del nombre.
const SMALL_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "con", "en", "para", "por", "sin", "al", "a"]);

function isMostlyUppercase(name: string): boolean {
  const letters = name.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (letters.length === 0) return false;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
  return upper.length / letters.length >= 0.7;
}

function capitalize(word: string): string {
  const lower = word.toLocaleLowerCase("es");
  return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
}

// Una palabra sin dígitos (puede traer signos pegados: "(CP)", "ACEITE,").
function wordCase(segment: string, isFirst: boolean, standalone = true): string {
  const match = /^([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*)$/.exec(segment);
  if (!match) return segment;
  const [, lead, word, tail] = match;
  const upper = word.toLocaleUpperCase("es");
  // Conectores sueltos ("de", "y") en minúscula, salvo al inicio; dentro de "S/D" o "P/QUEQUE" no aplican.
  if (standalone && !isFirst && SMALL_WORDS.has(word.toLocaleLowerCase("es"))) return `${lead}${word.toLocaleLowerCase("es")}${tail}`;
  if (word.length === 1 && lead === "" && tail === "") return upper; // "P" de "P/QUEQUE", "S" de "S/D"
  if (ACRONYMS.has(upper) || (word.length >= 2 && word.length <= 4 && !/[AEIOUÁÉÍÓÚÜ]/.test(upper))) return `${lead}${upper}${tail}`;
  return `${lead}${capitalize(word)}${tail}`;
}

function measureCase(segment: string): string {
  const match = MEASURE.exec(segment);
  if (!match) return segment;
  const unit = match[2].toUpperCase() === "L" ? "L" : match[2].toLowerCase();
  return `${match[1]}${unit}`;
}

function tokenCase(token: string, isFirst: boolean): string {
  const hasDigit = /\d/.test(token);
  // Códigos de empaque y similares ("24U/C", "60C/T", "4,54KG/C", "36TUBOS/C"): tal cual.
  if (hasDigit && token.includes("/")) return token;
  if (!hasDigit && !token.includes("/") && !token.includes("-")) return wordCase(token, isFirst);
  // "P/QUEQUE" y "CARNE-50%": cada tramo por su cuenta.
  return token
    .split(/([/-])/)
    .map((part, i) => {
      if (part === "/" || part === "-") return part;
      if (/\d/.test(part)) return measureCase(part);
      return wordCase(part, isFirst && i === 0, false);
    })
    .join("");
}

export function displayProductName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean === "" || !isMostlyUppercase(clean)) return clean;
  return clean
    .split(" ")
    .map((token, index) => (/\d/.test(token) && !token.includes("/") && !token.includes("-") ? measureCase(token) : tokenCase(token, index === 0)))
    .join(" ");
}

// ---------------------------------------------------------------------------------------------------------
// Sufijo de empaque del nombre ("24U/C 60C/T", "15S/T", "10U/D 6D/C 65C/T"). AX lo pega al final del nombre;
// sugiere presentaciones que muchas veces no existen (una cerveza que solo se vende en Lata y Caja no tiene
// Tarima), así que el título muestra solo el nombre comercial. Las presentaciones reales salen del selector
// y de "Equivalencias". Separación segura: solo se corta una cola de tokens "<número><unidad>/<unidad>" al
// FINAL del nombre; nunca medidas ("500ml", "170g", "4,54KG/C"), variantes ("2PACK", "5.0", "4,8%") ni nada
// del medio del nombre. Si el nombre quedara vacío o casi vacío, se deja el original.

export interface PackagingCode {
  quantity: string;
  per: string; // "U/C", "TUBOS/C"
  text: string; // "24 U/C"
}

export interface PackagingSplit {
  // Nombre comercial (sin el sufijo), tal como vino (sin normalizar mayúsculas).
  name: string;
  codes: PackagingCode[];
}

const CODE_FULL = /^(\d+(?:[.,]\d+)?)([A-Za-zÁÉÍÓÚÑ]{1,12})\/([A-Za-zÁÉÍÓÚÑ]{1,8})$/;
// Código con el número separado ("60 C/T"): letras cortas a ambos lados de la barra.
const CODE_ONLY = /^([A-Za-z]{1,2})\/([A-Za-z]{1,3})$/;
// El nombre se corta a 60 caracteres en AX: la última pieza puede venir truncada ("48C/", "8").
const CODE_TRUNCATED = /^\d+(?:[A-Za-zÁÉÍÓÚÑ]{0,12}\/?[A-Za-zÁÉÍÓÚÑ]{0,8})?$/;
// Si la izquierda es una medida ("4,54KG/C", "50m/CAJA") es una característica del producto, no un empaque.
const MEASURE_UNITS = new Set(["M", "ML", "L", "LT", "LTS", "G", "GR", "GRS", "KG", "KGS", "OZ", "LB", "LBS", "CC", "MG", "CM", "MM"]);
// Palabra suelta que AX deja tras los códigos en algún ítem ("... 65C/T DISPL").
const TRAILING_WORDS = new Set(["DISPL", "DISPLAY"]);

export function splitPackaging(originalName: string): PackagingSplit {
  const original = originalName.replace(/\s+/g, " ").trim();
  const tokens = original.split(" ");
  const codes: PackagingCode[] = [];
  let end = tokens.length - 1;

  const asCode = (quantity: string, left: string, right: string): PackagingCode | null => {
    if (MEASURE_UNITS.has(left.toUpperCase())) return null;
    const per = `${left}/${right}`.toUpperCase();
    return { quantity, per, text: `${quantity} ${per}` };
  };

  // Palabra suelta final y pieza truncada: solo se descartan si detrás hay al menos un código completo.
  const hasCodeBefore = (index: number) => {
    for (let i = index; i >= 0; i--) {
      const full = CODE_FULL.exec(tokens[i]);
      if (full && asCode(full[1], full[2], full[3])) return true;
      if (i >= 1 && CODE_ONLY.test(tokens[i]) && /^\d+$/.test(tokens[i - 1])) return true;
    }
    return false;
  };
  if (end >= 1 && TRAILING_WORDS.has(tokens[end].toUpperCase()) && hasCodeBefore(end - 1)) end--;
  if (end >= 1 && CODE_TRUNCATED.test(tokens[end]) && !CODE_FULL.test(tokens[end]) && hasCodeBefore(end - 1)) end--;

  while (end >= 0) {
    const token = tokens[end];
    const full = CODE_FULL.exec(token);
    if (full) {
      const code = asCode(full[1], full[2], full[3]);
      if (!code) break;
      codes.unshift(code);
      end--;
      continue;
    }
    const only = CODE_ONLY.exec(token);
    if (only && end >= 1 && /^\d+$/.test(tokens[end - 1])) {
      const code = asCode(tokens[end - 1], only[1], only[2]);
      if (!code) break;
      codes.unshift(code);
      end -= 2;
      continue;
    }
    break;
  }

  if (codes.length === 0) return { name: original, codes: [] };
  const name = tokens.slice(0, end + 1).join(" ").trim();
  // Nombre vacío o ambiguo (casi sin letras): se deja el original.
  if (name.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "").length < 3) return { name: original, codes: [] };
  return { name, codes };
}

export interface ProductTitle {
  // Para MOSTRAR: nombre comercial normalizado, sin el sufijo de empaque.
  title: string;
  // Sufijo de empaque tal como lo dice el nombre ("24 U/C · 60 C/T"); null si no hay.
  packagingText: string | null;
}

export function productTitle(originalName: string): ProductTitle {
  const split = splitPackaging(originalName);
  return {
    title: displayProductName(split.name),
    packagingText: split.codes.length > 0 ? split.codes.map((c) => c.text).join(" · ") : null,
  };
}
