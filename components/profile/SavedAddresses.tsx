"use client";

import { AlertCircle, Check, MapPin, Pencil, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveAddress, useAddresses } from "@/lib/addresses-context";
import type { SavedAddress } from "@/lib/auth-types";
import {
  BEIGE,
  DANGER_BG,
  DANGER_TEXT,
  FOCUS_RING,
  INK,
  PRIMARY_BUTTON,
  RULE,
  SELECTED_BG,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";

// provincia · cantón · distrito · ciudad, omitiendo los que vengan null/vacíos.
// Sin ninguno devuelve null y la tarjeta no muestra la línea.
function locationLine(address: SavedAddress): string | null {
  const parts = [address.provinceName, address.cantonName, address.districtName, address.cityName]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function Skeletons({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label={label}>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-4 motion-safe:animate-pulse"
          style={{ borderColor: RULE }}
          aria-hidden
        >
          <span className="h-3.5 w-2/5 rounded-full" style={{ background: BEIGE }} />
          <span className="h-3 w-4/5 rounded-full" style={{ background: BEIGE }} />
          <span className="h-3 w-3/5 rounded-full" style={{ background: BEIGE }} />
        </div>
      ))}
    </div>
  );
}

// `onEdit`: abre el editor de esa dirección. El botón "Editar" va APARTE de la tarjeta (un botón dentro de otro botón no es
// válido ni accesible) y su nombre accesible incluye cuál dirección es.
export default function SavedAddresses({ onAdd, onEdit }: { onAdd: () => void; onEdit?: (address: SavedAddress) => void }) {
  const t = useTranslations("Profile.addresses");
  const { addresses, status, refreshAddresses } = useAddresses();
  const { addressId: activeId, setActiveAddressId } = useActiveAddress();

  return (
    <section aria-labelledby="saved-addresses-title" className="flex flex-col gap-3">
      <h2 id="saved-addresses-title" className="font-display text-[18px] font-semibold" style={{ color: INK }}>
        {t("title")}
      </h2>

      {(status === "loading" || status === "idle") && <Skeletons label={t("loading")} />}

      {status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl px-4 py-4"
          style={{ background: DANGER_BG, color: DANGER_TEXT }}
        >
          <p className="flex items-start gap-2 text-[13px] font-medium leading-snug">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t("loadError")}
          </p>
          <button
            type="button"
            onClick={() => void refreshAddresses()}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-full border bg-white px-4 text-[13px] font-semibold motion-safe:transition hover:bg-[#FFF7F6] ${FOCUS_RING}`}
            style={{ borderColor: "#F2B8B5", color: DANGER_TEXT }}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t("retry")}
          </button>
        </div>
      )}

      {status === "ready" && addresses.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-6 py-7 text-center" style={{ borderColor: RULE }}>
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: BEIGE }}
            aria-hidden
          >
            <MapPin className="h-5 w-5" strokeWidth={1.8} style={{ color: INK }} />
          </span>
          <p className="font-display text-[16px] font-semibold" style={{ color: INK }}>
            {t("emptyTitle")}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("emptyBody")}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className={`${PRIMARY_BUTTON} mt-1`}
            style={{ background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            {t("emptyCta")}
          </button>
        </div>
      )}

      {status === "ready" && addresses.length > 0 && (
        <>
          <p className="text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("hint")}
          </p>
          <ul className="flex flex-col gap-3">
            {addresses.map((address) => {
              const active = address.addressId === activeId;
              const location = locationLine(address);
              return (
                <li key={address.addressId}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveAddressId(address.addressId)}
                    className={`flex w-full flex-col gap-1.5 rounded-2xl border bg-white px-4 py-3.5 text-left motion-safe:transition motion-safe:duration-150 hover:border-[#B9C6D8] hover:bg-[#FBF9F5] ${FOCUS_RING}`}
                    style={{
                      borderColor: active ? INK : RULE,
                      boxShadow: active ? `inset 0 0 0 1px ${INK}` : undefined,
                      background: active ? SELECTED_BG : undefined,
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold leading-snug" style={{ color: INK }}>
                        {address.name || t("unnamed")}
                      </span>
                      {address.isPrimary && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
                          style={{ background: BEIGE, color: INK, letterSpacing: "0.08em" }}
                        >
                          {t("primaryBadge")}
                        </span>
                      )}
                      {active && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase text-white"
                          style={{ background: INK, letterSpacing: "0.08em" }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          {t("activeBadge")}
                        </span>
                      )}
                    </span>
                    {address.description && (
                      <span className="line-clamp-2 text-[13px] leading-snug" style={{ color: TEXT_MUTED }}>
                        {address.description}
                      </span>
                    )}
                    {location && (
                      <span className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: TEXT_MUTED }}>
                        <MapPin className="mt-px h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                        {location}
                      </span>
                    )}
                  </button>
                  {onEdit && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        data-address-edit={address.addressId}
                        aria-label={t("editAria", { name: address.name || t("unnamed") })}
                        onClick={() => onEdit(address)}
                        className={`flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] ${FOCUS_RING}`}
                        style={{ color: INK }}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                        {t("editCta")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
