"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { safeMapUrl, siteDetails } from "@/lib/catalog-channel";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import { formatKm, rankStores, type RankedStore, type StoreLike, type StoreStatus } from "@/lib/pickup-stores";

const INK = "#082B5C";
const RULE = "#E2E8F0";
const TEXT_SOFT = "#5C6B7D";
const SELECTED_BG = "#EAF0F8";

export interface ChooserStore extends StoreLike {
  city?: string;
  address?: string;
  hours?: string;
  mapUrl?: string;
}

interface Props {
  // Tiendas que tienen la presentación elegida, cada una con su estado.
  stores: ChooserStore[];
  chosenId: string | null;
  onChoose: (siteId: string) => void;
  // id del título del paso (nombra el grupo de radios).
  labelledBy: string;
  // true (modal): una tienda sin existencia de la presentación no se puede elegir. false (carrito): sí se puede (las líneas que no alcanzan
  // quedan marcadas), porque el estado considera todas las líneas del retiro.
  blockOut?: boolean;
}

const STATUS_STYLE: Record<StoreStatus, { bg: string; color: string; key: "storeStatusAvailable" | "storeStatusLow" | "storeStatusOut" }> = {
  available: { bg: "#E8F5EC", color: "#1B6B3A", key: "storeStatusAvailable" },
  low: { bg: "#FFF3CF", color: "#7A5300", key: "storeStatusLow" },
  out: { bg: "#F4F6F9", color: TEXT_SOFT, key: "storeStatusOut" },
};

// Lista ÚNICA de tiendas de la presentación elegida (paso 3 del retiro): con permiso de ubicación, las 3 más cercanas con su distancia y
// "Ver todas las tiendas"; sin permiso (o con error), todas. Las sin existencia van al final y deshabilitadas. La dirección y el horario salen
// SOLO bajo la tienda elegida. La ubicación se pide al montarse (o sea, al abrir el retiro, nunca al cargar la página), se calcula en el
// navegador y no se envía ni se guarda.
export default function PickupStoreChooser({ stores, chosenId, onChoose, labelledBy, blockOut = true }: Props) {
  const t = useTranslations("Cart");
  const tCatalog = useTranslations("Products.catalog");
  const locale = useLocale();
  const { state, request } = useUserPosition();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    request();
  }, [request]);

  const position = state.status === "granted" ? state.position : null;
  const ranked = useMemo(() => rankStores(stores, position), [stores, position]);
  const chosenHidden = ranked.hidden.some((r) => chosenId !== null && r.store.siteId.toUpperCase() === chosenId.toUpperCase());
  // Si la elegida cae entre las ocultas, la lista se abre para que se vea (y su detalle).
  const open = expanded || chosenHidden;
  const visible: RankedStore<ChooserStore>[] = open ? [...ranked.shown, ...ranked.hidden] : ranked.shown;

  return (
    <div className="flex flex-col gap-2.5">
      {state.status === "asking" && (
        <p role="status" className="text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
          {t("storesLocating")}
        </p>
      )}
      {(state.status === "denied" || state.status === "unavailable") && (
        <p className="text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
          {t("storesLocationOff")}
        </p>
      )}
      {ranked.byDistance && (
        <p className="text-[12px] font-bold uppercase leading-none" style={{ color: TEXT_SOFT, letterSpacing: "0.1em" }}>
          {t("storesNearest")}
        </p>
      )}

      <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-col gap-2">
        {visible.map(({ store, km }) => {
          const chosen = chosenId !== null && store.siteId.toUpperCase() === chosenId.toUpperCase();
          const status = store.status ?? null;
          const blocked = blockOut && status === "out";
          const detail = [store.city?.trim() || null, km !== null ? t("storeDistanceKm", { km: formatKm(km, locale) }) : null].filter(Boolean).join(" · ");
          const details = chosen ? siteDetails({ siteId: store.siteId, name: store.name, address: store.address, hours: store.hours, mapUrl: store.mapUrl }) : null;
          const mapUrl = details ? details.mapUrl : null;
          return (
            <div key={store.siteId} className="flex flex-col">
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={blocked && !chosen}
                onClick={() => onChoose(store.siteId)}
                className={`relative flex w-full items-center gap-3 border bg-white px-3.5 py-3 text-left outline-none transition hover:border-[#B9C6D8] hover:bg-[#FBF9F5] focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white ${details ? "rounded-t-2xl" : "rounded-2xl"}`}
                style={{ borderColor: chosen ? INK : RULE, background: chosen ? SELECTED_BG : undefined, boxShadow: chosen ? `inset 0 0 0 1px ${INK}` : undefined }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: chosen ? INK : "#F4F6F9", color: chosen ? "#fff" : INK }} aria-hidden>
                  {chosen ? <Check className="h-4 w-4" strokeWidth={3} /> : <MapPin className="h-4 w-4" strokeWidth={2} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-snug" style={{ color: INK }}>
                    {store.name || store.siteId}
                  </span>
                  {detail && (
                    <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
                      {detail}
                    </span>
                  )}
                </span>
                {status && (
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none" style={{ background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].color }}>
                    {t(STATUS_STYLE[status].key)}
                  </span>
                )}
              </button>

              {/* Dirección y horario solo bajo la tienda elegida (sin tarjeta aparte ni espacio reservado). */}
              {details && (
                <dl
                  className="m-0 flex flex-col gap-1.5 rounded-b-2xl border border-t-0 bg-white px-3.5 py-3 text-[12.5px] leading-snug"
                  style={{ borderColor: INK, color: TEXT_SOFT }}
                >
                  {details.address && (
                    <div>
                      <dt className="font-semibold" style={{ color: INK }}>
                        {tCatalog("pickupStoreAddress")}
                      </dt>
                      <dd className="m-0">{details.address}</dd>
                    </div>
                  )}
                  {details.hours && (
                    <div>
                      <dt className="font-semibold" style={{ color: INK }}>
                        {tCatalog("pickupStoreHours")}
                      </dt>
                      <dd className="m-0">{details.hours}</dd>
                    </div>
                  )}
                  {mapUrl && safeMapUrl(mapUrl) && (
                    <div>
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={tCatalog("pickupStoreMapAria", { name: store.name || store.siteId })}
                        className="inline-flex items-center gap-1.5 rounded font-semibold underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8]"
                        style={{ color: "#075FD8" }}
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
        })}
      </div>

      {ranked.hidden.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded px-1 py-1.5 text-[13px] font-semibold underline underline-offset-4 outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
          style={{ color: "#075FD8" }}
        >
          {open ? t("seeFewerStores") : t("seeAllStores")}
          <ChevronDown className={`h-3.5 w-3.5 motion-safe:transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.2} aria-hidden />
        </button>
      )}

      <p className="text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>
        {t("storesLocationNote")}
      </p>
    </div>
  );
}
