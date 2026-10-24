// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import { displayProductName } from "../product-display.ts";

test("respeta códigos de empaque y medidas; pasa a minúscula solo la unidad de la medida", () => {
  assert.equal(
    displayProductName("CERVEZA 5.0 PREMIUM LATA ALEMANIA 500ML 24U/C 60C/T"),
    "Cerveza 5.0 Premium Lata Alemania 500ml 24U/C 60C/T"
  );
  assert.equal(
    displayProductName("MISABOR 2PACK TROZOS ACEITE + ATUN VEGETALES 170G 24U/C 70C/T"),
    "Misabor 2PACK Trozos Aceite + Atun Vegetales 170g 24U/C 70C/T"
  );
});

test("decimales con coma y con punto, y porcentajes", () => {
  assert.equal(displayProductName("BRUNONIA CERVEZA 330ML 4,8% 24U/C 80C/T"), "Brunonia Cerveza 330ml 4,8% 24U/C 80C/T");
  assert.equal(displayProductName("PILLSBURY MEZCLA P/QUEQUE FRESA 13.25OZ 12U/C 64C/T"), "Pillsbury Mezcla P/Queque Fresa 13.25oz 12U/C 64C/T");
  assert.equal(displayProductName("MI SABOR FILET TILAPIA 50% CARNE-50% GLASEADA 3-5OZ  4,54KG/C 100C/T"), "Mi Sabor Filet Tilapia 50% Carne-50% Glaseada 3-5oz 4,54KG/C 100C/T");
});

test("litros se quedan en L; siglas y palabras sin vocales en mayúscula; conectores en minúscula", () => {
  assert.equal(displayProductName("LECHE UHT ENTERA 1L 12U/C 60C/T"), "Leche UHT Entera 1L 12U/C 60C/T");
  assert.equal(displayProductName("GALLETA SANDWICH DE QUESO Y CHOCOLATE 91G"), "Galleta Sandwich de Queso y Chocolate 91g");
  assert.equal(displayProductName("EZSERV BIO CONTENEDOR 6\" CACO3 BCO S/D (CP) 50U/P 10P/C 36C/T"), "Ezserv Bio Contenedor 6\" CACO3 Bco S/D (CP) 50U/P 10P/C 36C/T");
});

test("espacios y tabulaciones sobrantes; el original no se modifica", () => {
  const original = "  RITZ GALLETA SANDWICH QUESO 91g 36TUBOS/C 60C/T\t\t\t ";
  const copy = String(original);
  assert.equal(displayProductName(original), "Ritz Galleta Sandwich Queso 91g 36TUBOS/C 60C/T");
  assert.equal(original, copy);
});

test("un nombre que ya viene en mayúsculas y minúsculas se deja como está", () => {
  assert.equal(displayProductName("Cerveza Imperial 350ml"), "Cerveza Imperial 350ml");
  assert.equal(displayProductName(""), "");
});

test("acentos y eñes se conservan", () => {
  assert.equal(displayProductName("GALLETA MANTEQUILLA ESTILO DANESA NAVIDEÑA 340GR 12U/C 36C/T"), "Galleta Mantequilla Estilo Danesa Navideña 340gr 12U/C 36C/T");
});
