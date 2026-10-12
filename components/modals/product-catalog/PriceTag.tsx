"use client";

import { Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatColones } from "@/lib/checkout-format";
import type { PickupPriceView, PriceView } from "@/lib/catalog-prices";
import { pickupPriceText, type PickupPriceLabels } from "@/lib/channel-price";
import { unitLabel } from "@/lib/presentations";

const INK = "#082B5C";
const MUTED = "#5C6B7D";
// Precio de la tarjeta: una línea (no parte "IVA incluido" a una segunda) y se achica con la hoja del libro.
const CARD_PRICE_SIZE = "clamp(9px, 1.95cqh, 11px)";

// Precio de catálogo: "₡X IVA incluido" (precio TOTAL con IVA por unidad, en colones enteros, como MercasaVIP;
// el carrito y los totales del pedido siguen con su propia fórmula) y la unidad de venta si el dato la trae.
// `hidden` no pinta nada: sin sesión no hay precio ni esqueleto (el aviso único vive en el encabezado del
// catálogo).
//   - card: compacto, para la tarjeta del listado.
//   - detail: jerarquía del modal: precio grande; "IVA incluido" y "por Caja" más pequeños y en color suave.
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
  const price = formatColones(view.total, locale);

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
    <span className="flex flex-col items-center leading-tight">
      <span className="whitespace-nowrap font-bold" style={{ color: INK, fontSize: CARD_PRICE_SIZE }}>
        {t("priceVatIncluded", { price })}
      </span>
      {unit && (
        <span className="whitespace-nowrap text-[9px] font-medium" style={{ color: MUTED }}>
          {t("priceUnit", { unit })}
        </span>
      )}
    </span>
  );
}

// Etiquetas de texto del precio de retiro (es/en, ver messages: Products.catalog).
export function usePickupPriceLabels(): PickupPriceLabels {
  const t = useTranslations("Products.catalog");
  return {
    vatIncluded: (price) => t("priceVatIncluded", { price }),
    fromVatIncluded: (price) => t("priceFromVatIncluded", { price }),
    inStore: (price) => t("pickupPriceInStore", { price }),
    inStoreFrom: (price) => t("pickupPriceInStoreFrom", { price }),
  };
}

// Precio de Retiro en tienda en la tarjeta, por separado del de domicilio (nunca se mezclan):
//   - primary: el producto solo se retira en tienda; misma forma que PriceTag ("₡X IVA incluido" y la unidad).
//   - secondary: el producto está en los dos canales; una línea breve debajo del precio de domicilio.
const PICKUP_INK = "#7A5300";
export function PickupPriceTag({ view, role }: { view: PickupPriceView; role: "primary" | "secondary" }) {
  const t = useTranslations("Products.catalog");
  const locale = useLocale();
  const labels = usePickupPriceLabels();

  if (view.kind === "hidden") return null;

  if (view.kind === "loading") {
    return role === "secondary" ? null : (
      <span
        role="status"
        aria-label={t("priceLoadingAria")}
        className="block animate-pulse rounded motion-reduce:animate-none"
        style={{ background: "rgba(8, 43, 92, 0.1)", height: "clamp(9px, 2.2cqh, 13px)", width: "70%" }}
      />
    );
  }

  if (view.kind === "consult") {
    return role === "secondary" ? null : (
      <span className="text-[9.5px] font-medium" style={{ color: MUTED }}>
        {t("priceConsult")}
      </span>
    );
  }

  const text = pickupPriceText(view, role, labels, (amount) => formatColones(amount, locale));
  if (role === "secondary") {
    // Con ícono de tienda y la palabra "tienda": esta línea ya hace de etiqueta del canal, así que la tarjeta no
    // repite la etiqueta "Retiro en tienda" cuando hay precio.
    return (
      <span className="inline-flex items-center gap-[3px] whitespace-nowrap font-semibold leading-tight" style={{ color: PICKUP_INK, fontSize: "clamp(8.5px, 1.75cqh, 9.5px)" }}>
        <Store className="h-[9px] w-[9px] shrink-0" strokeWidth={2.2} aria-hidden />
        {text}
      </span>
    );
  }

  const unit = view.unit.trim() ? unitLabel(view.unit, locale) : "";
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className={`font-bold ${view.varies ? "" : "whitespace-nowrap"}`} style={{ color: INK, fontSize: CARD_PRICE_SIZE }}>
        {text}
      </span>
      {unit && (
        <span className="whitespace-nowrap text-[9px] font-medium" style={{ color: MUTED }}>
          {t("priceUnit", { unit })}
        </span>
      )}
    </span>
  );
}
