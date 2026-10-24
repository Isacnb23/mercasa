// Presentaciones de UN producto, a pedido (clic en el "+" de la tarjeta). Solo con sesión (el servidor responde 401
// sin ella y la lista de precios sale de la cuenta del JWT). Devuelve null si no se pudieron obtener (sin sesión,
// servicio caído, respuesta inesperada): quien llama decide sin inventar nada.
import { parseCatalogPrices, type CatalogUnit } from "./catalog-prices";
import { CATALOG_PRICES_ENABLED } from "./feature-flags";

export async function fetchItemUnits(itemId: string, signal?: AbortSignal): Promise<CatalogUnit[] | null> {
  if (!CATALOG_PRICES_ENABLED) return null;
  try {
    const res = await fetch("/api/catalog/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: [itemId], withUnits: true }),
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const parsed = parseCatalogPrices(await res.json());
    if (!parsed || parsed.priceListMissing) return null;
    return parsed.prices.find((p) => p.itemId.toUpperCase() === itemId.toUpperCase())?.units ?? null;
  } catch {
    return null;
  }
}
