import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { proxyCustomerPost } from "@/lib/checkout-proxy";
import { MAX_ORDER_BODY_BYTES, sanitizeOrderRequest } from "@/lib/order-logic";

// Valida el pedido en el servidor: precios, descuentos, impuestos, totales, mínimo, fecha y
// disponibilidad los calcula homex-api. El navegador manda SOLO itemId y cantidad (más dirección, fecha y
// método de pago): aquí se descarta cualquier otro campo (precios, totales, mínimo...) antes de reenviar.
// Sin sesión: 401 SIN llamar a mercasa-api. Sin caché de datos del cliente.
export async function POST(request: Request) {
  const store = await cookies();
  if (!store.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const text = await request.text();
  if (text.length > MAX_ORDER_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const clean = sanitizeOrderRequest(raw);
  if (!clean) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  return proxyCustomerPost("/api/customer/order/validate", clean, "order-validate");
}
