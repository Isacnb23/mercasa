"use client";

import { useState } from "react";
import { ImageOff, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
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
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const packagingCodes = findPackagingCodes(product.name, glossaryGroups);

  return (
    <div
      // z-index por encima de `.catalog-backdrop`/`.catalog-panel` (z-index:
      // 100 en product-catalog-overlay.css) — con un z-[70] el detalle
      // quedaba montado en el DOM con opacidad correcta pero VISUALMENTE
      // detrás del catálogo (confirmado con captura real, no solo revisando
      // el código — esto ya había fallado antes con este mismo componente).
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(8,20,40,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("catalog.productDetailAriaLabel", { name: product.name })}
        className="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(8,20,40,0.35)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("catalog.close")}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 transition hover:bg-white"
          style={{ boxShadow: "0 4px 12px rgba(8,20,40,0.18)" }}
        >
          <X className="h-4 w-4" strokeWidth={2} style={{ color: INK }} aria-hidden />
        </button>

        {/* Foto grande — misma fuente que las miniaturas (/api/product-images,
            tabla Arte + SharePoint), solo en tamaño "l". Caja cuadrada fija
            para que el layout no salte entre productos con/sin foto real. */}
        <div className="relative flex aspect-square w-full items-center justify-center" style={{ background: CHIP_BG }}>
          <ProductImage
            itemId={product.id}
            name={product.name}
            familyIcon={icon}
            size="l"
            className="h-full w-full object-contain p-6"
            errorIconClassName="h-16 w-16"
            onStatusChange={setImageStatus}
          />
          {imageStatus === "error" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1.5">
              <ImageOff className="h-4 w-4" strokeWidth={1.8} style={{ color: MUTED }} aria-hidden />
              <span className="text-[13px] font-semibold" style={{ color: MUTED }}>
                {t("catalog.productDetailPhotoNotAvailable")}
              </span>
            </div>
          )}
        </div>

        {/* Nombre completo (sin truncar, ver doc) + empaque. */}
        <div className="p-6 sm:p-7">
          <p className="font-display text-[18px] font-semibold leading-snug" style={{ color: INK }}>
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
      </div>
    </div>
  );
}
