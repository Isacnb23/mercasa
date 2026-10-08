"use client";

import { AlertCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CartItem } from "@/lib/cart-types";
import { formatColones } from "@/lib/checkout-format";
import { lineErrorsByItem } from "@/lib/order-logic";
import type { OrderPreview } from "@/lib/order-types";
import { BEIGE, DANGER_BG, DANGER_TEXT, FOCUS_RING, INK, MUTED, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import ProductImage from "@/components/modals/product-catalog/ProductImage";

interface Props {
  items: CartItem[];
  // Respuesta del servidor (puede estar desactualizada mientras se recalcula). Null = sin precios todavía.
  preview: OrderPreview | null;
  // ¿Se esperan precios (sesión + dirección)? Con false no se muestran ni esqueletos de precio.
  expectPrices: boolean;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

// Líneas del carrito con precio unitario, cantidad y total de línea. TODO precio viene de `preview` (el
// servidor); si una línea aún no tiene precio vigente (recién agregada o cambiando la cantidad) se muestra un
// esqueleto, nunca un valor inventado. Los errores por línea ("No disponible", "Cantidad inválida"...) se
// muestran junto al producto, que se puede quitar.
export default function CartLines({ items, preview, expectPrices, onQuantity, onRemove }: Props) {
  const t = useTranslations("Cart");
  const tOrder = useTranslations("Cart.order");
  const locale = useLocale();
  const errorsByItem = preview ? lineErrorsByItem(preview) : new Map<string, string[]>();
  const linesById = new Map((preview?.lines ?? []).map((l) => [l.itemId.toLowerCase(), l]));

  const errorLabel = (code: string): string | null => {
    switch (code) {
      case "item_unavailable":
        return tOrder("lineUnavailable");
      case "invalid_quantity":
        return tOrder("lineInvalidQuantity");
      case "item_not_found":
        return tOrder("lineNotFound");
      default:
        return null;
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const line = linesById.get(item.id.toLowerCase());
        // El precio solo vale si el servidor lo calculó para ESTA cantidad.
        const priced = !!line && line.quantity === item.quantity && line.unitPrice > 0;
        const codes = errorsByItem.get(item.id.toLowerCase()) ?? [];
        const messages = codes.map(errorLabel).filter((m): m is string => !!m);
        const name = line?.name || item.name;

        return (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-2xl border bg-white p-3 sm:p-3.5"
            style={{ borderColor: messages.length > 0 ? "#F2B8B5" : RULE }}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-20 sm:w-20"
                style={{ background: BEIGE }}
              >
                <ProductImage itemId={item.id} name={name} size="s" className="h-full w-full object-contain p-2" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[14px] font-medium leading-snug" style={{ color: INK }}>
                  {name}
                </p>
                {item.packSize && (
                  <p className="mt-0.5 text-[12px] font-medium" style={{ color: TEXT_MUTED }}>
                    {item.packSize}
                  </p>
                )}
                {expectPrices && (
                  <div className="mt-1" aria-live="polite">
                    {priced && line ? (
                      <p className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
                        {tOrder("unitPrice", { price: formatColones(line.unitPrice, locale, 2) })}
                      </p>
                    ) : (
                      <span
                        role="status"
                        className="mt-1 block h-3 w-24 rounded-full motion-safe:animate-pulse"
                        style={{ background: BEIGE }}
                      >
                        <span className="sr-only">{tOrder("recalculating")}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={t("removeAria", { name })}
                className={`shrink-0 self-start rounded-full p-2 motion-safe:transition motion-safe:duration-150 hover:bg-red-50 hover:text-red-700 ${FOCUS_RING}`}
                style={{ color: MUTED }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Selector de cantidad como pastilla compacta. */}
              <div className="inline-flex items-center rounded-full p-0.5" style={{ background: BEIGE }}>
                <button
                  type="button"
                  onClick={() => onQuantity(item.id, item.quantity - 1)}
                  aria-label={t("decreaseAria", { name })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full motion-safe:transition motion-safe:duration-150 hover:bg-white ${FOCUS_RING}`}
                  style={{ color: INK }}
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                </button>
                <span className="min-w-[32px] text-center text-[14px] font-bold tabular-nums" style={{ color: INK }}>
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantity(item.id, item.quantity + 1)}
                  aria-label={t("increaseAria", { name })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full motion-safe:transition motion-safe:duration-150 hover:bg-white ${FOCUS_RING}`}
                  style={{ color: INK }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                </button>
              </div>

              {expectPrices && priced && line && (
                <p
                  className="font-display text-[17px] font-semibold tabular-nums"
                  style={{ color: INK }}
                  aria-label={tOrder("lineTotalAria", { amount: formatColones(line.lineTotal, locale, 2) })}
                >
                  {formatColones(line.lineTotal, locale, 2)}
                </p>
              )}
            </div>

            {messages.length > 0 && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: DANGER_BG, color: DANGER_TEXT }}
              >
                <p className="flex items-center gap-2 text-[13px] font-medium leading-snug">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  {messages.join(" · ")}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className={`shrink-0 rounded text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
                  style={{ color: DANGER_TEXT }}
                >
                  {tOrder("lineRemove")}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
