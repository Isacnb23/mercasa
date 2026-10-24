// Formato de fechas y montos del checkout. Sin dependencias de React: se puede
// probar y reutilizar desde cualquier componente.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COSTA_RICA_TZ = "America/Costa_Rica";

// Una fecha de calendario "yyyy-MM-dd" NO es un instante: `new Date("2026-10-12")`
// la toma como medianoche UTC y en Costa Rica (UTC-6) se vería como el día
// anterior. Se arma al mediodía UTC (06:00 en Costa Rica, mismo día calendario) y se
// formatea con la zona America/Costa_Rica explícita. Devuelve null si no es una
// fecha válida (incluidas las imposibles que Date "corrige", ej. 2026-02-31).
function calendarInstant(isoDate: string): Date | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  if (instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day) return null;
  return instant;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

// "Lunes 12 de octubre" (es) / "Monday, October 12" (en). Solo se pone en mayúscula la
// primera letra: nada de "De" en medio ni mayúsculas por CSS (`capitalize`). En español
// se quita la coma que Intl pone tras el día de la semana.
export function formatDeliveryDate(isoDate: string, locale: string): string | null {
  const instant = calendarInstant(isoDate);
  if (!instant) return null;

  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: COSTA_RICA_TZ,
  }).formatToParts(instant);

  const isSpanish = locale.toLowerCase().startsWith("es");
  const text = parts
    .map((part, i) =>
      isSpanish && part.type === "literal" && parts[i - 1]?.type === "weekday" ? " " : part.value
    )
    .join("");

  return capitalizeFirst(text);
}

export interface DeliveryDateChip {
  // "lun" / "Mon": se muestra en pequeño (el estilo decide si va en mayúsculas).
  weekday: string;
  // "12": se muestra en grande.
  day: string;
  // "oct" / "Oct": mes abreviado.
  month: string;
}

// Las tres piezas del "chip" de fecha, con la misma zona y el mismo tratamiento de
// fecha de calendario que formatDeliveryDate. Sin puntos finales de abreviatura.
export function formatDeliveryChip(isoDate: string, locale: string): DeliveryDateChip | null {
  const instant = calendarInstant(isoDate);
  if (!instant) return null;

  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: COSTA_RICA_TZ,
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    (parts.find((p) => p.type === type)?.value ?? "").replace(/\.$/, "");

  return { weekday: pick("weekday"), day: pick("day"), month: pick("month") };
}

// Colones con el símbolo ₡ y separador de miles del idioma: Intl con currency "CRC"
// imprime el código ("30.000 CRC") en vez del símbolo, por eso se antepone a mano.
// `decimals`: 0 para montos enteros (pedido mínimo); 2 para precios, impuestos y totales, que traen centavos.
export function formatColones(amount: number, locale: string, decimals = 0): string {
  // useGrouping "always": en español Intl no agrupa los miles de números de 4 cifras ("7725,80"), y los montos se
  // verían inconsistentes junto a "14.551,73".
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: "always" });
  return `₡${formatter.format(amount)}`;
}
