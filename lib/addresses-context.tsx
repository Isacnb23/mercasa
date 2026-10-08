"use client";

// Direcciones guardadas del cliente logueado (GET /api/addresses) y dirección
// activa. Vive junto a AuthProvider: carga al haber sesión, se limpia al cerrarla
// y expone refreshAddresses() para recargar tras guardar una dirección nueva.
//
// Privacidad: las direcciones solo viven en memoria. Del lado del navegador lo
// único que se persiste es el addressId (número) de la dirección activa, en
// sessionStorage y con try/catch; la app funciona igual si no está disponible.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import type { SavedAddress } from "./auth-types";

export type AddressesStatus = "idle" | "loading" | "ready" | "error";

const ACTIVE_ADDRESS_KEY = "mercasa.activeAddressId";

function readStoredId(): number | null {
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_ADDRESS_KEY);
    if (raw === null) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) ? id : null;
  } catch {
    return null;
  }
}

function writeStoredId(id: number | null) {
  try {
    if (id === null) window.sessionStorage.removeItem(ACTIVE_ADDRESS_KEY);
    else window.sessionStorage.setItem(ACTIVE_ADDRESS_KEY, String(id));
  } catch {
    // sessionStorage no disponible (modo privado, política del navegador): la
    // dirección activa solo dura mientras el contexto esté en memoria.
  }
}

// Por defecto la principal; si no hay principal, la primera. Si el id elegido
// ya no existe en la lista, vuelve a ese valor por defecto.
export function pickActiveAddress(addresses: SavedAddress[], selectedId: number | null): SavedAddress | null {
  if (addresses.length === 0) return null;
  return (
    addresses.find((a) => a.addressId === selectedId) ??
    addresses.find((a) => a.isPrimary) ??
    addresses[0]
  );
}

async function loadAddresses(): Promise<SavedAddress[]> {
  const res = await fetch("/api/addresses", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("invalid-response");
  return data as SavedAddress[];
}

interface AddressesState {
  accountNum: string | null;
  status: AddressesStatus;
  addresses: SavedAddress[];
  selectedId: number | null;
}

interface AddressesContextValue {
  addresses: SavedAddress[];
  status: AddressesStatus;
  refreshAddresses: () => Promise<void>;
  activeAddress: SavedAddress | null;
  setActiveAddressId: (addressId: number) => void;
}

const AddressesContext = createContext<AddressesContextValue | null>(null);

export function AddressesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const accountNum = user?.accountNum ?? null;

  const [state, setState] = useState<AddressesState>({
    accountNum: null,
    status: "idle",
    addresses: [],
    selectedId: null,
  });
  const requestRef = useRef(0);

  // Cambió la sesión (login, logout u otro cliente): se descarta todo lo del
  // cliente anterior en el mismo render, sin pasar por un efecto.
  if (state.accountNum !== accountNum) {
    setState({
      accountNum,
      status: accountNum ? "loading" : "idle",
      addresses: [],
      selectedId: null,
    });
  }

  const applyLoaded = useCallback((forAccount: string, addresses: SavedAddress[]) => {
    const stored = readStoredId();
    const selectedId = addresses.some((a) => a.addressId === stored) ? stored : null;
    if (stored !== null && selectedId === null) writeStoredId(null);
    setState((s) => (s.accountNum === forAccount ? { ...s, status: "ready", addresses, selectedId } : s));
  }, []);

  const applyFailed = useCallback((forAccount: string) => {
    setState((s) => (s.accountNum === forAccount ? { ...s, status: "error" } : s));
  }, []);

  // Carga al haber sesión. Cada carga toma un número de pedido: solo la última
  // aplica su resultado (el cleanup cancela la que esté en vuelo).
  useEffect(() => {
    if (!accountNum) {
      // Solo se borra el id guardado con la sesión ya resuelta (al recargar, user
      // es null un instante mientras se consulta /api/auth/session).
      if (!authLoading) writeStoredId(null);
      return;
    }
    let cancelled = false;
    const request = ++requestRef.current;
    loadAddresses()
      .then((addresses) => {
        if (!cancelled && request === requestRef.current) applyLoaded(accountNum, addresses);
      })
      .catch(() => {
        if (!cancelled && request === requestRef.current) applyFailed(accountNum);
      });
    return () => {
      cancelled = true;
    };
  }, [accountNum, authLoading, applyLoaded, applyFailed]);

  const refreshAddresses = useCallback(async () => {
    if (!accountNum) return;
    // Con la lista ya cargada se refresca en silencio (sin volver a esqueletos).
    setState((s) => (s.status === "ready" ? s : { ...s, status: "loading" }));
    const request = ++requestRef.current;
    try {
      const addresses = await loadAddresses();
      if (request === requestRef.current) applyLoaded(accountNum, addresses);
    } catch {
      if (request === requestRef.current) applyFailed(accountNum);
    }
  }, [accountNum, applyLoaded, applyFailed]);

  const knownAddresses = state.addresses;
  const setActiveAddressId = useCallback(
    (addressId: number) => {
      if (!knownAddresses.some((a) => a.addressId === addressId)) return;
      writeStoredId(addressId);
      setState((s) => ({ ...s, selectedId: addressId }));
    },
    [knownAddresses]
  );

  const value = useMemo<AddressesContextValue>(
    () => ({
      addresses: state.addresses,
      status: state.status,
      refreshAddresses,
      activeAddress: pickActiveAddress(state.addresses, state.selectedId),
      setActiveAddressId,
    }),
    [state, refreshAddresses, setActiveAddressId]
  );

  return <AddressesContext.Provider value={value}>{children}</AddressesContext.Provider>;
}

export function useAddresses() {
  const ctx = useContext(AddressesContext);
  if (!ctx) throw new Error("useAddresses debe usarse dentro de <AddressesProvider>");
  return ctx;
}

// Dirección activa (la que más adelante usarán precios, promociones y pedido).
// `address` es null sin sesión, mientras carga o si el cliente no tiene direcciones.
export function useActiveAddress() {
  const { activeAddress, setActiveAddressId } = useAddresses();
  return { address: activeAddress, addressId: activeAddress?.addressId ?? null, setActiveAddressId };
}
