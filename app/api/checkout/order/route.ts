import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { proxyCustomerPost } from "@/lib/checkout-proxy";

// Confirma el pedido. Hoy homex-api NO crea pedidos: responde 503 { code: "ordering_disabled" } mientras
// Ordering:Enabled=false (y 501 -> "ordering_not_available" si se habilita sin implementación). La web
// integra el flujo completo contra ese contrato estable. No se reenvía ningún dato del navegador: el
// pedido se arma en el servidor. Sin sesión: 401 SIN llamar a mercasa-api.
export async function POST() {
  const store = await cookies();
  if (!store.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  return proxyCustomerPost("/api/customer/order", {}, "order-create");
}
