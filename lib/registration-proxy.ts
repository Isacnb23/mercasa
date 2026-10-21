import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyCaptcha } from "@/lib/captcha";
import { clientIp } from "@/lib/client-ip";
import {
  FORWARDED_STATUSES,
  pickAllowedResponse,
  sanitizeRegisterBody,
  type RegisterStep,
} from "@/lib/registration";

const MAX_BODY_BYTES = 8 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

const unavailable = (code = "service_unavailable") =>
  NextResponse.json({ code, message: "El servicio no está disponible en este momento." }, { status: 503, headers: NO_STORE });

// Reenvía un paso del registro a mercasa-api (que guarda la API key). Reglas:
//  - sin NEXT_PUBLIC_ENABLE_REGISTRATION=true la ruta no existe (404);
//  - solo se reenvían los campos conocidos; nada se registra en el log (ni cuerpos, ni cédulas, ni códigos);
//  - la contraseña va solo en el cuerpo del POST;
//  - de la respuesta solo pasan claves conocidas, y los estados desconocidos salen como 503.
export async function proxyRegister(step: RegisterStep, request: NextRequest): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ code: "validation_failed", message: "Solicitud demasiado grande." }, { status: 400, headers: NO_STORE });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ code: "validation_failed", message: "Solicitud inválida." }, { status: 400, headers: NO_STORE });
  }

  const ip = clientIp(request.headers);

  if (step === "start") {
    const captcha = await verifyCaptcha((raw as { captchaToken?: unknown } | null)?.captchaToken, ip);
    if (captcha === "failed") {
      return NextResponse.json({ code: "captcha_failed", message: "No pudimos verificar el captcha." }, { status: 400, headers: NO_STORE });
    }
    if (captcha === "unavailable") return unavailable("captcha_unavailable");
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;
  if (!apiBase || !apiKey) {
    console.error(`[register-${step}] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY`);
    return unavailable();
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-Api-Key": apiKey };
    if (ip) headers["X-Client-Ip"] = ip;

    const upstream = await fetch(`${apiBase}/api/register/${step}`, {
      method: "POST",
      headers,
      body: JSON.stringify(sanitizeRegisterBody(step, raw)),
      cache: "no-store",
      // Mayor que el timeout de mercasa-api para el registro (30 s).
      signal: AbortSignal.timeout(35_000),
    });

    if (!FORWARDED_STATUSES.includes(upstream.status)) {
      console.error(`[register-${step}] mercasa-api respondió ${upstream.status}`);
      return unavailable();
    }

    const body = pickAllowedResponse(await upstream.json().catch(() => null));
    const responseHeaders: Record<string, string> = { ...NO_STORE };
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After")?.trim();
      responseHeaders["Retry-After"] = retryAfter && /^\d+$/.test(retryAfter) ? retryAfter : "60";
    }

    return NextResponse.json(body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(`[register-${step}] No se pudo contactar a mercasa-api:`, error instanceof Error ? error.name : "error");
    return unavailable();
  }
}
