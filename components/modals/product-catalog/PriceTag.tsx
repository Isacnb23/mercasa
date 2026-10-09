"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatColones } from "@/lib/checkout-format";
import { formatUnit, type PriceView } from "@/lib/catalog-prices";

const INK = "#082B5C";
const MUTED = "#5C6B7D";

// Precio de catálogo: "₡X + IVA" (el precio es SIN IVA, igual que el precio unitario del carrito, mismo
// formato ₡ con 2 decimales) y la unidad de venta si el dato la trae. `hidden` no pinta nada: sin sesión
// no hay precio ni esqueleto (el aviso único vive en el encabezado del catálogo).
export default function PriceTag({ view, size = "card" }: { view: PriceView; size?: "card" | "detail" }) {
  const t = useTranslations("Products.catalog");
  const locale = useLocale();
  const detail = size === "detail";

  if (view.kind === "hidden") return null;

  if (view.kind === "loading") {
    return (
      <span
        role="status"
        aria-label={t("priceLoadingAria")}
        className="block animate-pulse rounded motion-reduce:animate-none"
        style={{
          background: "rgba(8, 43, 92, 0.1)",
          height: detail ? 22 : "clamp(9px, 2.2cqh, 13px)",
          width: detail ? 150 : "70%",
        }}
      />
    );
  }

  if (view.kind === "consult") {
    return (
      <span className={detail ? "text-[13px] font-medium" : "text-[9.5px] font-medium"} style={{ color: MUTED }}>
        {t("priceConsult")}
      </span>
    );
  }

  const unit = formatUnit(view.unit);
  return (
    <span className="flex flex-col items-center" style={detail ? { alignItems: "flex-start" } : undefined}>
      <span
        className={detail ? "text-[20px] font-bold leading-tight" : "text-[11px] font-bold leading-tight"}
        style={{ color: INK }}
      >
        {t("pricePlusTax", { price: formatColones(view.unitPrice, locale, 2) })}
      </span>
      {unit && (
        <span className={detail ? "text-[13px] font-medium" : "text-[9.5px] font-medium"} style={{ color: MUTED }}>
          {t("priceUnit", { unit })}
        </span>
      )}
    </span>
  );
}
