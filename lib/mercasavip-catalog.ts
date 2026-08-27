import "server-only";
import type { HierarchyNode } from "./product-types";

export type { HierarchyNode } from "./product-types";

// Capa de datos server-side para la sección "Nuestros Productos": trae el
// catálogo completo de MercasaVIP y deriva la jerarquía Familia → Sub-familia
// → Categoría → Sub-categoría. Patrón de auth/fetch portado de homex-web
// (lib/mercasavip.ts, lib/api-client.ts): header X-Api-Key, server-only,
// resultado tipado ok/error en vez de tirar excepciones hacia los componentes.
//
// Esta API no tiene marcas — el mural de marcas del sitio (ver lib/data.ts,
// brandCategories) es estático y no se toca ni se conecta acá.

const API_BASE = process.env.MERCASAVIP_API_BASE;
const API_KEY = process.env.MERCASAVIP_API_KEY;

// Fijos: PriceGroup=AF y AddressId=-1 son los que usa el catálogo público (sin
// sesión de cliente ni dirección real seleccionada) — no hay UI de login/
// dirección en el sitio corporativo, así que no hace falta parametrizarlos.
const PRICE_GROUP = "AF";
const ADDRESS_ID = "-1";

// Una fila por combinación item+sucursal (~8000 filas). Solo Hierarchy1-4 nos
// importan para el árbol; Hierarchy5 viene vacío en todos los ítems actuales
// y se ignora a propósito.
export interface HE_InventItemRaw {
  ItemId: string;
  ItemName: string;
  Hierarchy1: string;
  Hierarchy2: string;
  Hierarchy3: string;
  Hierarchy4: string;
  Hierarchy5: string;
}

export type MercasaVipResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function fetchInventoryItemsFMCM(): Promise<
  MercasaVipResult<HE_InventItemRaw[]>
