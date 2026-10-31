import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasSessionCookies } from "@/lib/auth-cookies";
import { proxyCustomerGet } from "@/lib/checkout-proxy";

// Fechas de retiro en tienda Homex del cliente logueado (solo lectura): { dates: ["yyyy-MM-dd", ...] }. No recibe parámetros: son las
// mismas para todas las tiendas y las calcula mercasa-api. Sin sesión: 401 antes de mirar nada más y sin llamar a mercasa-api.
export async function GET() {
  const store = await cookies();
  if (!hasSessionCookies(store)) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  return proxyCustomerGet("/api/customer/pickup-dates", "pickup-dates");
}
