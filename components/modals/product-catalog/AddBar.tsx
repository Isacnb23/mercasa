"use client";

import { Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PurchaseChannel } from "@/lib/purchase";

const INK = "#082B5C";
const RULE = "#E2E8F0";
const TEXT_SOFT = "#5C6B7D";

interface Props {
  // Nombre del producto (para los textos accesibles de cantidad).
  title: string;
  quantity: number;
  // Tope que permite la existencia cuando se puede saber (sin mostrarlo); 9999 si no hay uno conocido; 0 sin existencia.
  max: number;
  // "Cajas", "Unidades"... de la presentación elegida (ya con plural).
  unitText: string;
  onQuantity: (quantity: number) => void;
  channel: PurchaseChannel | null;
  // Nombre de la tienda elegida (retiro).
  siteName: string | null;
  // ¿Se puede agregar? (canal con existencia y, en retiro, tienda elegida).
  enabled: boolean;
  // Retiro sin tienda elegida: se avisa debajo del botón.
  needsStore: boolean;
  justAdded: boolean;
  onAdd: () => void;
}

// Paso 3 (barra fija al pie, siempre visible): cantidad y UN solo botón. A domicilio "Agregar a domicilio"; en retiro "Agregar a retiro en
// <tienda>". La cantidad no pasa del máximo que se puede saber; el tope no se muestra como número, solo un aviso al llegar a él.
export default function AddBar({ title, quantity, max, unitText, onQuantity, channel, siteName, enabled, needsStore, justAdded, onAdd }: Props) {
  const tCart = useTranslations("Cart");
  const atMax = max >= 1 && max < 9999 && quantity >= max;
  const label = justAdded
    ? tCart("addedConfirmation")
    : channel === "pickup"
      ? siteName
        ? tCart("addToPickupAt", { store: siteName })
        : tCart("addToPickupCta")
      : channel === "delivery"
        ? tCart("addToDeliveryCta")
        : tCart("addToCartCta");

  const stepper = "flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t bg-white px-5 py-3 sm:px-6" style={{ borderColor: RULE }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label={tCart("decreaseAria", { name: title })}
            className={stepper}
            style={{ borderColor: RULE, color: INK }}
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          </button>
          <span className="min-w-[64px] text-center leading-tight" aria-live="polite">
            <span className="block text-[15px] font-semibold tabular-nums" style={{ color: INK }}>
              {quantity}
            </span>
            <span className="block min-h-[16px] text-[11.5px] font-medium leading-4" style={{ color: TEXT_SOFT }}>
              {unitText || " "}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onQuantity(Math.min(max, quantity + 1))}
            disabled={quantity >= max}
            aria-label={tCart("increaseAria", { name: title })}
            className={stepper}
            style={{ borderColor: RULE, color: INK }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={!enabled}
          className="flex min-h-[46px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-corp-blue px-4 py-2.5 text-center text-[14.5px] font-semibold leading-tight text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {channel === "pickup" ? (
            <Store className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
          <span className="min-w-0">{label}</span>
        </button>
      </div>

      {(needsStore || atMax) && (
        <p className="text-[12px] leading-snug" style={{ color: TEXT_SOFT }} aria-live="polite">
          {needsStore ? tCart("chooseStoreHint") : tCart("quantityAtMax")}
        </p>
      )}
    </div>
  );
}