> {
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

  try {
    const url = new URL("/Inventory/HE_GetInventoryItemsFMCM", API_BASE);
    url.searchParams.set("PriceGroup", PRICE_GROUP);
    url.searchParams.set("AddressId", ADDRESS_ID);

    const res = await fetch(url, {
      headers: { "X-Api-Key": API_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `MercasaVIP API respondió ${res.status} ${res.statusText}`,
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
          : "Error desconocido llamando a MercasaVIP API",
    };
  }
}

// Colapsa espacios repetidos y bordes — la API trae valores con espaciado
// inconsistente (ej. "Alimentos " vs "Alimentos").
function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

// Clave de deduplicación case/acento-insensitive (ej. "ALIMENTOS"/"Alimentos"
// y "Maiz dulce"/"Maíz dulce" son el mismo nodo; se conserva el label de la
// primera aparición como display, con su acentuación real).
function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "na";
}

// Hierarchy4 mezcla sub-categorías reales ("Snacks Dulces") con tamaños de
// empaque ("50kg", "25 Kg", "1.5L", "500 ml"). Detecta el patrón numérico +
// unidad de peso/volumen/cantidad para poder agruparlos aparte en vez de
// mostrarlos como si fueran sub-categorías comerciales.
const PACKAGING_SIZE_RE =
  /^\d+([.,]\d+)?\s*(kgs?|gr|g|gramos?|kilos?|lbs?|libras?|oz|onzas?|mls?|lts?|l|litros?|und|unid|unidades?|uds?|pzas?|piezas?)\.?$/i;

function isPackagingSize(value: string): boolean {
  return PACKAGING_SIZE_RE.test(value);
}

function comparePackSize(a: string, b: string): number {
  const numA = Number.parseFloat(a.replace(",", "."));
  const numB = Number.parseFloat(b.replace(",", "."));
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.localeCompare(b, "es");
}

// Nodo interno mutable usado mientras se arma el árbol (Sets para deduplicar
// ItemId repetidos por fila item+sucursal). Se convierte a HierarchyNode[]
// (inmutable, con arrays) al final via toNodes().
interface HierarchyAccumulator {
  label: string;
  itemIds: Set<string>;
  children: Map<string, HierarchyAccumulator>;
  packSizes?: Set<string>;
  /**
   * ItemId -> {name, packSize} de TODOS los productos bajo este nodo
   * (directos o anidados en una sub-categoría). Solo se llena para nodos de
   * categoría (ver buildProductHierarchy) — es el único nivel que la UI
   * expande para listar productos.
   */
  productNames?: Map<string, { name: string; packSize?: string }>;
}

function makeAccumulator(label: string): HierarchyAccumulator {
  return { label, itemIds: new Set(), children: new Map() };
}

function toNodes(
  accumulators: Map<string, HierarchyAccumulator>,
  parentPath: string[]
): HierarchyNode[] {
  const nodes = Array.from(accumulators.values()).map((acc) => {
    const path = [...parentPath, slugify(acc.label)];
    return {
      id: path.join("/"),
      name: acc.label,
      itemCount: acc.itemIds.size,
      ...(acc.packSizes
        ? { packSizes: Array.from(acc.packSizes).sort(comparePackSize) }
        : {}),
      ...(acc.productNames
        ? {
            products: Array.from(acc.productNames, ([id, p]) => ({
              id,
              name: p.name,
              ...(p.packSize ? { packSize: p.packSize } : {}),
            })).sort((a, b) => a.name.localeCompare(b.name, "es")),
          }
        : {}),
      children: toNodes(acc.children, path),
    } satisfies HierarchyNode;
  });

  // Más relevante (más ítems) primero; a igualdad, alfabético en español.
  return nodes.sort(
    (a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name, "es")
  );
}

// Deriva el árbol Familia → Sub-familia → Categoría → Sub-categoría a partir
// del catálogo plano. No hay endpoint que devuelva esto ya anidado: se
// obtienen los valores distintos por nivel y sus relaciones padre-hijo
// reales recorriendo cada fila una sola vez.
export function buildProductHierarchy(
  items: HE_InventItemRaw[]
): HierarchyNode[] {
  const families = new Map<string, HierarchyAccumulator>();

  for (const item of items) {
    const h1 = normalizeLabel(item.Hierarchy1);
    if (!h1) continue; // sin familia no hay dónde ubicar el ítem en el árbol

    const family = getOrCreate(families, h1);
    family.itemIds.add(item.ItemId);

    const h2 = normalizeLabel(item.Hierarchy2);
    if (!h2) continue;
    const subFamily = getOrCreate(family.children, h2);
    subFamily.itemIds.add(item.ItemId);

    const h3 = normalizeLabel(item.Hierarchy3);
    if (!h3) continue;
    const category = getOrCreate(subFamily.children, h3);
    category.itemIds.add(item.ItemId);

    const h4 = normalizeLabel(item.Hierarchy4);
    const packSize = h4 && isPackagingSize(h4) ? h4 : undefined;

    // Se registra ACÁ (antes de la rama de sub-categoría) para que el
    // producto quede en la categoría sin importar si termina anidado en una
    // sub-categoría, agrupado como tamaño de empaque, o directo sin
    // Hierarchy4 — la categoría es el único nivel que expone `products`. Si
    // el mismo ItemId ya se vio (otra fila item+sucursal) sin packSize
    // todavía, esta pasada lo completa.
    category.productNames ??= new Map();
    const existingProduct = category.productNames.get(item.ItemId);
    if (!existingProduct || (!existingProduct.packSize && packSize)) {
      category.productNames.set(item.ItemId, { name: normalizeLabel(item.ItemName), packSize });
    }

    if (!h4) continue;

    if (packSize) {
      category.packSizes ??= new Set();
      category.packSizes.add(h4);
      continue;
    }

    const subCategory = getOrCreate(category.children, h4);
    subCategory.itemIds.add(item.ItemId);
  }

  return toNodes(families, []);
}

function getOrCreate(
  map: Map<string, HierarchyAccumulator>,
  label: string
): HierarchyAccumulator {
  const key = normalizeKey(label);
  let acc = map.get(key);
  if (!acc) {
    acc = makeAccumulator(label);
    map.set(key, acc);
  }
  return acc;
}

// Cache en memoria del proceso del server (igual patrón que HomeX): evita
// pegarle a MercasaVIP (~8000 filas) en cada request. Se cachea el árbol ya
// armado, no las filas crudas.
const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedTree: { data: HierarchyNode[]; expiresAt: number } | null = null;

export async function getProductHierarchy(): Promise<
  MercasaVipResult<HierarchyNode[]>
> {
  if (cachedTree && cachedTree.expiresAt > Date.now()) {
    return { ok: true, data: cachedTree.data };
  }

  const result = await fetchInventoryItemsFMCM();
  if (!result.ok) return result;

  const tree = buildProductHierarchy(result.data);
  cachedTree = { data: tree, expiresAt: Date.now() + CACHE_TTL_MS };
  return { ok: true, data: tree };
}
