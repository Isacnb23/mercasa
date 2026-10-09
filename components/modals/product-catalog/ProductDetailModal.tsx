"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Minus, Plus, ShoppingCart, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
import { useCart } from "@/lib/cart-context";
import ProductImage from "./ProductImage";

// Feature simple (ver catalogo-detalle-producto.md): lightbox de un solo
// producto ENCIMA del catálogo (no reemplaza el flipbook, no navega a otra
// ruta) — se monta/desmonta por su cuenta desde ProductCatalogModal, sin
// tocar `currentPage` del libro, así cerrar vuelve exacto a la misma
// página. Fuera de alcance a propósito (ver el doc): sin prev/next entre
// productos, sin zoom interactivo, sin mostrar familia/sub-familia acá.

const INK = "#082B5C";
const MUTED = "#8493A5";
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
  onClose,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  glossaryGroups: { title: string; entries: { abbr: string; meaning: string }[] }[];
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  const tCart = useTranslations("Cart");
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const packagingCodes = findPackagingCodes(product.name, glossaryGroups);

  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Foco inicial en el botón de cerrar (Escape lo maneja ProductCatalogModal).
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleAddToCart = () => {
    addItem(product, quantity);
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1800);
  };

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
        aria-label={t("catalog.productDetailAriaLabel", { name: product.name })}
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
              name={product.name}
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
        {/* Nombre completo (sin truncar, ver doc) + empaque. Scroll interno
            si no entra; la barra de cantidad/agregar queda fuera de esta zona. */}
        <div className="pd-info p-5 sm:p-6" data-lenis-prevent>
          <p className="font-display text-[clamp(16px,2.2dvh,18px)] font-semibold leading-snug" style={{ color: INK }}>
            {product.name}
          </p>

          {(product.packSize || packagingCodes.length > 0) && (
            <div className="mt-4 border-t pt-4" style={{ borderColor: RULE }}>
              <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
                {t("catalog.productDetailPackagingLabel")}
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
        </div>

          {/* Agregar al carrito (ver montar-carrito-en-base-al-catalogo.md)
              — carrito de pedido sin precios, no e-commerce; el checkout
              real pasa por WhatsApp desde el drawer del carrito. Barra fija
              al pie del diálogo: SIEMPRE visible. */}
          <div className="flex shrink-0 items-center gap-3 border-t bg-white px-5 py-3 sm:px-6" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={tCart("decreaseAria", { name: product.name })}
                className="flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
              <span className="w-6 text-center text-[15px] font-semibold" style={{ color: INK }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label={tCart("increaseAria", { name: product.name })}
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
