// Ubicación del navegador para ordenar las tiendas por cercanía (sin React, probado con `npm test`). SOLO se pide cuando el cliente abre el
// retiro (no al cargar la página). La posición vive en memoria: no se envía a ningún servidor ni se guarda en ningún almacenamiento.

export interface PositionLike {
  coords: { latitude: number; longitude: number };
}

export interface GeolocationLike {
  getCurrentPosition: (
    success: (position: PositionLike) => void,
    error: (error: { code?: number }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
  ) => void;
}

// granted = hay posición; denied = el cliente no dio permiso; unavailable = el navegador no la ofrece o falló.
export type LocateResult =
  | { status: "granted"; position: { lat: number; lng: number } }
  | { status: "denied" | "unavailable"; position: null };

const PERMISSION_DENIED = 1;

export function locate(geolocation: GeolocationLike | null | undefined): Promise<LocateResult> {
  if (!geolocation) return Promise.resolve({ status: "unavailable", position: null });
  return new Promise((resolve) => {
    try {
      geolocation.getCurrentPosition(
        (p) => {
          const { latitude, longitude } = p.coords;
          resolve(
            Number.isFinite(latitude) && Number.isFinite(longitude)
              ? { status: "granted", position: { lat: latitude, lng: longitude } }
              : { status: "unavailable", position: null }
          );
        },
        (error) => resolve({ status: error?.code === PERMISSION_DENIED ? "denied" : "unavailable", position: null }),
        // Precisión aproximada: alcanza para ordenar tiendas y evita esperar al GPS.
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    } catch {
      resolve({ status: "unavailable", position: null });
    }
  });
}
