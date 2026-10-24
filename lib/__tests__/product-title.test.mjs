// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { productTitle, splitPackaging } from "../product-display.ts";

// Los 10 patrones más comunes del catálogo (N = número) con un nombre de cada uno.
const PATTERNS = [
  ["NU/P NP/C NC/T", 'EZSERV BIO CONTENEDOR 6" CACO3 BCO S/D (CP) 50U/P 10P/C 36C/T', 'EZSERV BIO CONTENEDOR 6" CACO3 BCO S/D (CP)', "50 U/P · 10 P/C · 36 C/T"],
  ["NU/C NC/T", "CERVEZA 5.0 PREMIUM LATA ALEMANIA 500ML 24U/C 60C/T", "CERVEZA 5.0 PREMIUM LATA ALEMANIA 500ML", "24 U/C · 60 C/T"],
  ["NU/B NB/T", "AZUCAR BLANCA SOBRES 5G 100U/B 40B/T", "AZUCAR BLANCA SOBRES 5G", "100 U/B · 40 B/T"],
  ["NP/C NC/T", "IDEAL COBERTORES P/INODORO 20P/C 40C/T", "IDEAL COBERTORES P/INODORO", "20 P/C · 40 C/T"],
  ["NU/P NP/B NB/T", "SERVILLETA BLANCA 250U/P 12P/B 30B/T", "SERVILLETA BLANCA", "250 U/P · 12 P/B · 30 B/T"],
  ["NP/B NB/T", "PAPEL HIGIENICO INSTITUCIONAL 12P/B 40B/T", "PAPEL HIGIENICO INSTITUCIONAL", "12 P/B · 40 B/T"],
  ["NB/R NR/C NC/T", "BOLSA PLASTICA TRANSPARENTE 10B/R 20R/C 30C/T", "BOLSA PLASTICA TRANSPARENTE", "10 B/R · 20 R/C · 30 C/T"],
  ["NU/T", "ACEITE VEGETAL GALON 4U/T", "ACEITE VEGETAL GALON", "4 U/T"],
  ["NR/C NC/T", "PAPEL ALUMINIO 30CM ROLLO 24R/C 36C/T", "PAPEL ALUMINIO 30CM ROLLO", "24 R/C · 36 C/T"],
  ["NU/D ND/C NC/T", "OREO GALLETA MINI CHOCOLATE BOLSA 20,4g 10U/D 6D/C 65C/T", "OREO GALLETA MINI CHOCOLATE BOLSA 20,4g", "10 U/D · 6 D/C · 65 C/T"],
];

for (const [shape, original, name, codes] of PATTERNS) {
  test(`separa el sufijo de empaque: ${shape}`, () => {
    const split = splitPackaging(original);
    assert.equal(split.name, name);
    assert.equal(split.codes.map((c) => c.text).join(" · "), codes);
  });
}

test("otros patrones: 15S/T, ROLLO/C, TUBOS/C y número separado del código", () => {
  assert.equal(splitPackaging("MISABOR AVENA INTEGRAL EN HOJUELA SACO 25KG 15S/T").name, "MISABOR AVENA INTEGRAL EN HOJUELA SACO 25KG");
  assert.deepEqual(splitPackaging("PAPEL TOALLA 12ROLLO/C 40C/T").codes.map((c) => c.text), ["12 ROLLO/C", "40 C/T"]);
  assert.deepEqual(splitPackaging("RITZ GALLETA SANDWICH QUESO 91g 36TUBOS/C 60C/T\t\t\t").codes.map((c) => c.text), ["36 TUBOS/C", "60 C/T"]);
  const wine = splitPackaging(" LA GITANA VINO TINTO TETRABRICK 1L 12U/C 60 C/T");
  assert.equal(wine.name, "LA GITANA VINO TINTO TETRABRICK 1L");
  assert.deepEqual(wine.codes.map((c) => c.text), ["12 U/C", "60 C/T"]);
});

test("nombres truncados por AX (60 caracteres) y palabra suelta tras los códigos", () => {
  assert.equal(splitPackaging("EZSERV TAPA P/VASO FRIO 12OZ Y 16OZ 9CM 50U/P 20P/C 48C/").name, "EZSERV TAPA P/VASO FRIO 12OZ Y 16OZ 9CM");
  assert.equal(
    splitPackaging('EZBAGS BOLSA PLASTICA T-SHIRT BLANCA 7X14" PAQUETE 1KG 265B/P 10P/C 40').name,
    'EZBAGS BOLSA PLASTICA T-SHIRT BLANCA 7X14" PAQUETE 1KG'
  );
  assert.equal(splitPackaging("OREO GALLETA MINI CHOCOLATE BOLSA 20,4g 10U/D 6D/C 65C/T DISPL").name, "OREO GALLETA MINI CHOCOLATE BOLSA 20,4g");
});

test("no toca medidas ni variantes: 500ml, 170g, 2PACK, 5.0, 4,8%, 4,54KG/C, 50m/CAJA", () => {
  assert.equal(splitPackaging("BRUNONIA CERVEZA 330ML 4,8% 24U/C 80C/T").name, "BRUNONIA CERVEZA 330ML 4,8%");
  assert.equal(splitPackaging("MISABOR 2PACK TROZOS ACEITE + ATUN VEGETALES 170G 24U/C 70C/T").name, "MISABOR 2PACK TROZOS ACEITE + ATUN VEGETALES 170G");
  // KG/C es una característica (kilos por caja): se queda en el nombre y solo se corta 100C/T.
  const tilapia = splitPackaging("MI SABOR FILET TILAPIA 50% CARNE-50% GLASEADA 3-5OZ 4,54KG/C 100C/T");
  assert.equal(tilapia.name, "MI SABOR FILET TILAPIA 50% CARNE-50% GLASEADA 3-5OZ 4,54KG/C");
  assert.deepEqual(tilapia.codes.map((c) => c.text), ["100 C/T"]);
  assert.deepEqual(splitPackaging("CABLE ELECTRICO 50m/CAJA"), { name: "CABLE ELECTRICO 50m/CAJA", codes: [] });
});

test("sin sufijo: el nombre queda igual", () => {
  for (const name of ["MISABOR HARINA TRIGO FUERTE P/PAN FERMENTACIÓN CORTA SACO VERDE 25KG", "STEEL CASTLE Lámina Ondu Galvan #26 (0,43) 3,66x0,91 m", "Cerveza Imperial 350ml"]) {
    assert.deepEqual(splitPackaging(name), { name, codes: [] });
  }
});

test("nombre vacío o ambiguo al quitar el sufijo: se deja el original", () => {
  assert.deepEqual(splitPackaging("24U/C 60C/T"), { name: "24U/C 60C/T", codes: [] });
  assert.deepEqual(splitPackaging("A 24U/C").codes, []);
});

test("productTitle: título normalizado sin sufijo + texto informativo; el original no se modifica", () => {
  const original = "CERVEZA 5.0 PREMIUM LATA ALEMANIA 500ML 24U/C 60C/T";
  const copy = String(original);
  assert.deepEqual(productTitle(original), { title: "Cerveza 5.0 Premium Lata Alemania 500ml", packagingText: "24 U/C · 60 C/T" });
  assert.equal(original, copy);
  assert.deepEqual(productTitle("Cerveza Imperial 350ml"), { title: "Cerveza Imperial 350ml", packagingText: null });
});
