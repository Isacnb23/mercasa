"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Minus, Plus, ShoppingCart, X, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
import { useCart } from "@/lib/cart-context";
import ProductImage from "./ProductImage";
import PriceTag from "./PriceTag";
import type { PriceView } from "@/lib/catalog-prices";
import { formatColones } from "@/lib/checkout-format";
import { displayProductName } from "@/lib/product-display";
import {
  approxBasePrice,
  equivalences,
  formatAmount,
  pickInitialUnit,
  shortEquivalence,
  sortUnits,
  unitLabel,
  unitName,
  unitTitle,
} from "@/lib/presentations";
import { useCatalogUnits } from "@/lib/hooks/useCatalogUnits";

// Feature simple (ver catalogo-detalle-producto.md): lightbox de un solo
// producto ENCIMA del catálogo (no reemplaza el flipbook, no navega a otra
// ruta) — se monta/desmonta por su cuenta desde ProductCatalogModal, sin
// tocar `currentPage` del libro, así cerrar vuelve exacto a la misma
// página. Fuera de alcance a propósito (ver el doc): sin prev/next entre
// productos, sin zoom interactivo, sin mostrar familia/sub-familia acá.

const INK = "#082B5C";
const MUTED = "#8493A5";
// Texto secundario legible (contraste AA sobre blanco); MUTED queda para etiquetas y detalles.
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const CHIP_BG = "#F4F6F9";

// Códigos de empaque tipo "12U/C", "24UNDS/CM", "6 UND/CAJA" — vienen
// embebidos en el propio nombre del producto (confirmado contra datos
// reales de MercasaVIP, ver scripts/diagnostics/escanear-abreviaturas-
// empaque.md histórico y el glosario ya cargado en el catálogo). Puede
// haber más de uno en el mismo nombre (ej. "COCA COLA DESECHABLE 6U/C
// 50C/T 2.5 L" trae empaque de caja Y de tarima), así que se recolectan
// todos, no solo el primero.
const PACKAGING_CODE_RE = /(\d{1,4})\s?([A-ZÁÉÍÓÚÑ]{1,6})\s*\/\s*([A-ZÁÉÍÓÚÑ]{1,6})\b/gi;

interface PackagingMatch {
  code: string;
  meaning?: string;
}

function findPackagingCodes(
  name: string,
  glossaryGroups: { entries: { abbr: string; meaning: string }[] }[]
): PackagingMatch[] {
  const flatGlossary = glossaryGroups.flatMap((group) => group.entries);
  const results: PackagingMatch[] = [];
  const seen = new Set<string>();

  for (const match of name.matchAll(PACKAGING_CODE_RE)) {
    const quantity = match[1];
    const shortCode = `${match[2].toUpperCase()}/${match[3].toUpperCase()}`;
    const displayCode = `${quantity}${shortCode}`;
    if (seen.has(displayCode)) continue;
    seen.add(displayCode);

    const glossaryEntry = flatGlossary.find((entry) =>
      entry.abbr.split("·").some((variant) => variant.trim().toUpperCase() === shortCode)
    );
    results.push({ code: displayCode, meaning: glossaryEntry?.meaning });
  }
  return results;
}

