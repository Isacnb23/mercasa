// Distingue "el servicio de ingreso no está disponible" (SQL caído, backend fuera de línea,
// timeout) de "credenciales incorrectas" (401). Sin dependencias de React ni de Next: lo
// usan la ruta de servidor (app/api/auth/login) y el contexto de sesión del navegador, y
// se prueba con el test runner de Node (lib/__tests__).

// Código que la ruta de servidor agrega al cuerpo cuando el servicio no está disponible.
export const SERVICE_UNAVAILABLE_CODE = "service_unavailable";

// 503 (servicio no disponible) y 504 (timeout de un intermediario) cuentan como "no
// disponible"; 401 (credenciales) y 502 (falla genérica/configuración) NO.
export function isServiceUnavailableStatus(status: number): boolean {
  return status === 503 || status === 504;
}

export function isServiceUnavailable(status: number, body?: unknown): boolean {
  if (isServiceUnavailableStatus(status)) return true;
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { code?: unknown }).code === SERVICE_UNAVAILABLE_CODE
  );
}
