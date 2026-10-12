"use client";

import { useState } from "react";
import { MapPin, Store, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PickupSite, ProductAvailability, ProductSummary } from "@/lib/product-types";
import type { PickupPriceView, PriceView } from "@/lib/catalog-prices";
import { formatColones } from "@/lib/checkout-format";
import { pickupPriceText, sitePrice } from "@/lib/channel-price";
import { usePickupPriceLabels } from "./PriceTag";
import {
  CATALOG_CHANNELS,
  differingPickupUnit,
  hasDelivery,
  hasPickup,
  siteDetails,
  splitSites,
  type CatalogChannel,
} from "@/lib/catalog-channel";
import { unitLabel } from "@/lib/presentations";

// "A domicilio" (camión, azul) y "Retiro en tienda" (tienda, dorado). Siempre con TEXTO además del color e
// ícono (accesible). Los colores de texto cumplen contraste AA sobre su fondo.
const DELIVERY = { fg: "#0B4FB0", bg: "#E6F1FB", border: "#BFD8F5" };
const PICKUP = { fg: "#7A5300", bg: "#FFF3CF", border: "#EBCB6B" };
const INK = "#082B5C";
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const DETAILS_ID = "pd-site-details";

// Etiquetas chicas de la tarjeta del listado: las dos si aplica. Un producto sin `availability` (lectura de
// respaldo) es solo A domicilio.
export function ChannelBadges({
  product,
  omitPickup = false,
}: {
  product: Pick<ProductSummary, "availability">;
  /** true cuando la línea "En tienda ₡X" ya hace de etiqueta del canal de retiro (ahorra una fila de alto). */
  omitPickup?: boolean;
}) {
  const t = useTranslations("Products.catalog");
  const delivery = hasDelivery(product);
  const pickup = hasPickup(product) && !omitPickup;
  if (!delivery && !pickup) return null;

  const badge = "inline-flex items-center gap-[2px] whitespace-nowrap rounded-full border font-semibold leading-none";
  const size = { padding: "1.5px 4px", fontSize: "clamp(8px, 1.7cqh, 9px)" };

  return (
    <span className="flex flex-wrap items-center justify-center gap-x-[3px] gap-y-[2px]">
      {delivery && (
        <span className={badge} style={{ ...size, color: DELIVERY.fg, background: DELIVERY.bg, borderColor: DELIVERY.border }}>
          <Truck className="h-[9px] w-[9px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t("channelDelivery")}
        </span>
      )}
      {pickup && (
        <span className={badge} style={{ ...size, color: PICKUP.fg, background: PICKUP.bg, borderColor: PICKUP.border }}>
          <Store className="h-[9px] w-[9px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t("channelPickup")}
        </span>
      )}
    </span>
  );
}

