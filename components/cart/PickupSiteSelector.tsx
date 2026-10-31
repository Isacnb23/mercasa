"use client";

import { useId } from "react";
import { CheckCircle2, MapPin, Store, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { safeMapUrl } from "@/lib/catalog-channel";
import type { OrderPreviewSite } from "@/lib/order-types";
import { ACCENT, FIELD_CLASS, FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

interface Props {
  // Las tiendas oficiales con cuántos productos del grupo no tienen existencia en cada una (del servidor).
  sites: OrderPreviewSite[];
  selectedId: string;
  // true = el cliente todavía no eligió: la tienda mostrada es una propuesta.
  proposed: boolean;
  onSelect: (siteId: string) => void;
  // Con false no se repite la dirección, el horario y el mapa (el paso de entrega sí los muestra).
  showDetails?: boolean;
}

// Selector de la UNA tienda de retiro. Cada opción dice nombre y ciudad y, si falta existencia, cuántos productos del
// carrito no hay en esa tienda (para ayudar a elegir). Debajo, el estado de la elegida y su dirección, el "Horario
// de la tienda" y "Ver en el mapa" (igual que el modal del producto). Todo dato viene del servidor.
export default function PickupSiteSelector({ sites, selectedId, proposed, onSelect, showDetails = true }: Props) {
  const t = useTranslations("Cart.order");
  const tCatalog = useTranslations("Products.catalog");
  const id = useId();
  const selected = sites.find((s) => s.siteId === selectedId) ?? null;
  const mapUrl = safeMapUrl(selected?.mapUrl);

  if (sites.length === 0) return null;

  // Las tiendas sin existencia para este pedido van al final (el resto conserva su orden).
  const ordered = [...sites.filter((s) => s.status !== "out"), ...sites.filter((s) => s.status === "out")];

  const optionLabel = (s: OrderPreviewSite) =>
    s.unavailableItems > 0
      ? t("pickupStoreOptionMissing", { name: s.name || s.siteId, city: s.city, count: s.unavailableItems })
      : t("pickupStoreOption", { name: s.name || s.siteId, city: s.city });

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }}>
      <label htmlFor={id} className="flex items-center gap-2 text-[12px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.1em" }}>
        <Store className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t("pickupStoreLabel")}
      </label>
      <select
        id={id}
        value={selectedId}
        aria-label={t("pickupStoreSelectAria")}
        onChange={(e) => onSelect(e.target.value)}
        className={`${FIELD_CLASS} !min-h-[44px] !py-2 text-[13.5px] font-semibold`}
        style={{ borderColor: RULE, color: INK }}
      >
        {ordered.map((s) => (
          <option key={s.siteId} value={s.siteId}>
            {optionLabel(s)}
          </option>
        ))}
      </select>

      {selected && (
        <p
          className="flex items-start gap-2 text-[12.5px] font-medium leading-snug"
          style={{ color: selected.unavailableItems > 0 ? "#8A5A00" : "#1B6B3A" }}
          aria-live="polite"
        >
          {selected.unavailableItems > 0 ? (
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          )}
          {selected.unavailableItems > 0
            ? t("pickupStoreSomeMissing", { count: selected.unavailableItems })
            : t("pickupStoreAllAvailable")}
        </p>
      )}

      {proposed && (
        <p className="text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
          {t("pickupStoreProposed")}
        </p>
      )}

      {showDetails && selected && (selected.address || selected.hours || mapUrl) && (
        <dl className="mt-0.5 flex flex-col gap-1 border-t pt-2.5 text-[12.5px] leading-snug" style={{ borderColor: RULE, color: TEXT_MUTED }}>
          {selected.address && (
            <div>
              <dt className="font-semibold" style={{ color: INK }}>
                {tCatalog("pickupStoreAddress")}
              </dt>
              <dd className="m-0">{selected.address}</dd>
            </div>
          )}
          {selected.hours && (
            <div>
              <dt className="font-semibold" style={{ color: INK }}>
                {tCatalog("pickupStoreHours")}
              </dt>
              <dd className="m-0">{selected.hours}</dd>
            </div>
          )}
          {mapUrl && (
            <div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tCatalog("pickupStoreMapAria", { name: selected.name || selected.siteId })}
                className={`inline-flex items-center gap-1.5 rounded font-semibold underline underline-offset-4 ${FOCUS_RING}`}
                style={{ color: ACCENT }}
              >
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {tCatalog("pickupStoreMap")}
              </a>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
