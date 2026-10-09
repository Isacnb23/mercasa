import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { proxyCustomerPost } from "@/lib/checkout-proxy";
import { sanitizeCatalogPricesBody } from "@/lib/catalog-prices";

// Precios del catálogo con sesión. Del navegador se acepta SOLO `itemIds` (1 a 100, sin repetidos): la
// lista de precios sale del JWT en homex-api, nunca de un valor del cliente. Sin sesión: 401 SIN llamar a
// mercasa-api. Respuesta privada y sin caché; no se guarda nada.
export async function POST(request: Request) {
  const store = await cookies();
  if (!store.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }

  const body = sanitizeCatalogPricesBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }

  const response = await proxyCustomerPost("/api/customer/catalog/prices", { itemIds: body.itemIds }, "catalog-prices");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
