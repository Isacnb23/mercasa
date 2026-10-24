import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasSessionCookies } from "@/lib/auth-cookies";
import { proxyCustomerGet } from "@/lib/checkout-proxy";

// Próximas fechas de entrega de una dirección del cliente logueado (solo lectura).
// El addressId que manda el navegador NO es verdad: aquí solo se valida el formato
// y se reenvía; homex-api verifica que pertenezca a la cuenta del JWT (404 si no).
export async function GET(request: Request) {
  // Sin sesión: 401 antes de mirar nada más y sin llamar a mercasa-api.
  const store = await cookies();
  if (!hasSessionCookies(store)) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const addressId = new URL(request.url).searchParams.get("addressId") ?? "";
  if (!/^\d{1,18}$/.test(addressId) || Number(addressId) <= 0) {
    return NextResponse.json({ error: "addressId inválido." }, { status: 400 });
  }

  return proxyCustomerGet(`/api/customer/delivery-dates?addressId=${addressId}`, "delivery-dates");
}
