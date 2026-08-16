"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { site } from "@/lib/data";

/**
 * Mapa 3D de fondo para la sección de Contacto.
 *
 * Usa OpenFreeMap (estilo "dark", ya oscuro por diseño) vía MapLibre GL — sin
 * API key ni facturación. Los edificios en 3D no vienen incluidos en este
 * estilo, así que se agrega una capa `fill-extrusion` propia sobre la fuente
 * vectorial "openmaptiles" (esquema OpenMapTiles estándar: capa "building",
 * alturas en `render_height`/`render_min_height`), coloreada en teal/navy
 * para que combine con la paleta del sitio.
 *
 * Si el servicio de tiles no carga (red restringida, bloqueo de terceros),
 * cae a un iframe simple de Google Maps para que la sección nunca quede vacía.
 */
export default function ContactMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let loaded = false;

    // Salvavidas: en redes restringidas (proxy corporativo, firewall) la
    // petición al tile server a veces queda "colgada" en vez de disparar un
    // error limpio — el mapa se queda con el lienzo negro para siempre. Si
    // no terminó de cargar en 6s, se fuerza el fallback a Google Maps para
    // que la sección nunca se quede con un recuadro vacío.
    const failSafeTimer = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 6000);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [site.address.lng, site.address.lat],
      zoom: 16.6,
      pitch: 58,
      bearing: -22,
      attributionControl: false,
      interactive: true,
    });

    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.enable();
    map.dragRotate.enable();

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(failSafeTimer);

      // Edificios en 3D: el estilo "dark" solo trae la huella plana ("building"),
      // así que agregamos la extrusión encima, justo antes de las capas de
      // aeropuerto/vías para que quede debajo de calles y rótulos.
      if (map.getSource("openmaptiles") && !map.getLayer("mercasa-buildings-3d")) {
        map.addLayer(
          {
            id: "mercasa-buildings-3d",
            type: "fill-extrusion",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "render_height"], 5],
                0,
                "#123249",
                20,
                "#1a4562",
                60,
                "#2851c9",
              ],
              "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": 0.88,
            },
          },
          map.getLayer("aeroway-taxiway") ? "aeroway-taxiway" : undefined
        );
      }

      // Marcador del CEDI: pin con halo pulsante en teal, a juego con el sitio.
      const el = document.createElement("div");
      el.className = "mercasa-map-pin";
      el.innerHTML = `
        <span class="mercasa-map-pin__pulse"></span>
        <span class="mercasa-map-pin__dot"></span>
      `;
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([site.address.lng, site.address.lat])
        .addTo(map);
    });

    map.on("error", () => {
      if (!loaded) setFailed(true);
    });

    return () => {
      window.clearTimeout(failSafeTimer);
      map.remove();
    };
  }, []);

  if (failed) {
    // Fallback: pin en las coordenadas EXACTAS del CEDI (no una búsqueda por
    // nombre de pueblo, que caería en el centro del poblado). `q=lat,lng` deja
    // el marcador rojo justo sobre el punto de Mercasa.
    const mapSrc = `https://www.google.com/maps?q=${site.address.lat},${site.address.lng}&z=17&output=embed`;
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <iframe
          title="Ubicación de Mercasa en El Guarco, Cartago"
          src={mapSrc}
          className="h-full w-full opacity-90 grayscale-[20%]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden">
      <div ref={containerRef} className="mercasa-map h-full w-full" />
    </div>
  );
}
