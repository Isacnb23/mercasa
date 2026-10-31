// Tiendas de retiro: estado de existencia, distancia y orden (sin React, sin imports en tiempo de ejecución; se prueba con `npm test`).
// El cálculo de cercanía es SOLO del navegador: la ubicación del cliente no se envía al servidor ni se guarda.

// Estado de existencia que informa el servidor para la presentación elegida (nunca cantidades exactas).
export type StoreStatus = "available" | "low" | "out";

export const isStoreStatus = (value: unknown): value is StoreStatus => value === "available" || value === "low" || value === "out";

export interface Coords {
  lat: number;
  lng: number;
}

export interface StoreLike {
  siteId: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  // Nulo/ausente = el servidor no informó existencia (sin sesión, o no se pudo leer): no se muestra estado.
  status?: StoreStatus | null;
}

// Cuántas tiendas se muestran antes de "Ver todas las tiendas" cuando hay ubicación.
export const NEAREST_COUNT = 3;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Distancia en línea recta (haversine) en km.
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function storeCoords(store: Pick<StoreLike, "lat" | "lng">): Coords | null {
  return isFiniteNumber(store.lat) && isFiniteNumber(store.lng) ? { lat: store.lat, lng: store.lng } : null;
}

export interface RankedStore<T extends StoreLike> {
  store: T;
  // Distancia en km desde el cliente; null si no hay ubicación o la tienda no tiene coordenadas.
  km: number | null;
}

export interface RankedStores<T extends StoreLike> {
  // Lo que se ve de entrada.
  shown: RankedStore<T>[];
  // Lo que queda tras "Ver todas las tiendas" (vacío si no hay nada que ocultar).
  hidden: RankedStore<T>[];
  // ¿Se ordenó por distancia?
  byDistance: boolean;
}

// Orden de las tiendas:
//   - las SIN existencia (out) siempre al final;
//   - con ubicación: por distancia (las que no tienen coordenadas, después de las que sí), y solo las NEAREST_COUNT primeras de entrada;
//   - sin ubicación (no se dio permiso o hubo un error), o sin ninguna tienda con coordenadas: se muestran TODAS, por nombre.
export function rankStores<T extends StoreLike>(stores: readonly T[], position: Coords | null): RankedStores<T> {
  const usable = position !== null && stores.some((s) => storeCoords(s) !== null);
  const ranked = stores.map((store): RankedStore<T> => {
    const coords = usable && position ? storeCoords(store) : null;
    return { store, km: coords && position ? haversineKm(position, coords) : null };
  });

  const outRank = (r: RankedStore<T>) => (r.store.status === "out" ? 1 : 0);
  ranked.sort((a, b) => {
    if (outRank(a) !== outRank(b)) return outRank(a) - outRank(b);
    if (usable) {
      if (a.km !== null && b.km !== null && a.km !== b.km) return a.km - b.km;
      if ((a.km === null) !== (b.km === null)) return a.km === null ? 1 : -1;
    }
    return (a.store.name || a.store.siteId).localeCompare(b.store.name || b.store.siteId, "es");
  });

  if (!usable) return { shown: ranked, hidden: [], byDistance: false };
  return { shown: ranked.slice(0, NEAREST_COUNT), hidden: ranked.slice(NEAREST_COUNT), byDistance: true };
}

// "2,4" / "12" (un decimal por debajo de 10 km). El sufijo "km" lo pone la traducción.
export function formatKm(km: number, locale: string): string {
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rounded);
}
