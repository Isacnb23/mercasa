"use client";

// Carrito de pedido (ver montar-carrito-en-base-al-catalogo.md): NO es
// e-commerce — MercasaVIP no trae precios y el sitio explícitamente declara
// que no procesa compras/pagos (messages/*.json, Legal.*). Es una lista de
// pedido: el cliente arma cantidades desde el catálogo y el "checkout" abre
// WhatsApp con el detalle ya redactado, mismo patrón que el resto del sitio
// (ContactSection/CustomerClassSection, ver buildWhatsappHref en utils.ts) —
// un vendedor cotiza y confirma disponibilidad desde ahí.
//
// Global (no solo dentro del modal de catálogo, ver decisión del pedido):
// vive en CartProvider montado en el layout raíz, así el ícono/badge del
// Header y el drawer están disponibles en cualquier sección del sitio.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProductSummary } from "./product-types";
import type { CartChannel, CartItem } from "./cart-types";
import { canAddToCart, defaultAddChannel } from "./catalog-channel";
import { hashAccount, onAccountStateCleared, reconcileCartOwner } from "./account-state";
import { useAuth } from "./auth-context";
import {
  addToCart,
  CART_STORAGE_KEY,
  changeLineUnit,
  loadPersistedCart,
  loadPersistedOwner,
  moveDeliveryToPickup as moveLinesToPickup,
  removeLine,
  serializeCart,
  setLineQuantity,
} from "./cart-logic";

interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // unitId: presentación elegida; omitirlo = la presentación por defecto (la del listado). channel: a qué grupo del
  // carrito va; omitirlo = domicilio si el producto lo tiene y, si no, retiro.
  addItem: (product: ProductSummary, quantity?: number, unitId?: string, channel?: CartChannel) => void;
  removeItem: (id: string, unitId?: string, channel?: CartChannel) => void;
  setQuantity: (id: string, quantity: number, unitId?: string, channel?: CartChannel) => void;
  // Cambia la presentación de una línea (si ya hay otra con la presentación destino, se suman).
  changeUnit: (id: string, fromUnitId: string | undefined, toUnitId: string | undefined, channel?: CartChannel) => void;
  // Pasa a retiro en tienda las líneas de domicilio que también se consiguen en tienda (zona que se coordina con un asesor).
  moveDeliveryToPickup: () => void;
  // Tienda de retiro elegida por el cliente (una sola para todo el grupo); null = sin elegir (se propone una).
  pickupSiteId: string | null;
  setPickupSite: (siteId: string | null) => void;
  // Fecha de retiro elegida ("yyyy-MM-dd"); null = sin elegir. Solo en memoria (no se guarda): las fechas ofrecidas cambian cada día.
  pickupDate: string | null;
  setPickupDate: (date: string | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const accountNum = user?.accountNum ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupSiteId, setPickupSiteId] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  // Hash de la cuenta dueña del carrito; null = de visitante (o guardado antes de que existiera el dueño).
  const [owner, setOwner] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Evita pisar localStorage con el array vacío inicial ANTES de que termine de leerse lo persistido (el primer render
  // en el cliente siempre arranca en []). Es estado (no ref) para que el guardado espere al render que ya trae los
  // datos leídos: con una ref el efecto de guardado corría en el mismo commit que la lectura, con `items` todavía en
  // [], y escribía el vacío encima del carrito guardado.
  const [hydrated, setHydrated] = useState(false);
  // La lectura ocurre una sola vez: con StrictMode (next dev) los efectos corren dos veces y la segunda lectura
  // encontraba lo que la primera pasada había guardado (el vacío). La ref sobrevive a esa doble ejecución.
  const hydrationStarted = useRef(false);

  useEffect(() => {
    if (hydrationStarted.current) return;
    hydrationStarted.current = true;
    try {
      // v2 si existe; si no, el carrito v1 (sin canal) se migra: todas sus líneas pasan a domicilio sin perderse. La
      // clave v1 no se borra (un carrito viejo nunca se pierde por esta migración).
      const stored = loadPersistedCart(window.localStorage);
      if (!stored) return;
      // Hidratar desde localStorage solo se puede hacer en el cliente tras el primer render (el servidor y el primer
      // render del cliente parten de []), por eso es un efecto: no hay otra fuente de estos datos. La regla
      // set-state-in-effect avisa aquí y no hay arreglo limpio: leer localStorage en el render o en el inicializador
      // de useState rompería la hidratación (el servidor no lo tiene), y useSyncExternalStore no sirve para un
      // estado que el usuario luego edita. Por eso el disable se queda, acotado a esta línea.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(stored.items);
      setPickupSiteId(stored.pickupSiteId);
      setOwner(loadPersistedOwner(window.localStorage));
    } catch {
      // localStorage no disponible (modo privado, etc.) — el carrito sigue
      // funcionando en memoria para esta sesión de pestaña.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializeCart(items, pickupSiteId, owner)));
    } catch {
      // idem arriba — no romper el carrito si falla el guardado.
    }
  }, [hydrated, items, pickupSiteId, owner]);

  // Al iniciar sesión (y al recargar con sesión) se compara el dueño del carrito con la cuenta: sin dueño se asigna, el mismo se
  // conserva, otro se vacía junto con su tienda de retiro. Sin sesión no se toca nada. Se espera a que la sesión esté resuelta y
  // el carrito leído; se aplica una vez por cuenta (reconciled) y no vuelve a vaciar lo que el cliente agregue después.
  const reconciled = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!accountNum) {
      reconciled.current = null;
      return;
    }
    if (reconciled.current === accountNum) return;
    reconciled.current = accountNum;
    const result = reconcileCartOwner(items, owner, hashAccount(accountNum));
    if (result.owner !== owner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwner(result.owner);
    }
    if (result.emptied) {
      setItems([]);
      setPickupSiteId(null);
      setPickupDate(null);
    }
  }, [hydrated, authLoading, accountNum, items, owner]);

  // Cierre de sesión o sesión expirada (clearAccountState): la tienda de retiro elegida es de la cuenta; las líneas se quedan.
  useEffect(
    () =>
      onAccountStateCleared(() => {
        setPickupSiteId(null);
        setPickupDate(null);
      }),
    [],
  );

  // No abre el drawer automáticamente (ver montar-carrito-en-base-al-
  // catalogo.md): agregar varios productos seguidos desde la grilla del
  // catálogo con el "+" rápido es el flujo esperado, y el drawer abriéndose
  // en cada click interrumpía ese flujo (su backdrop a pantalla completa se
  // comía el siguiente click, cerrándose en vez de dejar agregar el
  // próximo producto). El badge del ícono ya da la confirmación visual; el
  // botón "Agregar al carrito" del detalle de producto tiene su propia
  // confirmación inline ("¡Agregado!").
  const addItem = (product: ProductSummary, quantity = 1, unitId?: string, channel?: CartChannel) => {
    const target = channel ?? defaultAddChannel(product);
    // Solo se agrega al canal donde el producto se consigue (el servidor lo vuelve a validar).
    if (!canAddToCart(product, target)) return;
    setItems((current) => addToCart(current, product, quantity, unitId, target));
  };

  const removeItem = (id: string, unitId?: string, channel: CartChannel = "delivery") => {
    setItems((current) => removeLine(current, id, unitId, channel));
  };

  const setQuantity = (id: string, quantity: number, unitId?: string, channel: CartChannel = "delivery") => {
    setItems((current) => setLineQuantity(current, id, quantity, unitId, channel));
  };

  const changeUnit = (id: string, fromUnitId: string | undefined, toUnitId: string | undefined, channel: CartChannel = "delivery") => {
    setItems((current) => changeLineUnit(current, id, fromUnitId, toUnitId, channel));
  };

  const moveDeliveryToPickup = () => {
    setItems((current) => moveLinesToPickup(current));
  };

  const clear = () => {
    setItems([]);
    setPickupSiteId(null);
    setPickupDate(null);
  };

  const totalCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    totalCount,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem,
    setQuantity,
    changeUnit,
    moveDeliveryToPickup,
    pickupSiteId,
    setPickupSite: setPickupSiteId,
    pickupDate,
    setPickupDate,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