export default function ProductDetailModal({
  product,
  icon,
  glossaryGroups,
  price,
  onClose,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  glossaryGroups: { title: string; entries: { abbr: string; meaning: string }[] }[];
  price: PriceView;
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const packagingCodes = findPackagingCodes(product.name, glossaryGroups);
  // Solo para MOSTRAR: el nombre original (product.name) es el que va al carrito y al servidor.
  const displayName = displayProductName(product.name);

  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Presentaciones vendibles (solo con sesión). El modal abre con la MISMA presentación que muestra la tarjeta
  // (la unidad del listado). Si esa unidad no estuviera entre las presentaciones, no se ofrece selector y se
  // conserva el precio de la tarjeta: nunca se abre con otra presentación.
  const { unitsFor } = useCatalogUnits([product.id]);
  const rawUnits = unitsFor(product.id);
  const listingUnit = price.kind === "price" ? price.unit : null;
  const initialUnit = pickInitialUnit(rawUnits, listingUnit);
  const units = rawUnits && (initialUnit || !listingUnit) ? sortUnits(rawUnits) : null;
  const [chosenUnit, setChosenUnit] = useState<string | null>(null);
  const selected = units?.find((u) => u.unitId === chosenUnit) ?? initialUnit ?? null;
  const shownPrice: PriceView = selected ? { kind: "price", unitPrice: selected.unitPrice, unit: selected.unitId } : price;
  const quantityUnit = selected?.unitId ?? (price.kind === "price" ? price.unit : "");

  // Equivalencias reales (factores de AX) de la presentación elegida; solo informativas.
  const equivalenceLines = units && selected ? equivalences(units, selected.unitId) : [];
  const approx = selected ? approxBasePrice(selected) : null;
  // Respaldo (ítem sin presentaciones reales): lo que se pueda leer del nombre, rotulado como informativo.
  const showNameFallback = (!units || (units.length <= 1 && equivalenceLines.length === 0)) && (!!product.packSize || packagingCodes.length > 0);

  // Foco inicial en el botón de cerrar (Escape lo maneja ProductCatalogModal).
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleAddToCart = () => {
    // La presentación por defecto no se guarda: así una misma presentación nunca queda en dos líneas.
    addItem(product, quantity, selected && !selected.isDefault ? selected.unitId : undefined);
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const unitText = (unitId: string, count: number) => unitName(unitId, count, locale);

  return (
    <div
      // z-index por encima de `.catalog-backdrop`/`.catalog-panel` (z-index:
      // 100 en product-catalog-overlay.css) — con un z-[70] el detalle
      // quedaba montado en el DOM con opacidad correcta pero VISUALMENTE
      // detrás del catálogo (confirmado con captura real, no solo revisando
      // el código — esto ya había fallado antes con este mismo componente).
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(8,20,40,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("catalog.productDetailAriaLabel", { name: displayName })}
        className="pd-dialog relative rounded-[24px] bg-white shadow-[0_30px_80px_rgba(8,20,40,0.35)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t("catalog.close")}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
          style={{ boxShadow: "0 4px 12px rgba(8,20,40,0.18)" }}
        >
          <X className="h-4 w-4" strokeWidth={2} style={{ color: INK }} aria-hidden />
        </button>

        {/* Foto grande — misma fuente que las miniaturas (/api/product-images,
            tabla Arte + SharePoint), solo en tamaño "l". Caja de alto acotado
            (min(40dvh, 420px), ver .pd-media) para que no empuje el botón de
            agregar fuera de pantalla en laptops bajas; object-contain. */}
        <div className="pd-media flex items-center justify-center" style={{ background: CHIP_BG }}>
          <div className="absolute inset-0">
            <ProductImage
              itemId={product.id}
              name={displayName}
              familyIcon={icon}
              size="l"
              className="h-full w-full object-contain p-4"
              errorIconClassName="h-16 w-16"
              onStatusChange={setImageStatus}
            />
          </div>
          {imageStatus === "error" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
              <ImageOff className="h-4 w-4" strokeWidth={1.8} style={{ color: MUTED }} aria-hidden />
              <span className="text-[13px] font-semibold" style={{ color: MUTED }}>
                {t("catalog.productDetailPhotoNotAvailable")}
              </span>
            </div>
          )}
        </div>

        <div className="pd-main">
          {/* Zonas con aire: título, precio, presentación, equivalencias. Scroll interno si no entra; la barra de
              cantidad/agregar queda fuera de esta zona y SIEMPRE visible. */}
          <div className="pd-info flex flex-col gap-5 p-5 sm:p-6" data-lenis-prevent>
            {/* Título: la misma sans-serif de las tarjetas (no la serif de display), peso 600, interlineado
                cómodo y balanceado. Nombre normalizado solo para mostrar. */}
            <h2
              className="font-sans text-[clamp(17px,2.4dvh,20px)] font-semibold leading-[1.3]"
              style={{ color: INK, textWrap: "balance", overflowWrap: "anywhere" }}
            >
              {displayName}
            </h2>

            {(shownPrice.kind !== "hidden" || approx) && (
              <div className="flex flex-col gap-1.5">
                <PriceTag view={shownPrice} size="detail" />
                {approx && shownPrice.kind === "price" && (
                  <p className="text-[13px] font-medium" style={{ color: TEXT_SOFT }}>
                    {t("catalog.approxPerUnit", {
                      price: formatColones(approx.price, locale, 2),
                      unit: unitText(approx.unitId, 1),
                    })}
                  </p>
                )}
              </div>
            )}

            {units && units.length > 1 && selected && (
              <div>
                <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }} id="pd-unit-label">
                  {t("catalog.unitSelectorLabel")}
                </p>
                {/* Tarjetas compactas seleccionables (grupo de opciones): nombre, precio y equivalencia corta,
                    de menor a mayor factor, para comparar sin hacer clic. Flechas del teclado cambian la opción. */}
                <div
                  role="radiogroup"
                  aria-labelledby="pd-unit-label"
                  className="mt-2 grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))" }}
                  onKeyDown={(e) => {
                    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
                    e.preventDefault();
                    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
                    const index = units.findIndex((u) => u.unitId === selected.unitId);
                    const next = units[(index + step + units.length) % units.length];
                    setChosenUnit(next.unitId);
                    (e.currentTarget.querySelector(`[data-unit="${CSS.escape(next.unitId)}"]`) as HTMLElement | null)?.focus();
                  }}
                >
                  {units.map((u) => {
                    const active = u.unitId === selected.unitId;
                    const short = shortEquivalence(u);
                    return (
                      <button
                        key={u.unitId}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-unit={u.unitId}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setChosenUnit(u.unitId)}
                        className="flex min-h-[68px] flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left outline-none motion-safe:transition motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                        style={{
                          borderColor: active ? INK : RULE,
                          background: active ? "#EAF0F8" : "#FFFFFF",
                          boxShadow: active ? `inset 0 0 0 1px ${INK}` : "none",
                        }}
                      >
                        <span className="text-[14px] font-semibold leading-tight" style={{ color: INK }}>
                          {unitLabel(u.unitId, locale)}
                        </span>
                        <span className="text-[13px] font-bold leading-tight tabular-nums" style={{ color: INK }}>
                          {t("catalog.pricePlusTax", { price: formatColones(u.unitPrice, locale, 2) })}
                        </span>
                        {short && (
                          <span className="text-[12px] font-medium leading-tight" style={{ color: TEXT_SOFT }}>
                            {formatAmount(short.amount, locale)} {unitText(short.unitId, short.amount)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {equivalenceLines.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
                  {t("catalog.equivalenceTitle")}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5" aria-live="polite">
                  {equivalenceLines.map((eq) => (
                    <li key={`${eq.bigUnitId}>${eq.smallUnitId}`} className="text-[14.5px] font-medium" style={{ color: INK }}>
                      {t("catalog.equivalenceLine", {
                        big: unitTitle(eq.bigUnitId, 1, locale),
                        amount: formatAmount(eq.amount, locale),
                        small: unitTitle(eq.smallUnitId, eq.amount, locale),
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showNameFallback && (
              <div>
                <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
                  {t("catalog.productDetailPackagingLabel")}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>
                  {t("catalog.packagingFromName")}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {product.packSize && (
                    <p className="text-[14.5px] font-medium" style={{ color: INK }}>
                      {product.packSize}
                    </p>
                  )}
                  {packagingCodes.map(({ code, meaning }) => (
                    <p key={code} className="text-[14.5px] font-medium" style={{ color: INK }}>
                      <span className="font-semibold">{code}</span>
                      {meaning && <span style={{ color: MUTED }}> · {meaning}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Una sola presentación: solo la etiqueta, sin selector (el precio ya dice "por Unidad"). */}
          </div>

          {/* Agregar al carrito (ver montar-carrito-en-base-al-catalogo.md)
              — carrito de pedido sin precios, no e-commerce; el checkout
              real pasa por WhatsApp desde el drawer del carrito. Barra fija
              al pie del diálogo: SIEMPRE visible. La cantidad muestra la unidad elegida ("2 Cajas"). */}
          <div className="flex shrink-0 items-center gap-3 border-t bg-white px-5 py-3 sm:px-6" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={tCart("decreaseAria", { name: displayName })}
                className="flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
              <span className="min-w-[64px] text-center leading-tight" aria-live="polite">
                <span className="block text-[15px] font-semibold tabular-nums" style={{ color: INK }}>
                  {quantity}
                </span>
                {quantityUnit && (
                  <span className="block text-[11.5px] font-medium" style={{ color: TEXT_SOFT }}>
                    {unitText(quantityUnit, quantity)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(9999, q + 1))}
                aria-label={tCart("increaseAria", { name: displayName })}
                className="flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-corp-blue px-4 py-2.5 text-[14.5px] font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
              {justAdded ? tCart("addedConfirmation") : tCart("addToCartCta")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
