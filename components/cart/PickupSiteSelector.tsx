"use client";

import { useId, useState } from "react";
import { CheckCircle2, MapPin, Store, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { safeMapUrl } from "@/lib/catalog-channel";
import type { OrderPreviewSite } from "@/lib/order-types";
import PickupStoreChooser from "@/components/modals/product-catalog/PickupStoreChooser";
import { ACCENT, FOCUS_RING, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

interface Props {
  // Las tiendas oficiales con el estado de cada una para TODAS las líneas de retiro del carrito (del servidor).
  sites: OrderPreviewSite[];
  selectedId: string;
  // true = el cliente todavía no eligió tienda: la mostrada es solo una propuesta y se ve el selector.
  proposed: boolean;
  // Elegir la tienda del retiro (la del carrito entero). El carrito cambia la tienda, borra la fecha de retiro y revalida.
  onSelect: (siteId: string) => void;
  // Con false no se repite la dirección, el horario y el mapa.
  showDetails?: boolean;
  // Control externo del selector abierto (por ejemplo, "Ver otras tiendas" de una línea sin existencia). Sin ellos, el estado es interno.
  changing?: boolean;
  onChangingChange?: (changing: boolean) => void;
  // Con el selector abierto, indica qué tiendas tienen TODAS las líneas de retiro del carrito (las del servidor con 0 faltantes).
  showFullStores?: boolean;
}

// Tienda del retiro del carrito (UNA por carrito). Con tienda ya elegida (por ejemplo, desde el modal del producto) se ve una tarjeta resumen
// (nombre, ciudad, dirección, horario) con "Cambiar tienda"; el selector (el mismo del modal: cercanas con permiso de ubicación, estado por
// tienda considerando todas las líneas, "Ver todas las tiendas") solo aparece si no hay tienda o al pedir el cambio. Elegir una tienda que no
// alcanza para algún producto se permite: esas líneas quedan marcadas en el carrito. Todo dato viene del servidor.
export default function PickupSiteSelector({ sites, selectedId, proposed, onSelect, showDetails = true, changing: changingProp, onChangingChange, showFullStores = false }: Props) {
  const t = useTranslations("Cart.order");
  const tCatalog = useTranslations("Products.catalog");
  const id = useId();
  const [innerChanging, setInnerChanging] = useState(false);
  const changing = changingProp ?? innerChanging;
  const setChanging = (value: boolean) => {
    setInnerChanging(value);
    onChangingChange?.(value);
  };
  const selected = sites.find((s) => s.siteId === selectedId) ?? null;
  const mapUrl = safeMapUrl(selected?.mapUrl);

  if (sites.length === 0) return null;

  const fullStores = sites.filter((s) => s.unavailableItems === 0).map((s) => s.name || s.siteId);
  const showChooser = proposed || changing || !selected;
  const titleId = `${id}-title`;
  const label = (
    <span id={titleId} className="flex items-center gap-2 text-[12px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.1em" }}>
      <Store className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {t("pickupStoreLabel")}
    </span>
  );

  if (showChooser) {
    return (
      <div className="flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }}>
        {label}
        <PickupStoreChooser
          stores={sites.map((s) => ({
            siteId: s.siteId,
            name: s.name,
            city: s.city,
            address: s.address,
            hours: s.hours,
            mapUrl: s.mapUrl,
            lat: s.lat,
            lng: s.lng,
            status: s.status,
          }))}
          chosenId={selectedId || null}
          onChoose={(siteId) => {
            onSelect(siteId);
            setChanging(false);
          }}
          labelledBy={titleId}
          blockOut={false}
        />
        {showFullStores && changing && (
          <p className="text-[12.5px] font-medium leading-snug" style={{ color: INK }} aria-live="polite">
            {fullStores.length > 0 ? t("pickupStoresWithAll", { stores: fullStores.join(", ") }) : t("pickupNoStoreHasAll")}
          </p>
        )}
        {proposed && selected && (
          <p className="text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
            {t("pickupStoreProposed")}
          </p>
        )}
        {changing && (
          <button
            type="button"
            onClick={() => setChanging(false)}
            className={`self-start rounded px-1 py-1 text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
            style={{ color: ACCENT }}
          >
            {t("pickupChangeCancel")}
          </button>
        )}
      </div>
    );
  }

  const missing = selected.unavailableItems;
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }} data-slot="pickup-store-summary">
      <div className="flex items-start justify-between gap-3">
        {label}
        <button
          type="button"
          onClick={() => setChanging(true)}
          className={`shrink-0 rounded px-1 py-0.5 text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
          style={{ color: ACCENT }}
        >
          {t("pickupChangeStore")}
        </button>
      </div>

      <div>
        <p className="text-[14.5px] font-semibold leading-snug" style={{ color: INK }}>
          {selected.name || selected.siteId}
        </p>
        {selected.city && (
          <p className="text-[13px] leading-snug" style={{ color: TEXT_MUTED }}>
            {selected.city}
          </p>
        )}
      </div>

      <p className="flex items-start gap-2 text-[12.5px] font-medium leading-snug" style={{ color: missing > 0 ? "#8A5A00" : "#1B6B3A" }} aria-live="polite">
        {missing > 0 ? (
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        )}
        {missing > 0 ? t("pickupStoreSomeMissing", { count: missing }) : t("pickupStoreAllAvailable")}
      </p>

      {showDetails && (selected.address || selected.hours || mapUrl) && (
        <dl className="m-0 flex flex-col gap-1 border-t pt-2.5 text-[12.5px] leading-snug" style={{ borderColor: RULE, color: TEXT_MUTED }}>
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
