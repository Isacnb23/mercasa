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
