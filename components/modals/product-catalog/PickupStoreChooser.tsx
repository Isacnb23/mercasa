"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import { formatKm, rankStores, type RankedStore, type StoreLike, type StoreStatus } from "@/lib/pickup-stores";

const INK = "#082B5C";
const RULE = "#E2E8F0";
const TEXT_SOFT = "#5C6B7D";
const SELECTED_BG = "#EAF0F8";

export interface ChooserStore extends StoreLike {
  city?: string;
}

interface Props {
  stores: ChooserStore[];
  chosenId: string | null;
  onChoose: (siteId: string) => void;
  // La presentación elegida no se puede retirar: ninguna tienda se puede elegir (el aviso lo explica).
  unitBlocked: boolean;
  // El retiro está abierto: al volverse true se pide la ubicación (una sola vez), nunca al cargar la página.
  active: boolean;
  labelledBy: string;
}

const STATUS_STYLE: Record<StoreStatus, { bg: string; color: string; key: "storeStatusAvailable" | "storeStatusLow" | "storeStatusOut" }> = {
  available: { bg: "#E8F5EC", color: "#1B6B3A", key: "storeStatusAvailable" },
  low: { bg: "#FFF3CF", color: "#7A5300", key: "storeStatusLow" },
  out: { bg: "#F4F6F9", color: TEXT_SOFT, key: "storeStatusOut" },
};

// Tiendas de retiro del producto: estado de existencia en la presentación elegida, orden por cercanía (con permiso de ubicación, las 3
// más cercanas con su distancia y "Ver todas las tiendas") y las SIN existencia al final. La ubicación se calcula en el navegador: no se
// envía ni se guarda. Sin permiso o con un error se muestran todas.
export default function PickupStoreChooser({ stores, chosenId, onChoose, unitBlocked, active, labelledBy }: Props) {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const { state, request } = useUserPosition();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (active) request();
  }, [active, request]);

  const position = state.status === "granted" ? state.position : null;
  const ranked = useMemo(() => rankStores(stores, position), [stores, position]);
  const visible: RankedStore<ChooserStore>[] = expanded ? [...ranked.shown, ...ranked.hidden] : ranked.shown;

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
      {unitBlocked && (
        <p className="text-[12.5px] font-medium leading-snug" style={{ color: "#8A5A00" }}>
          {t("pickupUnitUnavailable")}
        </p>
      )}

      <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-col gap-2">
        {visible.map(({ store, km }) => {
          const chosen = chosenId !== null && store.siteId.toUpperCase() === chosenId.toUpperCase();
          const status = store.status ?? null;
          const blocked = unitBlocked || status === "out";
          const detail = [store.city?.trim() || null, km !== null ? t("storeDistanceKm", { km: formatKm(km, locale) }) : null].filter(Boolean).join(" · ");
          return (
            <button
              key={store.siteId}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={blocked && !chosen}
              onClick={() => onChoose(store.siteId)}
              className="relative flex w-full items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left outline-none transition hover:border-[#B9C6D8] hover:bg-[#FBF9F5] focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
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
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none"
                  style={{ background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].color }}
                >
                  {t(STATUS_STYLE[status].key)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {ranked.hidden.length > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded px-1 py-1.5 text-[13px] font-semibold underline underline-offset-4 outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
          style={{ color: "#075FD8" }}
        >
          {expanded ? t("seeFewerStores") : t("seeAllStores")}
          <ChevronDown className={`h-3.5 w-3.5 motion-safe:transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.2} aria-hidden />
        </button>
      )}

      <p className="text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>
        {t("storesLocationNote")}
      </p>
    </div>
  );
}
