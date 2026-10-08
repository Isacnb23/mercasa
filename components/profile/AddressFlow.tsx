"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAddresses } from "@/lib/addresses-context";
import { useAuth } from "@/lib/auth-context";
import type { LatLng } from "./PinMap";

// Leaflet necesita `window`: el mapa solo se renderiza en el navegador.
const PinMap = dynamic(() => import("./PinMap"), { ssr: false });

// Mismos valores de color que ProfileDrawer.
const INK = "#082B5C";
const MUTED = "#8493A5";
const RULE = "#E2E8F0";
const BEIGE = "#F1ECE4";

interface Option {
  id: string;
  name: string;
}

type Step = "map" | "form" | "done";

const inputClass =
  "rounded-2xl border px-4 py-3 text-[14px] outline-none transition focus:border-[#075FD8] disabled:cursor-not-allowed disabled:bg-[#F7F8FA] disabled:opacity-70";

// Pide un nivel de los dropdowns geográficos a través del BFF
// (/api/location/*). `null` como query = nivel bloqueado (falta el anterior).
function useOptions(level: string, query: string | null) {
  // El resultado se guarda junto con la query que lo produjo: si la query
  // cambia, el resultado viejo deja de valer sin tener que limpiar estado
  // dentro del efecto ("loading" = hay query y aún no llegó su resultado).
  const [result, setResult] = useState<{ query: string; options: Option[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (query === null) return;

    let cancelled = false;
    fetch(`/api/location/${level}${query ? `?${query}` : ""}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Option[]) => {
        if (!cancelled) setResult({ query, options: data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ query, options: [], failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [level, query]);

  const current = query !== null && result?.query === query ? result : null;
  return {
    options: current?.options ?? [],
    loading: query !== null && current === null,
    failed: current?.failed ?? false,
  };
}

export default function AddressFlow({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Profile.address");
  const { user } = useAuth();
  const { refreshAddresses } = useAddresses();

  const [step, setStep] = useState<Step>("map");
  const [center, setCenter] = useState<LatLng | null>(null);
  const [pinned, setPinned] = useState<LatLng | null>(null);

  const [fullName, setFullName] = useState(user?.name ?? "");
  const [provinceId, setProvinceId] = useState("");
  const [cantonId, setCantonId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [street, setStreet] = useState("");
  const [addressName, setAddressName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // País: GetCountries solo devuelve Costa Rica, se toma directo.
  const countries = useOptions("countries", step === "form" ? "" : null);
  const countryId = countries.options[0]?.id ?? "";

  const provinces = useOptions("provinces", countryId ? `countryId=${countryId}` : null);
  const cantons = useOptions("cantons", provinceId ? `countryId=${countryId}&provinceId=${provinceId}` : null);
  const districts = useOptions(
    "districts",
    cantonId ? `countryId=${countryId}&provinceId=${provinceId}&cantonId=${cantonId}` : null
  );
  const cities = useOptions(
    "cities",
    districtId ? `countryId=${countryId}&provinceId=${provinceId}&cantonId=${cantonId}&districtId=${districtId}` : null
  );

  // Un distrito sin ciudad devuelve [] (respuesta válida, no error): la
  // ciudad queda "no aplica" y no bloquea el resto del formulario.
  const cityApplies = cities.options.length > 0;
  const cityResolved = districtId !== "" && !cities.loading && !cities.failed;

  const selectedName = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.name ?? "";

  const canSubmit =
    !submitting &&
    pinned !== null &&
    fullName.trim() !== "" &&
    provinceId !== "" &&
    cantonId !== "" &&
    districtId !== "" &&
    cityResolved &&
    (!cityApplies || cityId !== "") &&
    street.trim() !== "" &&
    addressName.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !pinned) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          province: selectedName(provinces.options, provinceId),
          canton: selectedName(cantons.options, cantonId),
          district: selectedName(districts.options, districtId),
          city: cityApplies ? selectedName(cities.options, cityId) : "",
          // Mapeo confirmado contra el backend real: street = señas,
          // address = nombre de la dirección.
          street: street.trim(),
          address: addressName.trim(),
          postalName: addressName.trim(),
          latitude: pinned.lat,
          longitude: pinned.lng,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          res.status === 401 ? t("sessionExpired") : ((data as { error?: string }).error ?? t("saveError"))
        );
        return;
      }
      // Recarga la lista de "Mis direcciones"; si falla, ese listado muestra su
      // propio error con "Reintentar" y el guardado ya hecho no se ve afectado.
      void refreshAddresses();
      setStep("done");
    } catch {
      setError(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 self-start text-[13px] font-semibold"
      style={{ color: INK }}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
      {t("back")}
    </button>
  );

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[24px] px-8 py-10 text-center" style={{ background: BEIGE }}>
        <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.6} aria-hidden />
        <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
          {t("savedTitle")}
        </p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "#5C6B7D" }}>
          {t("savedBody")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-6 py-3 text-[14px] font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)` }}
        >
          {t("done")}
        </button>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="flex flex-col gap-4">
        {backButton(onClose)}
        <div>
          <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
            {t("mapTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "#5C6B7D" }}>
            {t("mapHint")}
          </p>
        </div>
        <PinMap onCenterChange={setCenter} initialCenter={pinned} />
        <button
          type="button"
          disabled={!center}
          onClick={() => {
            setPinned(center);
            setStep("form");
          }}
          className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)`, boxShadow: "0 12px 24px rgba(8,43,92,0.28)" }}
        >
          <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t("pinCta")}
        </button>
      </div>
    );
  }

  const selectField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    state: { options: Option[]; loading: boolean; failed: boolean },
    locked: boolean
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
        {label}
      </span>
      <select
        id={id}
        required
        value={value}
        disabled={locked || state.loading || state.options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        style={{ borderColor: RULE, color: INK }}
      >
        <option value="">{state.loading ? t("loadingOptions") : t("selectPlaceholder")}</option>
        {state.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {state.failed && (
        <span className="text-[12px]" style={{ color: "#B3261E" }}>
          {t("optionsError")}
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {backButton(() => setStep("map"))}
      <div>
        <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
          {t("formTitle")}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTED }}>
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {t("pinnedAt", { lat: pinned?.lat.toFixed(5) ?? "", lng: pinned?.lng.toFixed(5) ?? "" })}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
          {t("fullNameLabel")}
        </span>
        <input
          type="text"
          required
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          style={{ borderColor: RULE, color: INK }}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
          {t("countryLabel")}
        </span>
        <input
          type="text"
          value={countries.options[0]?.name ?? ""}
          disabled
          readOnly
          className={inputClass}
          style={{ borderColor: RULE, color: INK }}
        />
      </label>

      {selectField(
        "province",
        t("provinceLabel"),
        provinceId,
        (v) => {
          setProvinceId(v);
          setCantonId("");
          setDistrictId("");
          setCityId("");
        },
        provinces,
        !countryId
      )}
      {selectField(
        "canton",
        t("cantonLabel"),
        cantonId,
        (v) => {
          setCantonId(v);
          setDistrictId("");
          setCityId("");
        },
        cantons,
        !provinceId
      )}
      {selectField(
        "district",
        t("districtLabel"),
        districtId,
        (v) => {
          setDistrictId(v);
          setCityId("");
        },
        districts,
        !cantonId
      )}

      {/* Ciudad: solo si el distrito tiene; sin ciudad queda "no aplica". */}
      {cityResolved && !cityApplies ? (
        <p className="rounded-2xl px-4 py-3 text-[12.5px]" style={{ background: BEIGE, color: "#5C6B7D" }}>
          {t("cityNotApplicable")}
        </p>
      ) : (
        selectField("city", t("cityLabel"), cityId, setCityId, cities, !districtId)
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
          {t("streetLabel")}
        </span>
        <textarea
          required
          rows={2}
          maxLength={200}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder={t("streetPlaceholder")}
          className={inputClass}
          style={{ borderColor: RULE, color: INK }}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>
          {t("addressNameLabel")}
        </span>
        <input
          type="text"
          required
          maxLength={100}
          value={addressName}
          onChange={(e) => setAddressName(e.target.value)}
          placeholder={t("addressNamePlaceholder")}
          className={inputClass}
          style={{ borderColor: RULE, color: INK }}
        />
      </label>

      {error && (
        <p className="rounded-xl px-4 py-2.5 text-[13px] font-medium" style={{ background: "#FDECEC", color: "#B3261E" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 flex items-center justify-center gap-2.5 rounded-full py-3.5 text-[15px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{ background: `linear-gradient(135deg, ${INK}, #0B3A78)`, boxShadow: "0 12px 24px rgba(8,43,92,0.28)" }}
      >
        {submitting ? t("saving") : t("saveCta")}
      </button>
    </form>
  );
}
