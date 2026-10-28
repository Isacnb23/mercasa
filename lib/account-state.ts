// Estado del navegador que depende de la cuenta (sin React; se prueba con `npm test`).
//
// - hashAccount: identificador de la cuenta para anotar a quién pertenece el carrito. Es un hash del código de cliente
//   (accountNum del JWT); nunca la cédula ni el código en claro. SHA-256 síncrono propio: crypto.subtle solo existe en
//   contextos seguros y es asíncrono.
// - reconcileCartOwner: qué pasa con el carrito al iniciar sesión (mismo dueño, otro dueño o sin dueño).
// - clearAccountState: ÚNICA función de "limpiar estado de cuenta" (cierre de sesión y sesión expirada). No toca las líneas
//   del carrito. Borra lo guardado en el navegador y avisa a los componentes que guardan estado en memoria.
import type { CartItem } from "./cart-types";

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
  0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
  0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
  0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Hex(text: string): string {
  const data = new TextEncoder().encode(text);
  const bitLength = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  return h.map((n) => n.toString(16).padStart(8, "0")).join("");
}

// Prefijo de dominio: el hash del carrito no coincide con ningún otro hash del código de cliente.
export const hashAccount = (accountNum: string): string => sha256Hex(`mercasa-cart-owner|${accountNum.trim().toUpperCase()}`);

export const isOwnerHash = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

export interface CartOwnership {
  items: CartItem[];
  // Hash de la cuenta dueña; null = carrito de visitante.
  owner: string | null;
  // true si el carrito se vació porque pertenecía a otra cuenta (quien llama también borra la tienda de retiro).
  emptied: boolean;
}

// Al iniciar sesión (accountHash = hash de la cuenta que entra):
//   sin dueño (visitante)  -> se asigna a la cuenta que entra y se conserva;
//   mismo dueño            -> se conserva;
//   otro dueño             -> se vacía y pasa a ser de la cuenta que entra.
// Sin sesión (accountHash null) no cambia nada.
export function reconcileCartOwner(items: CartItem[], owner: string | null, accountHash: string | null): CartOwnership {
  if (accountHash === null) return { items, owner, emptied: false };
  if (owner === null || owner === accountHash) return { items, owner: accountHash, emptied: false };
  return { items: [], owner: accountHash, emptied: true };
}

// Lo único de la cuenta que se guarda en el navegador fuera del carrito: la dirección activa (sessionStorage).
export const ACCOUNT_STORAGE_KEYS = ["mercasa.activeAddressId"] as const;

export const ACCOUNT_STATE_CLEARED_EVENT = "mercasa:account-state-cleared";

type StorageLike = Pick<Storage, "removeItem">;
type EventTargetLike = Pick<EventTarget, "dispatchEvent">;

// Limpia todo lo que depende de la cuenta MENOS las líneas del carrito: dirección activa guardada y, vía el evento, la tienda de
// retiro elegida y los borradores del checkout. Los precios y la vista previa viven en memoria por cuenta y se vacían solos al
// quedar sin sesión. Llamar siempre desde el cierre de sesión y desde la sesión expirada.
export function clearAccountState(
  host: { sessionStorage?: StorageLike; localStorage?: StorageLike } & Partial<EventTargetLike> = typeof window === "undefined" ? {} : window,
): void {
  for (const key of ACCOUNT_STORAGE_KEYS) {
    try {
      host.sessionStorage?.removeItem(key);
    } catch {
      // almacenamiento no disponible: lo guardado en memoria se limpia igual con el evento.
    }
  }
  try {
    host.dispatchEvent?.(new Event(ACCOUNT_STATE_CLEARED_EVENT));
  } catch {
    // sin Event/dispatchEvent (entorno sin ventana): nada que avisar.
  }
}

// Suscripción al aviso de limpieza; devuelve la función para darse de baja.
export function onAccountStateCleared(listener: () => void, target: Pick<EventTarget, "addEventListener" | "removeEventListener"> = window): () => void {
  target.addEventListener(ACCOUNT_STATE_CLEARED_EVENT, listener);
  return () => target.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT, listener);
}
