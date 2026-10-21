"use client";

// Sesión de "Perfil" (ver prompt-claude-code-diseno-perfil-mercasa-web.md):
// login contra el backend real (homex-api vía el proxy mercasa-api), JWT en
// cookie httpOnly seteada por /app/api/auth/login — este contexto nunca ve
// el token, solo el `user` ya derivado que devuelven las rutas de servidor.
// Global (no solo dentro de un modal), mismo patrón que CartProvider: vive
// en el layout raíz para que el ícono del Header y el drawer estén
// disponibles en cualquier sección del sitio.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthUser, LoginCredentials } from "./auth-types";
import { isServiceUnavailable } from "./login-errors";
import { installSessionExpiryGuard } from "./session-client";

// `unavailable` = el servicio de ingreso no respondió (503/504): NO son credenciales malas.
type LoginResult = { ok: true } | { ok: false; error: string; unavailable?: boolean };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isOpen: boolean;
  // La sesión se perdió sin que la persona la cerrara (refresh vencido o revocado): el perfil se abre con el aviso.
  sessionExpired: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Pregunta al servidor por la sesión. Si el JWT venció pero hay refresh, la ruta lo renueva en silencio. null = no se pudo saber
// (503 con la renovación caída ahora mismo, sin red): quien llama conserva el estado que tenía.
async function fetchSession(): Promise<{ user: AuthUser | null; expired: boolean } | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser | null; expired?: boolean };
    return { user: data.user ?? null, expired: Boolean(data.expired) };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Último usuario conocido, para los avisos que llegan fuera del ciclo de render (fetch, visibilitychange).
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    fetchSession()
      .then((session) => {
        if (cancelled || !session) return;
        setUser(session.user);
        if (session.expired) setSessionExpired(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Al volver a la pestaña (después de minutos) se revisa la sesión: así, si ya no sirve, la pantalla lo refleja sin esperar a
  // que la persona toque algo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !userRef.current) return;
      void fetchSession().then((session) => {
        if (!session) return;
        setUser(session.user);
        if (session.expired) setSessionExpired(true);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Cualquier /api/ que responda 401 con sesión iniciada = la sesión no se pudo recuperar (el servidor ya intentó renovar).
  // Se limpia la sesión, se conserva el carrito (vive en localStorage, no depende de la sesión) y se abre el perfil con el aviso.
  useEffect(() => {
    return installSessionExpiryGuard(window, {
      baseHref: window.location.href,
      isLoggedIn: () => userRef.current !== null,
      onExpired: () => {
        setUser(null);
        setSessionExpired(true);
        setIsOpen(true);
        // Mejor esfuerzo: borra las cookies que pudieran quedar.
        void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      },
    });
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
        return {
          ok: false,
          error: data.error ?? "No se pudo iniciar sesión.",
          unavailable: isServiceUnavailable(res.status, data),
        };
      }

      setUser(data.user as AuthUser);
      setSessionExpired(false);
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo iniciar sesión en este momento." };
    }
  };

  const logout = async () => {
    setUser(null);
    setSessionExpired(false);
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
    sessionExpired,
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
