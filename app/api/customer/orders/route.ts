import { NextRequest, NextResponse } from "next/server";
import { ORDERING_ENABLED } from "@/lib/feature-flags";
import { parseListParams, parseOrderList } from "@/lib/orders";
import { proxyOrdersGet } from "@/lib/orders-proxy";

// "Mis pedidos" (historial del cliente, solo lectura). Solo se aceptan page y pageSize, acotados; la cuenta NO viaja
// desde el navegador (sale del JWT de la sesión en homex-api). Ver lib/orders-proxy.ts.
export async function GET(request: NextRequest) {
  // Con pedidos apagados (NEXT_PUBLIC_ENABLE_ORDERING) la ruta no existe: 404 sin llamar a mercasa-api.
  if (!ORDERING_ENABLED) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const { page, pageSize } = parseListParams(request.nextUrl.searchParams);
  return proxyOrdersGet(`/api/customer/orders?page=${page}&pageSize=${pageSize}`, parseOrderList, "orders-list");
}
