// IP del visitante para los límites de homex-api / mercasa-api. Detrás del proxy de la web llega en x-forwarded-for.
// Pendiente: confirmar con infraestructura que el proxy sobrescribe ese encabezado (si no, el visitante lo podría falsear).
// Compartida por el registro y el inicio/renovación de sesión: los tres mandan la misma IP en X-Client-Ip.
export function clientIp(headers: { get(name: string): string | null }): string | undefined {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || undefined;
}
