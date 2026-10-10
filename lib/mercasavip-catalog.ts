import "server-only";
import type { HierarchyNode } from "./product-types";
import { buildProductHierarchy, type HE_InventItemRaw } from "./product-hierarchy";
import { parseUnifiedCatalog } from "./catalog-channel";

export type { HierarchyNode } from "./product-types";

// Capa de datos server-side para la sección "Nuestros Productos": trae el catálogo ÚNICO y deriva la
// jerarquía Familia → Sub-familia → Categoría → Sub-categoría (la lógica pura vive en product-hierarchy.ts).
//
// El catálogo es uno solo, como el de MercasaVIP: cada producto indica cómo se consigue — A domicilio
// (compañía cmer) y/o Retiro en tienda (compañía fmcm, con las tiendas con existencia). La unión, la
// normalización de categorías y los sitios activos los resuelve homex-api; esta capa solo lo lee de
// mercasa-api (GET /api/catalog/items, header X-Api-Key, server-only). Los precios NO viajan por aquí.
//
// Si mercasa-api no responde (o aún no tiene el endpoint) se cae a la lectura anterior directa de MercasaVIP
// (solo cmer, sin `availability`): todo se ve como A domicilio, igual que antes, y se reintenta pronto.
//
// Esta API no tiene marcas — el mural de marcas del sitio (ver lib/data.ts,
// brandCategories) es estático y no se toca ni se conecta acá.

const API_BASE = process.env.MERCASAVIP_API_BASE;
const API_KEY = process.env.MERCASAVIP_API_KEY;

// Fijos: PriceList=AF y AddressId=-1 son los que usa el catálogo público (sin
// sesión de cliente ni dirección real seleccionada) — no hay UI de login/
// dirección en el sitio corporativo, así que no hace falta parametrizarlos.
const PRICE_LIST = "AF";
const ADDRESS_ID = "-1";


