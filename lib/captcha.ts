import "server-only";
import { DEV_DISABLED_TOKEN, resolveCaptchaMode } from "@/lib/captcha-config";

export type CaptchaResult = "ok" | "failed" | "unavailable";

// Verifica el token del captcha en el servidor (nunca en el navegador). Ver lib/captcha-config.ts.
export async function verifyCaptcha(token: unknown, ip?: string): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const mode = resolveCaptchaMode(process.env.CAPTCHA_PROVIDER, process.env.NODE_ENV, Boolean(secret));

  if (mode === "unavailable") return "unavailable";
  if (mode === "disabled-dev") return token === DEV_DISABLED_TOKEN ? "ok" : "failed";

  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return "failed";

  try {
    const form = new URLSearchParams({ secret: secret ?? "", response: token });
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? "ok" : "failed";
  } catch {
    return "unavailable";
  }
}
