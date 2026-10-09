"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatColones } from "@/lib/checkout-format";
import type { PriceView } from "@/lib/catalog-prices";
import { unitLabel } from "@/lib/presentations";

const INK = "#082B5C";
const MUTED = "#5C6B7D";

// Precio de catálogo: "₡X + IVA" (el precio es SIN IVA, igual que el precio unitario del carrito, mismo
// formato ₡ con 2 decimales) y la unidad de venta si el dato la trae. `hidden` no pinta nada: sin sesión
// no hay precio ni esqueleto (el aviso único vive en el encabezado del catálogo).
//   - card: compacto, para la tarjeta del listado.
//   - detail: jerarquía del modal: precio grande; "+ IVA" y "por Caja" más pequeños y en color suave.
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
          height: detail ? 28 : "clamp(9px, 2.2cqh, 13px)",
          width: detail ? 160 : "70%",
        }}
      />
    );
  }

  if (view.kind === "consult") {
    return (
      <span className={detail ? "text-[14px] font-medium" : "text-[9.5px] font-medium"} style={{ color: MUTED }}>
        {t("priceConsult")}
      </span>
    );
  }

  const unit = view.unit.trim() ? unitLabel(view.unit, locale) : "";
  const price = formatColones(view.unitPrice, locale, 2);

  if (detail) {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: INK }}>
            {price}
          </span>
          <span className="text-[13px] font-medium" style={{ color: MUTED }}>
            {t("priceVatSuffix")}
          </span>
        </span>
        {unit && (
          <span className="text-[13px] font-medium" style={{ color: MUTED }}>
            {t("priceUnit", { unit })}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-center">
      <span className="text-[11px] font-bold leading-tight" style={{ color: INK }}>
        {t("pricePlusTax", { price })}
      </span>
      {unit && (
        <span className="text-[9.5px] font-medium" style={{ color: MUTED }}>
          {t("priceUnit", { unit })}
        </span>
      )}
    </span>
  );
}
