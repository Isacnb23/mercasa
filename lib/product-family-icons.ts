import { GlassWater, HeartPulse, Sparkles, UtensilsCrossed, Zap, type LucideIcon } from "lucide-react";

// Íconos por familia real de la API (keys = slug de HierarchyNode.id en el
// nivel 1, ver buildProductHierarchy en lib/mercasavip-catalog.ts). Vive en
// su propio módulo (no duplicado en ProductExplorer/ProductCatalogModal) para
// que una familia nueva en el catálogo solo necesite un ícono agregado en un
// solo lugar. Se usa como lookup directo en cada sitio de uso —
// `FAMILY_ICONS[id] ?? Package` — en vez de envolverlo en una función: el
// lint de React (react-hooks/static-components) marca como sospechoso
// devolver un componente desde una función llamada en render, aunque acá sea
// un lookup puro; el acceso directo al Record evita esa falsa alarma.
export const FAMILY_ICONS: Record<string, LucideIcon> = {
  alimentos: UtensilsCrossed,
  bebidas: GlassWater,
  "cuidado-del-hogar": Sparkles,
  "cuidado-personal": HeartPulse,
  electronica: Zap,
};
