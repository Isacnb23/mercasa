// Prueba con el test runner de Node (npm test). Interruptor NEXT_PUBLIC_ENABLE_CATALOG_PRICES.
import test from "node:test";
import assert from "node:assert/strict";
import { catalogPricesEnabled } from "../feature-flags.ts";

test("el valor por defecto es encendido; solo 'false' apaga", () => {
  assert.equal(catalogPricesEnabled(undefined), true);
  assert.equal(catalogPricesEnabled(""), true);
  assert.equal(catalogPricesEnabled("true"), true);
  assert.equal(catalogPricesEnabled("0"), true);
  assert.equal(catalogPricesEnabled("false"), false);
});

// Los hooks y la ruta no se pueden ejecutar con el runner de Node (React, next/server, imports sin extensión): se comprueba
// que CADA punto que llama a /api/catalog/prices queda detrás del interruptor, y que el estado apagado no es un aviso.
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

test("cada llamada a /api/catalog/prices está protegida por CATALOG_PRICES_ENABLED", () => {
  const prices = read("lib/hooks/useCatalogPrices.ts");
  const units = read("lib/hooks/useCatalogUnits.ts");
  const fetchUnits = read("lib/fetch-units.ts");
  const route = read("app/api/catalog/prices/route.ts");

  assert.match(prices, /if \(!CATALOG_PRICES_ENABLED \|\| !accountNum \|\| isLoading \|\| !idsKey\) return;/);
  assert.match(units, /if \(!CATALOG_PRICES_ENABLED \|\| !accountNum \|\| isLoading \|\| !idsKey\) return;/);
  assert.match(fetchUnits, /if \(!CATALOG_PRICES_ENABLED\) return null;\s+try \{/);
  assert.match(route, /export async function POST\(request: Request\) \{[^]*?if \(!CATALOG_PRICES_ENABLED\) \{[^]*?status: 404[^]*?\}\s+const store = await cookies\(\)/);
});

test("apagado, el estado de precios es 'ready' (sin aviso) y los precios no se muestran", () => {
  const prices = read("lib/hooks/useCatalogPrices.ts");
  assert.match(prices, /const status: CatalogPricesStatus = !CATALOG_PRICES_ENABLED \|\| isLoading\s+\? "ready"/);
  assert.match(prices, /const priceFor = [^]*?if \(!CATALOG_PRICES_ENABLED \|\|[^]*?return \{ kind: "hidden" \}/);
  assert.match(prices, /const pickupPriceFor = [^]*?if \(!CATALOG_PRICES_ENABLED \|\|[^]*?hidden/);
});

test("encendido, el 404 sigue marcando 'unavailable' como antes", () => {
  const prices = read("lib/hooks/useCatalogPrices.ts");
  assert.match(prices, /if \(!res\.ok\) throw new Error/);
  assert.match(prices, /own\.failed\s+\? "unavailable"/);
});
