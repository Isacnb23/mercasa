"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// Mapa Leaflet + OpenStreetMap con pin FIJO en el centro (mismo patrón que la
// app de HomeX Express): el usuario mueve el mapa, no el pin. En cada evento
// `move` se recalcula lat/lng con map.getCenter(), así que el pin no es un
// marker de Leaflet sino un overlay CSS — evita además el problema de los
// íconos por defecto de Leaflet con los bundlers.

// San José centro, por si el navegador no da (o el usuario niega) la geolocalización.
const DEFAULT_CENTER: [number, number] = [9.9281, -84.0907];
const INITIAL_ZOOM = 15;

const INK = "#082B5C";
const GOLD = "#FFD21A";

export interface LatLng {
  lat: number;
  lng: number;
}

interface PinMapProps {
  onCenterChange: (center: LatLng) => void;
  initialCenter?: LatLng | null;
}

export default function PinMap({ onCenterChange, initialCenter }: PinMapProps) {
  const t = useTranslations("Profile.address");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    // Leaflet toca `window` al importarse: se carga solo en el navegador.
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const start: [number, number] = initialCenter ? [initialCenter.lat, initialCenter.lng] : DEFAULT_CENTER;
      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(start, INITIAL_ZOOM);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const emit = () => {
        if (!map) return;
        const c = map.getCenter();
        onCenterChangeRef.current({ lat: c.lat, lng: c.lng });
      };
      map.on("move", emit);
      emit();

      // Centrar en la ubicación del navegador si hay (y no se vino con una
      // ubicación previa ya fijada).
      if (!initialCenter && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) map?.setView([pos.coords.latitude, pos.coords.longitude], INITIAL_ZOOM);
          },
          () => {
            if (!cancelled) setGeoDenied(true);
          },
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // initialCenter solo importa al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setGeoDenied(false);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], INITIAL_ZOOM);
      },
      () => {
        setLocating(false);
        setGeoDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[340px] overflow-hidden rounded-[20px] border" style={{ borderColor: "#E2E8F0" }}>
        <div ref={containerRef} className="absolute inset-0 z-0" />

        {/* Pin fijo: la punta queda exactamente en el centro del mapa. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" aria-hidden>
          <svg width="36" height="46" viewBox="0 0 36 46" fill="none">
            <path
              d="M18 45C18 45 33 29.5 33 17.5C33 9.2 26.3 2.5 18 2.5C9.7 2.5 3 9.2 3 17.5C3 29.5 18 45 18 45Z"
              fill={INK}
              stroke="#fff"
              strokeWidth="2"
            />
            <circle cx="18" cy="17.5" r="6" fill={GOLD} />
          </svg>
        </div>

        <button
          type="button"
          onClick={goToMyLocation}
          disabled={locating}
          aria-label={t("myLocation")}
          title={t("myLocation")}
          className="absolute bottom-3 right-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#F1ECE4] disabled:opacity-60"
        >
          <LocateFixed className="h-5 w-5" strokeWidth={2} style={{ color: INK }} aria-hidden />
        </button>
      </div>

      {geoDenied && (
        <p className="text-[12.5px]" style={{ color: "#8493A5" }}>
          {t("geoDenied")}
        </p>
      )}
    </div>
  );
}