export type MercasaVipResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// IMPORTANTE (ver fix-consolidado-demo-roisbel.md, punto 4): `HE_GetInventoryItemsFMCM`
// es el catálogo de HomeX (DataAreaId "fmcm"), NO el de Mercasa — la base
// GIPLUS es compartida entre ambas empresas del grupo y ese endpoint sí o sí
// devuelve el inventario de HomeX (confirmado: ~8000 filas, 100% DataAreaId
// fmcm/FMCM, sin una sola fila cmer). Pasarle `DataAreaId=CMER` como query
// param no filtra nada — el endpoint lo ignora. El catálogo real de Mercasa
// (DataAreaId "cmer") vive en `HE_GetInventoryItemsByFamily`, que solo acepta
// un `Hierarchy1` a la vez, así que hay que armarlo en dos pasos: primero
// `HE_GetFamilies` para la lista real de familias, después una llamada por
// familia. Confirmado contra la API real: 6 familias (incl. "Construcción",
// que no existe en el catálogo de HomeX), ~490 filas totales, 100% cmer.
async function fetchFamilies(): Promise<MercasaVipResult<string[]>> {
  try {
    const url = new URL("/Inventory/HE_GetFamilies", API_BASE);
    url.searchParams.set("PriceList", PRICE_LIST);

    const res = await fetch(url, {
      headers: { "X-Api-Key": API_KEY! },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `MercasaVIP API (HE_GetFamilies) respondió ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as string[];
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido llamando a MercasaVIP API (HE_GetFamilies)",
    };
  }
}

async function fetchInventoryItemsByFamily(
  hierarchy1: string
): Promise<MercasaVipResult<HE_InventItemRaw[]>> {
  try {
    const url = new URL("/Inventory/HE_GetInventoryItemsByFamily", API_BASE);
    url.searchParams.set("PriceList", PRICE_LIST);
    url.searchParams.set("Hierarchy1", hierarchy1);
    url.searchParams.set("AddressId", ADDRESS_ID);

    const res = await fetch(url, {
      headers: { "X-Api-Key": API_KEY! },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `MercasaVIP API (HE_GetInventoryItemsByFamily, ${hierarchy1}) respondió ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as HE_InventItemRaw[];
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : `Error desconocido llamando a MercasaVIP API (HE_GetInventoryItemsByFamily, ${hierarchy1})`,
    };
  }
}

// Lectura de respaldo (solo cmer, como era antes de existir el catálogo único).
async function fetchInventoryItemsCMER(): Promise<MercasaVipResult<HE_InventItemRaw[]>> {
  if (!API_BASE) {
    return {
      ok: false,
      error: "MERCASAVIP_API_BASE no está configurada. Revisá .env.local.",
    };
  }
  if (!API_KEY) {
    return {
      ok: false,
      error: "MERCASAVIP_API_KEY no está configurada. Revisá .env.local.",
    };
  }

  const families = await fetchFamilies();
  if (!families.ok) return families;

  const perFamily = await Promise.all(
    families.data.map((hierarchy1) => fetchInventoryItemsByFamily(hierarchy1))
  );

  const failed = perFamily.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;

  const data = perFamily.flatMap((result) =>
    result.ok ? result.data : []
  );
  return { ok: true, data };
}

// Catálogo único desde mercasa-api. La primera lectura sin caché ejecuta HE_GetProductsFMCM en homex-api
// (mucho más lenta que una con caché): margen amplio.
const UNIFIED_TIMEOUT_MS = 60_000;

async function fetchUnifiedCatalog(): Promise<MercasaVipResult<HE_InventItemRaw[]>> {
  const base = process.env.MERCASA_API_BASE;
  const key = process.env.MERCASA_API_KEY;
  if (!base || !key) {
    return { ok: false, error: "MERCASA_API_BASE/MERCASA_API_KEY no están configuradas. Revisá .env.local." };
  }

  try {
    const res = await fetch(`${base}/api/catalog/items`, {
      headers: { "X-Api-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(UNIFIED_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `mercasa-api (catalog/items) respondió ${res.status} ${res.statusText}` };
    }

    const items = parseUnifiedCatalog(await res.json());
    if (!items) return { ok: false, error: "mercasa-api (catalog/items) devolvió una respuesta inesperada" };

    return {
      ok: true,
      data: items.map((item) => ({
        ItemId: item.itemId,
        ItemName: item.itemName,
        Hierarchy1: item.hierarchy1,
        Hierarchy2: item.hierarchy2,
        Hierarchy3: item.hierarchy3,
        Hierarchy4: item.hierarchy4,
        Hierarchy5: item.hierarchy5,
        availability: item.availability,
      })),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido llamando a mercasa-api (catalog/items)",
    };
  }
}

// Cache en memoria del proceso del server: evita pegarle a la API en cada request. Se cachea el árbol ya
// armado, no las filas crudas. Dos pedidos a la vez (Productos y segmentos de Customer Class) comparten UNA
// sola lectura en vuelo. El árbol de respaldo (sin retiro en tienda) dura poco para volver pronto al único.
const CACHE_TTL_MS = 15 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;
let cachedTree: { data: HierarchyNode[]; expiresAt: number } | null = null;
let inFlight: Promise<MercasaVipResult<HierarchyNode[]>> | null = null;

async function loadHierarchy(): Promise<MercasaVipResult<HierarchyNode[]>> {
  const unified = await fetchUnifiedCatalog();
  if (unified.ok) {
    const tree = buildProductHierarchy(unified.data);
    cachedTree = { data: tree, expiresAt: Date.now() + CACHE_TTL_MS };
    return { ok: true, data: tree };
  }

  console.warn(`[catalog] Catálogo único no disponible, se usa la lectura de respaldo (solo A domicilio): ${unified.error}`);
  const legacy = await fetchInventoryItemsCMER();
  if (!legacy.ok) return legacy;

  const tree = buildProductHierarchy(legacy.data);
  cachedTree = { data: tree, expiresAt: Date.now() + FALLBACK_TTL_MS };
  return { ok: true, data: tree };
}

export async function getProductHierarchy(): Promise<MercasaVipResult<HierarchyNode[]>> {
  if (cachedTree && cachedTree.expiresAt > Date.now()) {
    return { ok: true, data: cachedTree.data };
  }

  inFlight ??= loadHierarchy().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
