// Decisión pura del captcha del registro (sin React ni Next, probable con el test runner de Node).
//
// CAPTCHA_PROVIDER (servidor) y NEXT_PUBLIC_CAPTCHA_PROVIDER (navegador): "turnstile" (Cloudflare Turnstile) o,
// sin definir / "none", captcha DESHABILITADO. Deshabilitado solo se acepta fuera de producción: en producción sin
// proveedor el registro falla cerrado (captcha_unavailable) en vez de quedar abierto a bots.
// Proveedor definitivo: pendiente de decisión (Luis/Herson); no había uno en el proyecto (recruitment no usa captcha).

export type CaptchaMode = "turnstile" | "disabled-dev" | "unavailable";

export const DEV_DISABLED_TOKEN = "dev-disabled";

export function resolveCaptchaMode(provider: string | undefined, nodeEnv: string | undefined, hasSecret: boolean): CaptchaMode {
  if (provider === "turnstile") return hasSecret ? "turnstile" : "unavailable";
  return nodeEnv === "production" ? "unavailable" : "disabled-dev";
}
