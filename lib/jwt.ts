import "server-only";
import type { AuthUser } from "./auth-types";

// Decodifica el payload de un JWT SIN verificar la firma. Es seguro acá
// porque el token llega server-to-server directo de mercasa-api (que a su
// vez ya lo validó contra homex-api); solo se usa para LEER los claims,
// nunca para autorizar nada por cuenta propia. NO decodificar en el cliente
// (por eso este archivo es server-only y el token nunca sale de las rutas
// de /app/api/auth/*).
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Claims reales del token que emite homex-api (JwtService.GenerateTokens usa
// System.Security.Claims.ClaimTypes, que serializan como las URIs completas
// de los esquemas xmlsoap/ws-2005, no las versiones cortas "nameid"/"name"/
// "email" — confirmado contra un token real, mismo patrón que ya usa
// homex-web para el mismo backend):
//   .../identity/claims/nameidentifier -> AccountNum
//   .../identity/claims/name           -> CustomerName
//   .../identity/claims/emailaddress   -> email
const CLAIM_ACCOUNT_NUM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const CLAIM_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const CLAIM_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

// AX (ARCustTable) usa placeholders tipo "Sin_Email" cuando el cliente no
// tiene el dato cargado — no es un email/nombre real, es texto interno que
// no debe llegar tal cual a la UI (ver prompt-claude-code-fix-labels-perfil.md).
// Se normaliza acá (server-only, antes de que el dato salga de esta capa) en
// vez de en cada componente que consuma AuthUser.
function stripAxPlaceholder(value: string): string {
  return /^sin_/i.test(value.trim()) ? "" : value;
}

export function getUserFromToken(token: string): AuthUser | null {
  const claims = decodeJwtPayload(token);
  if (!claims) return null;

  const accountNum = String(claims[CLAIM_ACCOUNT_NUM] ?? "");
  const name = stripAxPlaceholder(String(claims[CLAIM_NAME] ?? ""));
  const email = stripAxPlaceholder(String(claims[CLAIM_EMAIL] ?? ""));

  // Sin accountNum no hay usuario válido.
  if (!accountNum) return null;

  return { accountNum, name, email };
}

export function getTokenExpirationSeconds(token: string): number | null {
  const claims = decodeJwtPayload(token);
  const exp = claims?.exp;
  if (typeof exp !== "number") return null;

  const secondsLeft = Math.floor(exp - Date.now() / 1000);
  return secondsLeft > 0 ? secondsLeft : null;
}
