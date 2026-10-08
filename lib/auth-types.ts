// Credenciales que acepta homex-api: el "usuario" es la cédula (VATNUM),
// no un email. homex-api la normaliza internamente (con o sin guiones), no
// hace falta validar/formatear el formato del lado del cliente.
export interface LoginCredentials {
  userId: string;
  password: string;
}

// Se extraen decodificando los claims del JWT en el servidor (ver lib/jwt.ts)
// — el token en sí nunca llega al cliente, solo estos datos ya derivados.
export interface AuthUser {
  accountNum: string;
  name: string;
  email: string;
}

// Datos del formulario de dirección de entrega (Perfil). Se mandan a
// /api/directions con NOMBRES (no códigos) de provincia/cantón/distrito/
// ciudad, igual que homex-web. OJO con el mapeo hacia AX (confirmado en el
// backend real): `street` = señas, `address` = nombre de la dirección.
export interface DirectionInput {
  fullName: string;
  province: string;
  canton: string;
  district: string;
  // Vacío si el distrito no tiene ciudad.
  city?: string;
  street: string;
  address: string;
  postalName?: string;
  latitude: number | string;
  longitude: number | string;
}

// Monto mínimo de pedido (GET /api/checkout/minimum-amount), en colones. `isDefault`
// = el servidor aplicó el valor por defecto porque no encontró uno propio.
export interface MinimumAmountInfo {
  minimumAmount: number;
  isDefault: boolean;
}

// Próximas fechas de entrega de la dirección activa (GET /api/checkout/delivery-dates).
// `dates` son fechas de calendario "yyyy-MM-dd" (sin hora ni zona). Con
// `requiresCoordination` no hay fechas automáticas: se coordina con servicio al cliente.
export interface DeliveryDatesInfo {
  dates: string[];
  requiresCoordination: boolean;
}

// Dirección de entrega guardada (GET /api/addresses). `city` es el código
// original (CI###, se necesita para editar); los cuatro nombres vienen
// resueltos desde el servidor y son null si el código no está (o es ambiguo)
// en el catálogo de ubicaciones.
export interface SavedAddress {
  addressId: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  city: string;
  provinceName: string | null;
  cantonName: string | null;
  districtName: string | null;
  cityName: string | null;
  isPrimary: boolean;
  principalDeliveryDay: number | null;
  secondDeliveryDay: number | null;
}
