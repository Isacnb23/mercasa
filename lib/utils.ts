import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Formatea una cantidad de productos como refuerzo de variedad, no como dato
// técnico exacto: familias grandes se redondean hacia abajo a la decena con
// "+" (413 -> "+410"), familias chicas (ej. Electrónica, 7) se muestran tal
// cual — redondear un número ya chico se sentiría raro, no aspiracional.
export function formatProductCount(count: number): string {
  if (count < 20) return `${count}`;
  return `+${Math.floor(count / 10) * 10}`;
}

// Compara nombres de producto ignorando mayúsculas/acentos (ej. la búsqueda
// "colados" debe encontrar "Colados" y "Coladós" por igual). Client-safe: a
// diferencia de normalizeKey en lib/mercasavip-catalog.ts (server-only), esta
// la usa el buscador del catálogo en el browser.
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
