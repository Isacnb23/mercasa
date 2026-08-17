"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/* Toggle ES/EN discreto: dos letras, el idioma activo resaltado en azul de
   marca. Navega al mismo path en el otro locale (acá siempre "/", pero el
   patrón sirve igual si el sitio suma más rutas). */
export default function LocaleSwitcher({ variant = "header" }: { variant?: "header" | "footer" }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (nextLocale: string) => {
    if (nextLocale === locale || isPending) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  const dim = variant === "header" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.45)";

  return (
    <div
      role="group"
      aria-label={t("ariaLabel")}
      className={cn(
        "flex items-center gap-[2px] rounded-full border px-1 py-1 text-[11px] font-bold uppercase tracking-wide transition",
        isPending && "opacity-60"
      )}
      style={{
        borderColor: "rgba(74,141,255,0.35)",
        background: "rgba(47,128,237,0.08)",
      }}
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            disabled={isPending}
            onClick={() => switchTo(loc)}
            aria-pressed={active}
            className="rounded-full px-2 py-[3px] transition"
            style={{
              color: active ? "#ffffff" : dim,
              background: active ? "linear-gradient(135deg, #2F80ED, #4A8DFF)" : "transparent",
            }}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
