"use client";

import { AlertCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CartChannel, CartItem } from "@/lib/cart-types";
import { formatColones } from "@/lib/checkout-format";
import { cartLineKey } from "@/lib/cart-logic";
import { unitLabel } from "@/lib/presentations";
import { useCatalogUnits } from "@/lib/hooks/useCatalogUnits";
import { groupFor, lineErrorsByItem, matchPreviewLines } from "@/lib/order-logic";
import type { OrderPreview } from "@/lib/order-types";
import { BEIGE, DANGER_BG, DANGER_TEXT, FOCUS_RING, INK, MUTED, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import ProductImage from "@/components/modals/product-catalog/ProductImage";

interface Props {
  // Líneas de UN grupo del carrito (todas del mismo canal).
  items: CartItem[];
  channel: CartChannel;
  // Respuesta del servidor (puede estar desactualizada mientras se recalcula). Null = sin precios todavía.
  preview: OrderPreview | null;
  // ¿Se esperan precios (sesión + dirección)? Con false no se muestran ni esqueletos de precio.
  expectPrices: boolean;
  onQuantity: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
  // unitId undefined = la presentación por defecto.
  onChangeUnit: (item: CartItem, unitId: string | undefined) => void;
}

// Líneas del carrito con precio unitario, cantidad y total de línea. TODO precio viene de `preview` (el
// servidor); si una línea aún no tiene precio vigente (recién agregada o cambiando la cantidad) se muestra un
// esqueleto, nunca un valor inventado. Los errores por línea ("No disponible", "Cantidad inválida"...) se
// muestran junto al producto, que se puede quitar.
export default function CartLines({ items, channel, preview, expectPrices, onQuantity, onRemove, onChangeUnit }: Props) {
  const t = useTranslations("Cart");
  const tOrder = useTranslations("Cart.order");
  const locale = useLocale();
  const group = preview ? groupFor(preview, channel) : null;
  const errorsByItem = preview ? lineErrorsByItem(preview, channel) : new Map<string, string[]>();
  // Cada línea del carrito (ítem + presentación) con su línea validada por el servidor, en SU grupo.
  const linesByKey = matchPreviewLines(items, group?.lines ?? []);
  // Presentaciones vendibles de los ítems de domicilio (solo con sesión y dirección): permiten cambiarlas. Las de
  // retiro (fmcm) todavía no se ofrecen para cambiar: se usa la presentación por defecto o la guardada.
  const { unitsFor } = useCatalogUnits(expectPrices && channel === "delivery" ? items.map((i) => i.id) : []);

  const errorLabel = (code: string): string | null => {
    switch (code) {
      case "item_unavailable":
        return tOrder("lineUnavailable");
      case "invalid_quantity":
        return tOrder("lineInvalidQuantity");
      case "item_not_found":
        return tOrder("lineNotFound");
      case "unit_not_available":
        return tOrder("lineUnitNotAvailable");
      case "price_not_available":
        return tOrder("linePriceNotAvailable");
      default:
        return null;
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const lineKey = cartLineKey(item.id, item.unitId, item.channel);
        const line = linesByKey.get(`${item.id.trim().toUpperCase()}|${(item.unitId ?? "").trim().toUpperCase()}`);
        const units = channel === "delivery" ? unitsFor(item.id) : undefined;
        const defaultUnit = units?.find((u) => u.isDefault);
        const currentUnit = item.unitId ?? defaultUnit?.unitId ?? line?.unitId ?? "";
        const unitName = currentUnit ? unitLabel(currentUnit, locale) : "";
        // El precio solo vale si el servidor lo calculó para ESTA cantidad.
        const priced = !!line && line.quantity === item.quantity && line.unitPrice > 0;
        const codes = errorsByItem.get(item.id.toLowerCase()) ?? [];
        const messages = codes.map(errorLabel).filter((m): m is string => !!m);
        // Sin existencia suficiente: cuánto SÍ se puede pedir de esta presentación (lo calcula el servidor).
        if (codes.includes("item_unavailable") && line?.maxAvailable != null) {
          messages.push(tOrder("lineMax", { max: line.maxAvailable }));
        }
        const name = line?.name || item.name;

        return (
          <li
            key={lineKey}
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
                {units && units.length > 1 ? (
                  // Presentación: se puede cambiar; el servidor recalcula precio y existencias.
                  <label className="mt-1.5 flex items-center gap-2 text-[12px] font-medium" style={{ color: TEXT_MUTED }}>
                    <span>{tOrder("unitLabel")}</span>
                    <select
                      value={currentUnit}
                      aria-label={tOrder("unitSelectAria", { name })}
                      onChange={(e) => {
                        const next = units.find((u) => u.unitId === e.target.value);
                        if (next) onChangeUnit(item, next.isDefault ? undefined : next.unitId);
                      }}
                      className={`min-h-[32px] rounded-full border bg-white px-3 py-1 text-[12.5px] font-semibold ${FOCUS_RING}`}
                      style={{ borderColor: RULE, color: INK }}
                    >
                      {units.map((u) => (
                        <option key={u.unitId} value={u.unitId}>
                          {unitLabel(u.unitId, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  expectPrices &&
                  unitName && (
                    <p className="mt-0.5 text-[12px] font-medium" style={{ color: TEXT_MUTED }}>
                      {tOrder("unitLabel")}: {unitName}
                    </p>
                  )
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
                onClick={() => onRemove(item)}
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
                  onClick={() => onQuantity(item, item.quantity - 1)}
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
                  onClick={() => onQuantity(item, item.quantity + 1)}
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
                  onClick={() => onRemove(item)}
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
