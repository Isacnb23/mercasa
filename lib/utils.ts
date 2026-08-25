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
