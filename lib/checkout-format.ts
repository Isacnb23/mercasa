// Formato de fechas y montos del checkout. Sin dependencias de React: se puede
// probar y reutilizar desde cualquier componente.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COSTA_RICA_TZ = "America/Costa_Rica";

// Una fecha de calendario "yyyy-MM-dd" NO es un instante: `new Date("2026-10-12")`
// la toma como medianoche UTC y en Costa Rica (UTC-6) se vería como el día
// anterior. Se arma al mediodía UTC (06:00 en Costa Rica, mismo día calendario) y se
// formatea con la zona America/Costa_Rica explícita. Devuelve null si no es una
// fecha válida.
export function formatDeliveryDate(isoDate: string, locale: string): string | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  // Rechaza fechas imposibles que Date "corrige" (ej. 2026-02-31).
  if (instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day) return null;

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: COSTA_RICA_TZ,
  }).format(instant);
}

// Colones con el símbolo ₡ y separador de miles del idioma: Intl con currency "CRC"
// imprime el código ("30.000 CRC") en vez del símbolo, por eso se antepone a mano.
export function formatColones(amount: number, locale: string): string {
  return `₡${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)}`;
}
