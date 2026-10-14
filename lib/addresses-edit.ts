// Lógica pura de "Editar dirección" (sin React ni Next, para probarla con el test runner de Node).
// La cuenta del cliente y la compañía NUNCA viajan desde aquí: la cuenta sale del JWT de la sesión en el servidor y la
// compañía va fija en mercasa-api. Lo único editable es lo que muestra el formulario de crear dirección.

import type { SavedAddress } from "./auth-types";

export interface AddressOption {
  id: string;
  name: string;
}

// Id de la dirección (el addressId de GET /api/addresses): solo dígitos, hasta 18, mayor que cero.
export const isValidAddressId = (value: string): boolean => /^\d{1,18}$/.test(value) && Number(value) > 0;

// Compara nombres sin importar mayúsculas, tildes ni espacios sobrantes ("San José" = "san jose").
export const normalizeName = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

// Id de la opción cuyo nombre coincide con el de la dirección guardada; "" si no hay nombre o no se encuentra (el cliente
// la elige a mano: la dirección guardada solo trae los nombres, y son null si el código no se resuelve en el catálogo).
export function matchOptionId(options: AddressOption[], name: string | null | undefined): string {
  const wanted = normalizeName(name);
  if (wanted === "") return "";
  return options.find((option) => normalizeName(option.name) === wanted)?.id ?? "";
}

export interface EditPrefill {
  addressName: string;
  // En la dirección guardada, la descripción son las señas (ver CustomerAddressResponse).
  street: string;
  pin: { lat: number; lng: number } | null;
  provinceName: string | null;
  cantonName: string | null;
  districtName: string | null;
  cityName: string | null;
}

export function prefillFromSaved(address: SavedAddress): EditPrefill {
  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  return {
    addressName: address.name ?? "",
    street: address.description ?? "",
    pin: hasPin ? { lat, lng } : null,
    provinceName: address.provinceName,
    cantonName: address.cantonName,
    districtName: address.districtName,
    cityName: address.cityName,
  };
}

// Qué le pasó al guardar los cambios, para elegir qué mostrar.
export type DirectionErrorKind = "session" | "notFound" | "validation" | "aifUnavailable" | "unavailable";

export function classifyDirectionError(status: number, body: unknown): DirectionErrorKind {
  const code = typeof (body as { code?: unknown } | null)?.code === "string" ? (body as { code: string }).code : "";
  if (status === 401) return "session";
  if (status === 404 || code === "not_found") return "notFound";
  if (status === 400 || code === "validation_failed") return "validation";
  if (code === "aif_unavailable") return "aifUnavailable";
  return "unavailable";
}

// Aviso al volver a la lista.
export type AddressNotice = "saved" | "notFound";

// Huella de lo que de una dirección cambia precios, fechas o ruta de entrega. Si cambia, el carrito vuelve a validar.
export function addressSignature(address: SavedAddress | null): string {
  if (!address) return "";
  return [
    address.addressId,
    address.latitude,
    address.longitude,
    address.city,
    address.principalDeliveryDay ?? "",
    address.secondDeliveryDay ?? "",
  ].join("|");
}