// Sección corta del modal de detalle: "¿Cómo lo querés?" con lo disponible. En retiro: hasta 3 tiendas y un
// "+N" desplegable. El tamaño del modal NO cambia al desplegar: la lista corta y la completa ocupan la MISMA
// celda de una grilla (la que no se ve reserva el espacio, oculta y sin foco).
export function ChannelAvailability({
  availability,
  deliveryPrice,
  pickupPrice,
}: {
  availability: ProductAvailability | undefined;
  /** Precio de A domicilio (sin sesión: hidden) y de Retiro en tienda; cada opción con SU precio. */
  deliveryPrice: PriceView;
  pickupPrice: PickupPriceView;
}) {
  const t = useTranslations("Products.catalog");
  const locale = useLocale();
  const pickupLabels = usePickupPriceLabels();
  const money = (amount: number) => formatColones(amount, locale, 2);
  const deliveryText = deliveryPrice.kind === "price" ? t("pricePlusTax", { price: money(deliveryPrice.unitPrice) }) : null;
  const pickupText = pickupPriceText(pickupPrice, "primary", pickupLabels, money);
  const pickupUnit = pickupPrice.kind === "price" && pickupPrice.unit.trim() ? t("priceUnit", { unit: unitLabel(pickupPrice.unit, locale) }) : null;
  const deliveryUnit = deliveryPrice.kind === "price" && deliveryPrice.unit.trim() ? t("priceUnit", { unit: unitLabel(deliveryPrice.unit, locale) }) : null;
  const [expanded, setExpanded] = useState(false);
  // Tienda fijada (toque/Enter) y tienda bajo el cursor; el panel muestra la del cursor y, sin ella, la fijada.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const delivery = hasDelivery({ availability });
  const pickup = hasPickup({ availability });
  if (!delivery && !pickup) return null;

  const sites = availability?.pickup.sites ?? [];
  const { shown, hidden } = splitSites(sites);
  const unit = differingPickupUnit(availability);
  const activeSite = sites.find((s) => s.siteId === (hoveredId ?? pinnedId)) ?? null;
  const activeDetails = activeSite ? siteDetails(activeSite) : null;

  const chip = "inline-flex items-center rounded-full border px-2.5 py-1 text-[12.5px] font-semibold leading-none";
  const chipStyle = { color: PICKUP.fg, background: PICKUP.bg, borderColor: PICKUP.border };

  // Nombre de la tienda y su ciudad/zona. Con datos que desplegar es un botón (toque, Enter o cursor); sin
  // ellos, una etiqueta quieta.
  const renderSiteChip = (site: PickupSite, price: number | null) => {
    const label = (
      <>
        <span>{site.name}</span>
        {site.city && <span className="ml-1 font-medium opacity-80">· {site.city}</span>}
        {price != null && <span className="ml-1.5 font-bold">{money(price)}</span>}
      </>
    );
    const siteChip = `${chip} max-w-full flex-wrap gap-y-0.5 text-left leading-tight`;
    if (!siteDetails(site)) {
      return (
        <li key={site.siteId} className={siteChip} style={chipStyle}>
          {label}
        </li>
      );
    }
    const open = pinnedId === site.siteId;
    return (
      <li key={site.siteId} className="max-w-full">
        <button
          type="button"
          onClick={() => setPinnedId(open ? null : site.siteId)}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setHoveredId(site.siteId);
          }}
          aria-expanded={open}
          aria-controls={activeSite?.siteId === site.siteId ? DETAILS_ID : undefined}
          className={`${siteChip} cursor-pointer outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#075FD8]`}
          style={open ? { ...chipStyle, borderColor: PICKUP.fg } : chipStyle}
        >
          {label}
        </button>
      </li>
    );
  };

  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border p-3.5" style={{ borderColor: RULE }} aria-labelledby="pd-how-title">
      <h3 id="pd-how-title" className="text-[13px] font-bold leading-tight" style={{ color: INK }}>
        {t("howTitle")}
      </h3>

      {delivery && (
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: DELIVERY.bg }}>
            <Truck className="h-4 w-4" strokeWidth={2} style={{ color: DELIVERY.fg }} aria-hidden />
          </span>
          <p className="text-[13px] leading-snug" style={{ color: TEXT_SOFT }}>
            <span className="font-semibold" style={{ color: DELIVERY.fg }}>
              {t("channelDelivery")}
            </span>{" "}
            · {t("howDeliveryText")}
            {deliveryText && (
              <span className="mt-0.5 block font-bold" style={{ color: INK }}>
                {deliveryText}
                {deliveryUnit && <span className="ml-1.5 font-medium" style={{ color: TEXT_SOFT }}>{deliveryUnit}</span>}
              </span>
            )}
          </p>
        </div>
      )}

      {pickup && (
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: PICKUP.bg }}>
            <Store className="h-4 w-4" strokeWidth={2} style={{ color: PICKUP.fg }} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug" style={{ color: TEXT_SOFT }}>
              <span className="font-semibold" style={{ color: PICKUP.fg }}>
                {t("channelPickup")}
              </span>{" "}
              · {t("howPickupText")}
              {pickupText && (
                <span className="mt-0.5 block font-bold" style={{ color: INK }}>
                  {pickupText}
                  {pickupUnit && <span className="ml-1.5 font-medium" style={{ color: TEXT_SOFT }}>{pickupUnit}</span>}
                </span>
              )}
              {/* Sin precio (sin sesión) la unidad de retiro, si difiere de la de domicilio, va en su propia línea. */}
              {!pickupText && unit && (
                <span className="mt-0.5 block">{t("howPickupUnit", { unit: unitLabel(unit, locale) })}.</span>
              )}
            </p>

            {/* Hover (mouse) o toque/Enter fijan la tienda activa; sus datos salen en un solo panel debajo de la
                lista, así el tamaño de la lista corta/completa no cambia. Si salís con el cursor del bloque entero
                (chips + panel) se vuelve a la tienda fijada, para poder llegar al enlace del mapa. */}
            <div className="mt-1.5" onPointerLeave={() => setHoveredId(null)}>
              <div className="grid" role="group" aria-label={t("pickupSitesAria")}>
                <ul
                  className="col-start-1 row-start-1 flex flex-wrap content-start gap-1.5"
                  aria-hidden={expanded || undefined}
                  inert={expanded}
                  style={{ visibility: expanded ? "hidden" : undefined }}
                >
                  {shown.map((site) => (
                    renderSiteChip(site, null)
                  ))}
                  {hidden.length > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        aria-expanded={false}
                        aria-label={t("pickupMoreAria", { count: hidden.length })}
                        className={`${chip} outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#075FD8]`}
                        style={{ ...chipStyle, background: "#FFFFFF" }}
                      >
                        +{hidden.length}
                      </button>
                    </li>
                  )}
                </ul>

                {hidden.length > 0 && (
                  <ul
                    className="col-start-1 row-start-1 flex flex-wrap content-start gap-1.5"
                    aria-hidden={!expanded || undefined}
                    inert={!expanded}
                    style={{ visibility: expanded ? undefined : "hidden" }}
                  >
                    {sites.map((site) => {
                      const price = pickupPrice.kind === "price" && pickupPrice.varies ? sitePrice(pickupPrice, site.siteId) : null;
                      return renderSiteChip(site, price);
                    })}
                    <li>
                      <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        aria-expanded
                        aria-label={t("pickupLessAria")}
                        className={`${chip} outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#075FD8]`}
                        style={{ ...chipStyle, background: "#FFFFFF" }}
                      >
                        −
                      </button>
                    </li>
                  </ul>
                )}
              </div>

              {activeSite && activeDetails && (
                <div
                  id={DETAILS_ID}
                  role="region"
                  aria-label={t("pickupStoreDetailsAria", { name: activeSite.name })}
                  className="mt-2 flex flex-col gap-1 rounded-xl border bg-white p-2.5 text-[12.5px] leading-snug"
                  style={{ borderColor: PICKUP.border, color: TEXT_SOFT }}
                >
                  <p className="font-bold" style={{ color: INK }}>
                    {activeSite.name}
                  </p>
                  {activeDetails.address && (
                    <p>
                      <span className="font-semibold">{t("pickupStoreAddress")}:</span> {activeDetails.address}
                    </p>
                  )}
                  {activeDetails.hours && (
                    <p>
                      <span className="font-semibold">{t("pickupStoreHours")}:</span> {activeDetails.hours}
                    </p>
                  )}
                  {activeDetails.mapUrl && (
                    <a
                      href={activeDetails.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("pickupStoreMapAria", { name: activeSite.name })}
                      className="inline-flex w-fit items-center gap-1 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8]"
                      style={{ color: PICKUP.fg }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {t("pickupStoreMap")}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Chips "Todos / A domicilio / Retiro en tienda" arriba del catálogo, con cuántos productos hay en cada uno
// (los de conteo 0 se desactivan, salvo el seleccionado).
export function ChannelFilterBar({
  value,
  counts,
  onChange,
  disabled,
  inline = false,
}: {
  value: CatalogChannel;
  counts: Record<CatalogChannel, number>;
  onChange: (channel: CatalogChannel) => void;
  disabled?: boolean;
  /** En línea (dentro del encabezado, sin barra propia): no resta alto a la hoja del libro. */
  inline?: boolean;
}) {
  const t = useTranslations("Products.catalog");

  const label = (channel: CatalogChannel) =>
    channel === "delivery" ? t("channelDelivery") : channel === "pickup" ? t("channelPickup") : t("channelAll");
  const Icon = (channel: CatalogChannel) => (channel === "delivery" ? Truck : channel === "pickup" ? Store : null);

  return (
    <div
      className={inline ? "flex flex-wrap items-center gap-1.5" : "flex shrink-0 flex-wrap items-center gap-2 px-5 py-2 sm:px-8"}
      style={inline ? undefined : { borderBottom: `1px solid ${RULE}`, background: "#FFFFFF" }}
    >
      {!inline && (
        <span className="text-[11.5px] font-semibold" style={{ color: TEXT_SOFT }}>
          {t("channelFilterLabel")}
        </span>
      )}
      <div role="radiogroup" aria-label={t("channelFilterLabel")} className="flex flex-wrap items-center gap-1.5">
        {CATALOG_CHANNELS.map((channel) => {
          const selected = value === channel;
          const ChannelIcon = Icon(channel);
          const palette = channel === "pickup" ? PICKUP : DELIVERY;
          return (
            <button
              key={channel}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || (!selected && counts[channel] === 0)}
              onClick={() => onChange(channel)}
              className={`inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#075FD8] disabled:cursor-not-allowed disabled:opacity-40 ${inline ? "px-2.5 py-[3px] text-[11.5px]" : "px-3 py-1 text-[12.5px]"}`}
              style={
                selected
                  ? { color: channel === "all" ? "#FFFFFF" : palette.fg, background: channel === "all" ? INK : palette.bg, borderColor: channel === "all" ? INK : palette.fg }
                  : { color: INK, background: "#FFFFFF", borderColor: RULE }
              }
            >
              {ChannelIcon && <ChannelIcon className={`h-3.5 w-3.5 ${inline ? "hidden sm:block" : ""}`} strokeWidth={2} aria-hidden />}
              {label(channel)}
              <span className={`tabular-nums opacity-70 ${inline ? "hidden sm:inline" : ""}`}>{counts[channel]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
