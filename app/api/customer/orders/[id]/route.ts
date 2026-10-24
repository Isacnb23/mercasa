import { NextRequest, NextResponse } from "next/server";
import { isValidOrderId, parseOrderDetail } from "@/lib/orders";
import { proxyOrdersGet } from "@/lib/orders-proxy";

// Detalle de UN pedido del cliente con sesión. El id que manda el navegador NO es verdad: aquí solo se valida el formato y
// se reenvía; homex-api comprueba que el pedido sea de la cuenta del JWT (404 si no, igual que si no existe).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidOrderId(id)) {
    return NextResponse.json({ code: "validation_failed", message: "Número de pedido inválido." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }

  const channel = request.nextUrl.searchParams.get("channel");
  const query = channel === "delivery" || channel === "pickup" ? `?channel=${channel}` : "";
  return proxyOrdersGet(`/api/customer/orders/${encodeURIComponent(id)}${query}`, parseOrderDetail, "orders-detail");
}
