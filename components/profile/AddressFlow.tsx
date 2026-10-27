"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAddresses } from "@/lib/addresses-context";
import { useAuth } from "@/lib/auth-context";
import type { SavedAddress } from "@/lib/auth-types";
import { classifyDirectionError, matchOptionId, prefillFromSaved, type AddressNotice } from "@/lib/addresses-edit";
import {
  BEIGE,
  DANGER_BG,
  DANGER_TEXT,
  FIELD_CLASS,
  FOCUS_RING,
  INK,
  PRIMARY_BUTTON,
  RULE,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";
import Combobox from "@/components/ui/Combobox";
import type { LatLng } from "./PinMap";

// Leaflet necesita `window`: el mapa solo se renderiza en el navegador.
const PinMap = dynamic(() => import("./PinMap"), { ssr: false });

interface Option {
  id: string;
  name: string;
}

type Step = "map" | "form" | "done";

// Mismo estilo de campos que el formulario de ingreso del perfil.
const inputClass = FIELD_CLASS;

const primaryStyle = { background: INK, boxShadow: "0 10px 22px rgba(8,43,92,0.25)" } as const;

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

// Crear una dirección nueva o, con `editing`, modificar una guardada (mismos pasos, mismas validaciones y mismo mapa, con los
// valores actuales precargados). Al editar NO se puede cambiar la cédula ni la compañía (ni siquiera aparecen: la cuenta sale
// del JWT en el servidor). `onClose` recibe el resultado al terminar una edición para que el panel avise y devuelva el foco.
export default function AddressFlow({
  onClose,
  editing,
}: {
  onClose: (result?: AddressNotice) => void;
  editing?: SavedAddress;
}) {
  const t = useTranslations("Profile.address");
  const { user } = useAuth();
  const { refreshAddresses } = useAddresses();

  const [prefill] = useState(() => (editing ? prefillFromSaved(editing) : null));

  // Editando una dirección con ubicación se empieza en el formulario (con el pin ya puesto); sin ubicación, en el mapa.
  const [step, setStep] = useState<Step>(prefill?.pin ? "form" : "map");
  const [center, setCenter] = useState<LatLng | null>(prefill?.pin ?? null);
  const [pinned, setPinned] = useState<LatLng | null>(prefill?.pin ?? null);

  const [fullName, setFullName] = useState(user?.name ?? "");
  // Lo que eligió el cliente en cada nivel. Al editar, mientras no toque un nivel, se usa el de la dirección guardada
  // (por nombre) en cuanto llega su lista de opciones; al tocar un nivel, ese nivel y los de abajo ya no se prellenan.
  const [provinceSel, setProvinceSel] = useState("");
  const [cantonSel, setCantonSel] = useState("");
  const [districtSel, setDistrictSel] = useState("");
  const [citySel, setCitySel] = useState("");
  const [prefillOffFrom, setPrefillOffFrom] = useState(5);
  const [street, setStreet] = useState(prefill?.street ?? "");
  const [addressName, setAddressName] = useState(prefill?.addressName ?? "");
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // País: GetCountries solo devuelve Costa Rica, se toma directo.
  const countries = useOptions("countries", step === "form" ? "" : null);
  const countryId = countries.options[0]?.id ?? "";

  const prefillOn = (level: number) => prefill !== null && level < prefillOffFrom;
  const disablePrefill = (level: number) => setPrefillOffFrom((from) => Math.min(from, level));

  const provinces = useOptions("provinces", countryId ? `countryId=${countryId}` : null);
  const provinceId = provinceSel || (prefillOn(1) ? matchOptionId(provinces.options, prefill?.provinceName) : "");
  const cantons = useOptions("cantons", provinceId ? `countryId=${countryId}&provinceId=${provinceId}` : null);
  const cantonId = cantonSel || (prefillOn(2) ? matchOptionId(cantons.options, prefill?.cantonName) : "");
  const districts = useOptions(
    "districts",
    cantonId ? `countryId=${countryId}&provinceId=${provinceId}&cantonId=${cantonId}` : null
  );
  const districtId = districtSel || (prefillOn(3) ? matchOptionId(districts.options, prefill?.districtName) : "");
  const cities = useOptions(
    "cities",
    districtId ? `countryId=${countryId}&provinceId=${provinceId}&cantonId=${cantonId}&districtId=${districtId}` : null
  );
  const cityId = citySel || (prefillOn(4) ? matchOptionId(cities.options, prefill?.cityName) : "");

  // Al editar, el foco va al título al abrir el formulario (y al volver del mapa).
  useEffect(() => {
    if (editing && step === "form") titleRef.current?.focus();
  }, [editing, step]);

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
      const res = await fetch(editing ? `/api/directions/${editing.addressId}` : "/api/directions", {
        method: editing ? "PUT" : "POST",
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
        if (editing) {
          // Lo escrito se conserva (el estado sigue aquí): solo se muestra el aviso.
          const kind = classifyDirectionError(res.status, data);
          if (kind === "notFound") {
            // La dirección ya no existe: se actualiza la lista y se vuelve a ella con un aviso.
            await refreshAddresses();
            onClose("notFound");
            return;
          }
          setError(kind === "session" ? t("sessionExpired") : kind === "validation" ? t("editValidationError") : t("editSaveError"));
          return;
        }
        setError(
          res.status === 401 ? t("sessionExpired") : ((data as { error?: string }).error ?? t("saveError"))
        );
        return;
      }

      if (editing) {
        // Se espera a la lista nueva para volver a ella con la dirección ya actualizada (si falla, la lista muestra su error).
        await refreshAddresses();
        onClose("saved");
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
      className={`-ml-2 flex min-h-[40px] items-center gap-1.5 self-start rounded-full px-2 text-[13px] font-semibold motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] ${FOCUS_RING}`}
      style={{ color: INK }}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
      {t("back")}
    </button>
  );

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white px-8 py-10 text-center" style={{ borderColor: RULE }}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: BEIGE }} aria-hidden>
          <CheckCircle2 className="h-9 w-9 text-emerald-700" strokeWidth={1.6} />
        </span>
        <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
          {t("savedTitle")}
        </p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          {t("savedBody")}
        </p>
        <button type="button" onClick={() => onClose()} className={`${PRIMARY_BUTTON} mt-1`} style={primaryStyle}>
          {t("done")}
        </button>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="flex flex-col gap-4">
        {backButton(() => (editing && prefill?.pin ? setStep("form") : onClose()))}
        <div>
          <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
            {t("mapTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
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
          className={PRIMARY_BUTTON}
          style={primaryStyle}
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
    <Combobox
      id={id}
      label={label}
      value={value}
      options={state.options}
      onChange={onChange}
      disabled={locked}
      loading={state.loading}
      error={state.failed ? t("optionsError") : null}
      placeholder={t("selectPlaceholder")}
      loadingText={t("loadingOptions")}
      searchPlaceholder={t("searchPlaceholder")}
      emptyText={t("noResults")}
    />
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {backButton(() => (editing ? onClose() : setStep("map")))}
      <div>
        <h3 ref={titleRef} tabIndex={-1} className="font-display text-[17px] font-semibold outline-none" style={{ color: INK }}>
          {editing ? t("editTitle") : t("formTitle")}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[12.5px]" style={{ color: TEXT_MUTED }}>
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {t("pinnedAt", { lat: pinned?.lat.toFixed(5) ?? "", lng: pinned?.lng.toFixed(5) ?? "" })}
        </p>
        {editing && (
          <button
            type="button"
            onClick={() => setStep("map")}
            className={`mt-1 rounded text-[12.5px] font-semibold underline underline-offset-4 ${FOCUS_RING}`}
            style={{ color: "#075FD8" }}
          >
            {t("changePin")}
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold" style={{ color: INK }}>
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
        <span className="text-[12px] font-semibold" style={{ color: INK }}>
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
          setProvinceSel(v);
          setCantonSel("");
          setDistrictSel("");
          setCitySel("");
          disablePrefill(1);
        },
        provinces,
        !countryId
      )}
      {selectField(
        "canton",
        t("cantonLabel"),
        cantonId,
        (v) => {
          setCantonSel(v);
          setDistrictSel("");
          setCitySel("");
          disablePrefill(2);
        },
        cantons,
        !provinceId
      )}
      {selectField(
        "district",
        t("districtLabel"),
        districtId,
        (v) => {
          setDistrictSel(v);
          setCitySel("");
          disablePrefill(3);
        },
        districts,
        !cantonId
      )}

      {/* Ciudad: solo si el distrito tiene; sin ciudad queda "no aplica". */}
      {cityResolved && !cityApplies ? (
        <p className="rounded-xl px-4 py-3 text-[12.5px]" style={{ background: BEIGE, color: TEXT_MUTED }}>
          {t("cityNotApplicable")}
        </p>
      ) : (
        selectField(
          "city",
          t("cityLabel"),
          cityId,
          (v) => {
            setCitySel(v);
            disablePrefill(4);
          },
          cities,
          !districtId
        )
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold" style={{ color: INK }}>
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
        <span className="text-[12px] font-semibold" style={{ color: INK }}>
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
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] font-medium leading-snug"
          style={{ background: DANGER_BG, color: DANGER_TEXT }}
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`${PRIMARY_BUTTON} mt-1`}
        style={primaryStyle}
      >
        {submitting ? t("saving") : editing ? t("saveChangesCta") : t("saveCta")}
      </button>
    </form>
  );
}
