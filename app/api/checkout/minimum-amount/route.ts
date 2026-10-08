import { proxyCustomerGet } from "@/lib/checkout-proxy";

// Monto mínimo de pedido del cliente logueado (solo lectura). El cliente sale del
// JWT en homex-api; acá no se acepta ningún parámetro.
export async function GET() {
  return proxyCustomerGet("/api/customer/minimum-amount", "minimum-amount");
}
