// Credenciales que acepta homex-api: el "usuario" es la cédula (VATNUM), no un email. Esta web manda lo que
// la persona teclea, sin formatearlo. homex-api prueba hasta 4 formas de la cédula (lo recibido, solo dígitos,
// con guiones X-XXXX-XXXX / X-XXX-XXXXXX y el VATNUM real) contra el procedimiento de login, que compara la
// cédula IDÉNTICA a como se dio de alta: por eso se puede teclear con o sin guiones.
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
// `requiresCoordination` no hay fechas automáticas: un asesor coordina la entrega (`coordinationReason`: no_city | no_free_day |
// unconfigured_zone). `options` (opcional) trae el tipo de cada fecha: route y plan = sin costo de envío; special = con cobro (`freight`).
export interface DeliveryDateOption {
  date: string;
  type: "route" | "plan" | "special";
  freight: number;
}

export interface DeliveryDatesInfo {
  dates: string[];
  requiresCoordination: boolean;
  coordinationReason: string | null;
  options: DeliveryDateOption[];
}

// Fechas de retiro en tienda (GET /api/checkout/pickup-dates): "yyyy-MM-dd", sin hora ni zona.
export interface PickupDatesInfo {
  dates: string[];
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
