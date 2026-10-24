import { NextRequest } from "next/server";
import { proxyRegister } from "@/lib/registration-proxy";

// Registro de clientes, paso "verify". Ver lib/registration-proxy.ts (apagado sin NEXT_PUBLIC_ENABLE_REGISTRATION).
export async function POST(request: NextRequest) {
  return proxyRegister("verify", request);
}
