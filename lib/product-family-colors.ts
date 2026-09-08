// Acento de color por familia real de la API (ver
// familias-color-catalogo-tamano.md) — mismo criterio que
// product-family-icons.ts: keys = slug de HierarchyNode.id en el nivel 1,
// vive en su propio módulo para que una familia nueva solo necesite un color
// agregado en un solo lugar. Paleta pastel/editorial, misma saturación y
// luminosidad entre todas las familias (ninguna más "gritona" que otra),
// pensada para combinar con el navy/dorado del resto del sitio.
export interface FamilyColor {
  /** Borde superior de la tarjeta + ícono en estado activo/hover. */
  accent: string;
  /** Fondo del círculo del ícono en reposo (muy claro/pastel). */
  iconBg: string;
  /** Fondo del círculo del ícono en hover/focus (un poco más saturado). */
  iconBgActive: string;
  /** Tinte de la sombra en hover, ya con alpha listo para boxShadow. */
  shadowTint: string;
}

const BEBIDAS_BLUE: FamilyColor = {
  accent: "#2F6FED",
  iconBg: "#E6F1FB",
  iconBgActive: "#D9EAFC",
  shadowTint: "rgba(47,111,237,0.22)",
};

export const FAMILY_COLORS: Record<string, FamilyColor> = {
  alimentos: {
    accent: "#C98A2B",
    iconBg: "#FBF1DC",
    iconBgActive: "#F6E6C2",
    shadowTint: "rgba(201,138,43,0.22)",
  },
  bebidas: BEBIDAS_BLUE,
  "cuidado-del-hogar": {
    accent: "#2E9E7C",
    iconBg: "#E1F4EC",
    iconBgActive: "#CDEBDD",
    shadowTint: "rgba(46,158,124,0.22)",
  },
  "cuidado-personal": {
    accent: "#D2668E",
    iconBg: "#FBE7EE",
    iconBgActive: "#F6D3E1",
    shadowTint: "rgba(210,102,142,0.22)",
  },
  construccion: {
    accent: "#C06B3E",
    iconBg: "#F7E7DD",
    iconBgActive: "#F0D5C1",
    shadowTint: "rgba(192,107,62,0.22)",
  },
  electronica: {
    accent: "#7C5FD1",
    iconBg: "#EDE8FB",
    iconBgActive: "#DFD5F7",
    shadowTint: "rgba(124,95,209,0.22)",
  },
};

export const DEFAULT_FAMILY_COLOR: FamilyColor = BEBIDAS_BLUE;
