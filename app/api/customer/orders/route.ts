import { NextRequest } from "next/server";
import { parseListParams, parseOrderList } from "@/lib/orders";
import { proxyOrdersGet } from "@/lib/orders-proxy";

// "Mis pedidos" (historial del cliente, solo lectura). Solo se aceptan page y pageSize, acotados; la cuenta NO viaja
// desde el navegador (sale del JWT de la sesión en homex-api). Ver lib/orders-proxy.ts.
export async function GET(request: NextRequest) {
  const { page, pageSize } = parseListParams(request.nextUrl.searchParams);
  return proxyOrdersGet(`/api/customer/orders?page=${page}&pageSize=${pageSize}`, parseOrderList, "orders-list");
}
