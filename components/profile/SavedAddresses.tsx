"use client";

import { Check, MapPin, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveAddress, useAddresses } from "@/lib/addresses-context";
import type { SavedAddress } from "@/lib/auth-types";

// Mismos valores que ProfileDrawer.tsx.
const INK = "#082B5C";
const MUTED = "#8493A5";
const RULE = "#E2E8F0";
const BEIGE = "#F1ECE4";
const GOLD = "#FFD21A";

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
    <div className="flex flex-col gap-2.5" role="status" aria-busy="true" aria-label={label}>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-2xl px-4 py-4 motion-safe:animate-pulse"
          style={{ background: BEIGE }}
          aria-hidden
        >
          <span className="h-3.5 w-2/5 rounded-full bg-black/10" />
          <span className="h-3 w-4/5 rounded-full bg-black/[0.07]" />
          <span className="h-3 w-3/5 rounded-full bg-black/[0.07]" />
        </div>
      ))}
    </div>
  );
}

export default function SavedAddresses({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("Profile.addresses");
  const { addresses, status, refreshAddresses } = useAddresses();
  const { addressId: activeId, setActiveAddressId } = useActiveAddress();

  return (
    <section aria-labelledby="saved-addresses-title" className="flex flex-col gap-3">
      <h2 id="saved-addresses-title" className="font-display text-[15px] font-semibold" style={{ color: INK }}>
        {t("title")}
      </h2>

      {(status === "loading" || status === "idle") && <Skeletons label={t("loading")} />}

      {status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl px-4 py-4"
          style={{ background: "#FDECEC", color: "#B3261E" }}
        >
          <p className="text-[13px] font-medium">{t("loadError")}</p>
          <button
            type="button"
            onClick={() => void refreshAddresses()}
            className="flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075FD8]"
            style={{ borderColor: "#F2B8B5", color: "#B3261E" }}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t("retry")}
          </button>
        </div>
      )}

      {status === "ready" && addresses.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl px-6 py-7 text-center" style={{ background: BEIGE }}>
          <p className="font-display text-[15px] font-semibold" style={{ color: INK }}>
            {t("emptyTitle")}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#5C6B7D" }}>
            {t("emptyBody")}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white transition duration-300 hover:brightness-110 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075FD8]"
            style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)` }}
          >
            <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t("emptyCta")}
          </button>
        </div>
      )}

      {status === "ready" && addresses.length > 0 && (
        <>
          <p className="text-[12.5px]" style={{ color: MUTED }}>
            {t("hint")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {addresses.map((address) => {
              const active = address.addressId === activeId;
              const location = locationLine(address);
              return (
                <li key={address.addressId}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveAddressId(address.addressId)}
                    className="flex w-full flex-col gap-1.5 rounded-2xl border bg-white px-4 py-3.5 text-left transition duration-200 hover:bg-black/[0.015] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075FD8]"
                    style={{
                      borderColor: active ? GOLD : RULE,
                      boxShadow: active ? `inset 0 0 0 1.5px ${GOLD}` : undefined,
                      background: active ? "#FFFBEA" : undefined,
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14px] font-semibold" style={{ color: INK }}>
                        {address.name || t("unnamed")}
                      </span>
                      {address.isPrimary && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
                          style={{ background: INK, color: "#fff", letterSpacing: "0.08em" }}
                        >
                          {t("primaryBadge")}
                        </span>
                      )}
                      {active && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
                          style={{ background: GOLD, color: INK, letterSpacing: "0.08em" }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          {t("activeBadge")}
                        </span>
                      )}
                    </span>
                    {address.description && (
                      <span className="text-[13px] leading-snug" style={{ color: "#5C6B7D" }}>
                        {address.description}
                      </span>
                    )}
                    {location && (
                      <span className="text-[12px] leading-snug" style={{ color: MUTED }}>
                        {location}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
