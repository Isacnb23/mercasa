"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, LogOut, Mail, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAddresses } from "@/lib/addresses-context";
import { useAuth } from "@/lib/auth-context";
import type { SavedAddress } from "@/lib/auth-types";
import type { AddressNotice } from "@/lib/addresses-edit";
import { REGISTRATION_ENABLED } from "@/lib/feature-flags";
import RegistrationFlow from "@/components/registration/RegistrationFlow";
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerShell } from "@/components/ui/Drawer";
import {
  BEIGE,
  BODY_BG,
  DANGER_BG,
  DANGER_TEXT,
  FIELD_CLASS,
  FOCUS_RING,
  INK,
  MUTED,
  PRIMARY_BUTTON,
  RULE,
  SECONDARY_BUTTON,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";
import AddressFlow from "./AddressFlow";
import OrdersPanel from "./OrdersPanel";
import SavedAddresses from "./SavedAddresses";

// Iniciales para el avatar: primera letra de las dos primeras palabras del nombre (o las
// dos primeras letras si es una sola); sin nombre, las del código de cliente.
function getInitials(name: string, fallback: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? fallback).slice(0, 2);
  return letters.toLocaleUpperCase();
}

export default function ProfileDrawer() {
  const t = useTranslations("Profile");
  const tRegistration = useTranslations("Registration");
  const { user, isLoading, isOpen, sessionExpired, closeProfile, login, logout } = useAuth();
  const { addresses, status: addressesStatus } = useAddresses();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showingOrders, setShowingOrders] = useState(false);
  // Editar una dirección: la que se edita, el aviso al volver a la lista y la dirección cuyo botón recibe el foco al volver.
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressNotice, setAddressNotice] = useState<AddressNotice | null>(null);
  const lastEdited = useRef<number | null>(null);
  // "Mis pedidos" solo se ofrece si el servidor no lo apagó (history_disabled). Se consulta una vez por cuenta al abrir el
  // panel con sesión; mientras no se sabe, la entrada no se muestra.
  const [historyProbe, setHistoryProbe] = useState<{ account: string; available: boolean } | null>(null);
  // Pie del registro: hermano del cuerpo con scroll, pegado al borde inferior del panel (el flujo pinta ahí su botón).
  const [registrationFooter, setRegistrationFooter] = useState<HTMLElement | null>(null);

  // Limpia el formulario cuando el drawer se cierra, para que la próxima
  // apertura (ya sea otro intento o tras cerrar sesión) no arrastre el
  // password ni un error viejo en pantalla. Se ajusta durante el render al
  // detectar el cambio de isOpen, en vez de en un efecto.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setPassword("");
      setError(null);
      setAddingAddress(false);
      setRegistering(false);
      setShowingOrders(false);
      setEditingAddress(null);
      setAddressNotice(null);
    }
  }

  const historyAvailable = user && historyProbe?.account === user.accountNum ? historyProbe.available : null;

  useEffect(() => {
    if (!user || !isOpen || historyAvailable !== null) return;
    const account = user.accountNum;
    let cancelled = false;

    fetch("/api/customer/orders?page=1&pageSize=1", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
        // Solo "history_disabled" oculta la entrada; una falla pasajera no (el panel mostrará el error con reintento).
        if (!cancelled) setHistoryProbe({ account, available: !(res.status === 503 && body?.code === "history_disabled") });
      })
      .catch(() => {
        if (!cancelled) setHistoryProbe({ account, available: true });
      });

    return () => {
      cancelled = true;
    };
  }, [user, isOpen, historyAvailable]);

  // Al volver del editor, el foco regresa al botón "Editar" de esa dirección (si aún existe).
  useEffect(() => {
    if (editingAddress !== null || lastEdited.current === null) return;
    const id = lastEdited.current;
    lastEdited.current = null;
    document.querySelector<HTMLElement>(`[data-address-edit="${id}"]`)?.focus();
  }, [editingAddress]);

  // El aviso es breve: se quita solo.
  useEffect(() => {
    if (addressNotice === null) return;
    const timer = setTimeout(() => setAddressNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [addressNotice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login({ userId, password });
    setSubmitting(false);

    if (!result.ok) {
      // Servicio caído (503/504): mensaje propio y traducido; las credenciales incorrectas (401)
      // siguen mostrando el texto que devuelve el servidor.
      setError(result.unavailable ? t("serviceUnavailable") : result.error);
      return;
    }
    setUserId("");
    setPassword("");
  };

  // El registro solo se muestra sin sesión; con sesión el panel es el Perfil de siempre.
  const showingRegistration = registering && !user && !isLoading;
  const showAddButton = !(addressesStatus === "ready" && addresses.length === 0);

  return (
    <DrawerShell isOpen={isOpen} onClose={closeProfile} label={showingRegistration ? tRegistration("panelTitle") : t("title")} name="profile">
      <DrawerHeader
        eyebrow={showingRegistration ? tRegistration("eyebrow") : t("eyebrow")}
        title={showingRegistration ? tRegistration("panelTitle") : user ? user.name || user.accountNum : t("title")}
        subtitle={user ? `${t("accountNumLabel")}: ${user.accountNum}` : undefined}
        closeLabel={t("close")}
        onClose={closeProfile}
        leading={
          user ? (
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-semibold"
              style={{ background: BEIGE, color: INK, boxShadow: `inset 0 0 0 1.5px ${RULE}` }}
              aria-hidden
            >
              {getInitials(user.name, user.accountNum)}
            </span>
          ) : undefined
        }
      />

      <DrawerBody>
        {isLoading ? (
          <p className="py-6 text-center text-[13.5px]" style={{ color: TEXT_MUTED }} role="status">
            {t("loadingSession")}
          </p>
        ) : user && showingOrders ? (
          <OrdersPanel onBack={() => setShowingOrders(false)} />
        ) : user && editingAddress ? (
          <AddressFlow
            editing={editingAddress}
            onClose={(result) => {
              setEditingAddress(null);
              if (result) setAddressNotice(result);
            }}
          />
        ) : user && addingAddress ? (
          <AddressFlow onClose={() => setAddingAddress(false)} />
        ) : user ? (
          <div className="flex flex-col gap-5">
            <div
              className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3"
              style={{ borderColor: RULE }}
            >
              <span
                className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase"
                style={{ color: TEXT_MUTED, letterSpacing: "0.1em" }}
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {t("emailLabel")}
              </span>
              <span
                className="truncate text-[13.5px] font-medium"
                style={{ color: user.email ? INK : TEXT_MUTED, fontStyle: user.email ? "normal" : "italic" }}
              >
                {user.email || t("noEmailRegistered")}
              </span>
            </div>

            {/* Mis pedidos: solo si el servidor no respondió history_disabled. */}
            {historyAvailable === true && (
              <button
                type="button"
                onClick={() => setShowingOrders(true)}
                className={SECONDARY_BUTTON}
                style={{ borderColor: RULE, color: INK }}
              >
                <ClipboardList className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {t("ordersCta")}
              </button>
            )}

            {addressNotice && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] font-medium leading-snug"
                style={{ background: addressNotice === "saved" ? "#E6F4EA" : BEIGE, color: addressNotice === "saved" ? "#1B6B3A" : INK }}
              >
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {addressNotice === "saved" ? t("addresses.editedNotice") : t("addresses.notFoundNotice")}
              </p>
            )}

            <SavedAddresses
              onAdd={() => {
                setAddressNotice(null);
                setAddingAddress(true);
              }}
              onEdit={(address) => {
                lastEdited.current = address.addressId;
                setAddressNotice(null);
                setEditingAddress(address);
              }}
            />

            {/* Con la lista vacía el botón de agregar va dentro del estado vacío. */}
            {showAddButton && (
              <button
                type="button"
                onClick={() => setAddingAddress(true)}
                className={SECONDARY_BUTTON}
                style={{ borderColor: RULE, color: INK }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {t("addAddressCta")}
              </button>
            )}
          </div>
        ) : registering ? (
          <RegistrationFlow onBackToLogin={() => setRegistering(false)} footerTarget={registrationFooter} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {sessionExpired && (
              <p
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] leading-snug"
                style={{ background: DANGER_BG, color: DANGER_TEXT }}
                role="status"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("sessionExpiredNotice")}
              </p>
            )}
            <p className="text-[13.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {t("loginIntro")}
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold" style={{ color: INK }}>
                {t("userIdLabel")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={t("userIdPlaceholder")}
                className={FIELD_CLASS}
                style={{ borderColor: RULE, color: INK }}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold" style={{ color: INK }}>
                {t("passwordLabel")}
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className={FIELD_CLASS}
                style={{ borderColor: RULE, color: INK }}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] font-medium leading-snug"
                style={{ background: DANGER_BG, color: DANGER_TEXT }}
              >
                <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`${PRIMARY_BUTTON} mt-1`}
              style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
            >
              {submitting ? t("submitCtaLoading") : t("submitCta")}
            </button>

            {/* Registro: solo con NEXT_PUBLIC_ENABLE_REGISTRATION=true (apagado por defecto). */}
            {REGISTRATION_ENABLED && (
              <button
                type="button"
                onClick={() => setRegistering(true)}
                className={SECONDARY_BUTTON}
                style={{ borderColor: RULE, color: INK }}
              >
                {t("createAccountCta")}
              </button>
            )}
          </form>
        )}
      </DrawerBody>

      {/* Pie del registro: mismo crema del cuerpo, borde fino y un degradado suave arriba (sin sombra dura ni franja
          blanca). Sin contenido (pasos 2 y 3) desaparece solo (empty:hidden). */}
      {showingRegistration && (
        <div
          ref={setRegistrationFooter}
          className="relative flex shrink-0 flex-col gap-2 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 empty:hidden before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-[#FBF9F5] before:to-transparent"
          style={{ background: BODY_BG, borderColor: RULE }}
        />
      )}

      {/* Cerrar sesión: acción secundaria y tenue en el pie, no un botón principal. */}
      {user && !isLoading && !addingAddress && !editingAddress && !showingOrders && (
        <DrawerFooter>
          <button
            type="button"
            onClick={() => {
              setAddingAddress(false);
              logout();
            }}
            className={`mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] ${FOCUS_RING}`}
            style={{ color: TEXT_MUTED }}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.9} style={{ color: MUTED }} aria-hidden />
            {t("logoutCta")}
          </button>
        </DrawerFooter>
      )}
    </DrawerShell>
  );
}
