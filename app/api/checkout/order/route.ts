import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { proxyOrderCreate } from "@/lib/checkout-proxy";
import { sanitizeCreateOrderBody } from "@/lib/order-create";
import { MAX_ORDER_BODY_BYTES } from "@/lib/order-logic";

// Crea el pedido. El navegador manda SOLO ids y cantidades (más dirección, fecha de entrega, método de pago, notas y el
// requestId de esa pantalla de pago): aquí el cuerpo se valida de forma ESTRICTA y cualquier otro campo (precios, totales,
// impuestos, cuenta...) lo rechaza con 400 en vez de reenviarlo. Los precios los calcula el servidor y la cuenta sale del JWT
// (cookie httpOnly) en homex-api. Sin sesión: 401 SIN llamar a mercasa-api. Mientras homex-api tenga el pedido apagado la
// respuesta es 503 { code: "ordering_disabled" } (o "ordering_not_available"), que la pantalla muestra como "no disponible".
// Espera hasta 60 s (solo este endpoint). Nunca se registran cuerpos ni datos del cliente.
export async function POST(request: Request) {
  const store = await cookies();
  if (!store.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const text = await request.text();
  if (text.length > MAX_ORDER_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande.", code: "invalid_request" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body inválido", code: "invalid_request" }, { status: 400 });
  }

  const body = sanitizeCreateOrderBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Pedido inválido.", code: "invalid_request" }, { status: 400 });
  }

  return proxyOrderCreate(body, "order-create");
}
