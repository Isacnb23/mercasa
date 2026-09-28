"use client";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";

// Mismo lenguaje visual que CartButton.tsx (pill con borde/fondo navy
// translúcido) — el ícono cambia de color cuando hay sesión activa (mismo
// acento gold que ya usa el badge del carrito) para dar una señal de estado
// sin necesitar texto.
export default function ProfileButton() {
  const t = useTranslations("Profile");
  const { user, openProfile } = useAuth();

  return (
    <button
      type="button"
      onClick={openProfile}
      aria-label={user ? t("openAriaLoggedIn", { name: user.name }) : t("openAria")}
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:-translate-y-0.5"
      style={{ borderColor: "rgba(8,43,92,0.14)", background: "rgba(8,43,92,0.04)" }}
    >
      <User
        className="h-[18px] w-[18px] transition group-hover:scale-105"
        strokeWidth={2}
        style={{ color: user ? "#FFB800" : "#075FD8" }}
        aria-hidden
      />
      {user && (
        <span
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white"
          style={{ background: "#FFD21A" }}
          aria-hidden
        />
      )}
    </button>
  );
}
