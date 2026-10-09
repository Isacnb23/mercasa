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
import type { CartItem } from "./cart-types";
import { addToCart, changeLineUnit, parseStoredCart, removeLine, setLineQuantity } from "./cart-logic";

const STORAGE_KEY = "mercasa-cart-v1";

interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // unitId: presentación elegida; omitirlo = la presentación por defecto (la del listado).
  addItem: (product: ProductSummary, quantity?: number, unitId?: string) => void;
  removeItem: (id: string, unitId?: string) => void;
  setQuantity: (id: string, quantity: number, unitId?: string) => void;
  // Cambia la presentación de una línea (si ya hay otra con la presentación destino, se suman).
  changeUnit: (id: string, fromUnitId: string | undefined, toUnitId: string | undefined) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Evita pisar localStorage con el array vacío inicial ANTES de que
  // termine de leerse lo persistido (el primer render en el cliente siempre
  // arranca en []) — sin esto, recargar la página borraba el carrito
  // guardado en vez de restaurarlo.
  const hasHydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(parseStoredCart(JSON.parse(raw)));
    } catch {
      // localStorage no disponible (modo privado, etc.) — el carrito sigue
      // funcionando en memoria para esta sesión de pestaña.
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // idem arriba — no romper el carrito si falla el guardado.
    }
  }, [items]);

  // No abre el drawer automáticamente (ver montar-carrito-en-base-al-
  // catalogo.md): agregar varios productos seguidos desde la grilla del
  // catálogo con el "+" rápido es el flujo esperado, y el drawer abriéndose
  // en cada click interrumpía ese flujo (su backdrop a pantalla completa se
  // comía el siguiente click, cerrándose en vez de dejar agregar el
  // próximo producto). El badge del ícono ya da la confirmación visual; el
  // botón "Agregar al carrito" del detalle de producto tiene su propia
  // confirmación inline ("¡Agregado!").
  const addItem = (product: ProductSummary, quantity = 1, unitId?: string) => {
    setItems((current) => addToCart(current, product, quantity, unitId));
  };

  const removeItem = (id: string, unitId?: string) => {
    setItems((current) => removeLine(current, id, unitId));
  };

  const setQuantity = (id: string, quantity: number, unitId?: string) => {
    setItems((current) => setLineQuantity(current, id, quantity, unitId));
  };

  const changeUnit = (id: string, fromUnitId: string | undefined, toUnitId: string | undefined) => {
    setItems((current) => changeLineUnit(current, id, fromUnitId, toUnitId));
  };

  const clear = () => setItems([]);

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
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
