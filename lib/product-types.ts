// Tipos del árbol de productos compartidos entre el server (lib/mercasavip-
// catalog.ts, server-only) y los client components que lo renderizan. Viven
// en un archivo separado, sin `import "server-only"`, para que un client
// component pueda importar el tipo sin arrastrar el módulo server-only al
// bundle del navegador.
export interface HierarchyNode {
  id: string;
  name: string;
  /** Cantidad de ítems (ItemId) distintos bajo este nodo. */
  itemCount: number;
  /**
   * Tamaños de empaque agrupados (ej. "25kg", "50kg") encontrados en
   * Hierarchy4 bajo esta categoría, en vez de listarse como sub-categorías
   * navegables. Solo aparece en nodos de categoría (nivel 3).
   */
  packSizes?: string[];
  children: HierarchyNode[];
}
