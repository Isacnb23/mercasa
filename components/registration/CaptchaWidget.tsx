"use client";

import { useEffect, useRef } from "react";
import { DEV_DISABLED_TOKEN } from "@/lib/captcha-config";

// Captcha del registro. Proveedor por NEXT_PUBLIC_CAPTCHA_PROVIDER ("turnstile"); sin definir queda
// DESHABILITADO (solo desarrollo: el servidor lo rechaza en producción, ver lib/captcha-config.ts) y entrega un
// token fijo sin pintar nada. El token se verifica siempre en el servidor.
export const CAPTCHA_PROVIDER = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER;
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("captcha")), { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export default function CaptchaWidget({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  // Cambiarlo reinicia el captcha (un token sirve una sola vez).
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  const useTurnstile = CAPTCHA_PROVIDER === "turnstile" && Boolean(SITE_KEY);

  useEffect(() => {
    if (!useTurnstile) {
      callback.current(DEV_DISABLED_TOKEN);
      return;
    }

    let cancelled = false;
    callback.current(null);
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [useTurnstile, resetKey]);

  if (!useTurnstile) return null;
  return <div ref={container} data-testid="captcha" />;
}
