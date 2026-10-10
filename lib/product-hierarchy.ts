import type { HierarchyNode, ProductAvailability } from "./product-types";

// Árbol Familia → Sub-familia → Categoría → Sub-categoría a partir del catálogo plano. Lógica PURA (sin
// fetch ni server-only) para poder probarla con `npm test`; la lectura de la API vive en mercasavip-catalog.ts.

// Una fila por producto (el catálogo único ya trae un ítem por ItemId; la lectura vieja traía una fila por
// ítem+sucursal y aquí también se deduplica). Solo Hierarchy1-4 nos importan para el árbol; Hierarchy5 viene
// vacío en todos los ítems actuales y se ignora a propósito. `availability` viene del catálogo único (A
// domicilio / Retiro en tienda); sin ella (lectura de respaldo) el producto cuenta como solo A domicilio.
export interface HE_InventItemRaw {
  ItemId: string;
  ItemName: string;
  Hierarchy1: string;
  Hierarchy2: string;
  Hierarchy3: string;
  Hierarchy4: string;
  Hierarchy5: string;
  availability?: ProductAvailability;
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
  productNames?: Map<string, { name: string; packSize?: string; availability?: ProductAvailability }>;
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
              ...(p.availability ? { availability: p.availability } : {}),
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
      category.productNames.set(item.ItemId, { name: normalizeLabel(item.ItemName), packSize, availability: item.availability });
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

  return reorderTopFamilies(toNodes(families, []));
}

// Orden de negocio para las familias en la grilla de "Nuestros Productos"
// (ver familias-orden-grilla-3-columnas.md): Alimentos y Bebidas primero
// pase lo que pase, el resto queda como venía (por volumen de productos, de
// mayor a menor — ya es el criterio que aplica toNodes()). Solo afecta el
// nivel de familia; sub-familia/categoría/sub-categoría siguen ordenadas
// por cantidad de ítems como siempre.
const TOP_FAMILY_PRIORITY = ["alimentos", "bebidas"].map(normalizeKey);

function reorderTopFamilies(families: HierarchyNode[]): HierarchyNode[] {
  const byPriority = (name: string) => {
    const index = TOP_FAMILY_PRIORITY.indexOf(normalizeKey(name));
    return index === -1 ? TOP_FAMILY_PRIORITY.length : index;
  };
  return [...families].sort((a, b) => byPriority(a.name) - byPriority(b.name));
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
