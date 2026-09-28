"use client";

// Sesión de "Perfil" (ver prompt-claude-code-diseno-perfil-mercasa-web.md):
// login contra el backend real (homex-api vía el proxy mercasa-api), JWT en
// cookie httpOnly seteada por /app/api/auth/login — este contexto nunca ve
// el token, solo el `user` ya derivado que devuelven las rutas de servidor.
// Global (no solo dentro de un modal), mismo patrón que CartProvider: vive
// en el layout raíz para que el ícono del Header y el drawer estén
// disponibles en cualquier sección del sitio.
import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser, LoginCredentials } from "./auth-types";

type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { user: AuthUser | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        // Sin red o la ruta falló: se trata como "no logueado" en vez de
        // trabar la UI esperando.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error ?? "No se pudo iniciar sesión." };
      }

      setUser(data.user as AuthUser);
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo iniciar sesión en este momento." };
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // El estado local ya se limpió; si la request falla la cookie
      // simplemente vence sola con su propio maxAge.
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isOpen,
    openProfile: () => setIsOpen(true),
    closeProfile: () => setIsOpen(false),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
