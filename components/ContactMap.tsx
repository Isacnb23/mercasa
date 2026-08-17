"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { site } from "@/lib/data";

// CAUSA RAÍZ del mapa cayendo siempre al fallback de Google: por defecto
// MapLibre resuelve la URL de su web worker como `./maplibre-gl-worker.mjs`
// relativo al `import.meta.url` del propio bundle de maplibre-gl. Una vez que
// Next.js empaqueta ese módulo dentro de sus propios chunks (`_next/static/...`),
// esa URL relativa ya no apunta a nada real — el worker nunca se descarga
// (falla en silencio, sin disparar `map.on("error")`), ninguna tile vectorial
// se llega a parsear, el evento "load" nunca ocurre, y a los 6s el fail-safe
// de abajo cae al iframe de Google creyendo que MapLibre "no cargó".
// Fix: self-hostear los 2 archivos del worker (el segundo es una dependencia
// interna del primero, `maplibre-gl-worker.mjs` hace `import ... from
// "./maplibre-gl-shared.mjs"`) en /public/maplibre — copiados 1:1 desde
// node_modules/maplibre-gl/dist — y apuntar setWorkerUrl() ahí ANTES de
// crear cualquier Map. Si se actualiza la versión de maplibre-gl, hay que
// volver a copiar estos 2 archivos.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/**
 * Mapa de fondo para la sección de Contacto: vista plana (top-down, sin tilt
 * ni rotación) para que se lea al instante como "aquí está la bodega", no
 * como un render abstracto. Usa OpenFreeMap (estilo "dark", ya oscuro por
 * diseño) vía MapLibre GL — sin API key ni facturación.
 *
 * El único marcador y su info viven en la card flotante de ContactSection
 * (no hay popup nativo de MapLibre acá): dos tarjetas mostrando lo mismo se
 * sentía saturado y el popup tapaba el propio pin.
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
      // Vista plana: zoom 15 deja ver las calles principales y el contexto
      // de la zona; pitch/bearing en 0 para que se lea como un mapa de
      // ubicación normal, orientado al norte, no como un render 3D.
      zoom: 15,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      interactive: true,
    });

    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    // Sin rotación: un mapa de "aquí estamos" no necesita que el usuario lo
    // saque de norte-arriba por accidente al arrastrar o pellizcar.
    map.dragRotate.disable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.disableRotation();

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // El estilo "dark" de OpenFreeMap deja las vías casi en el mismo negro
    // que el fondo (fondo rgb(12,12,12); calles en #181818, hsl(0,0%,7%), o
    // incluso #000 en la Interamericana a este zoom) — se lee "apagado", no
    // elegante. Se sube el contraste SOLO de vías/rótulos (lo que hace falta
    // para leer la zona) vía setPaintProperty, en cuanto el estilo remoto
    // termina de cargar — se mantiene el resto del estilo (y el mood oscuro)
    // tal cual lo sirve OpenFreeMap.
    map.on("style.load", () => {
      // setPaintProperty exige el nombre de capa en pantalla (getLayer) antes
      // de tocarla, por si el estilo remoto la renombró o quitó.
      const setLineColor = (layerId: string, color: string) => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-color", color);
      };
      const setTextColor = (layerId: string, color: string) => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "text-color", color);
      };

      // Jerarquía por brillo: cuanto más importante la vía, más clara — igual
      // que cualquier mapa dark-mode legible (Interamericana = motorway =
      // la más brillante).
      setLineColor("highway_path", "#2c3e52");
      setLineColor("highway_minor", "#3d5470");
      setLineColor("highway_major_casing", "rgba(80,110,150,0.85)");
      setLineColor("highway_major_inner", "#7fa8d6");
      setLineColor("highway_major_subtle", "#4a6580");
      setLineColor("highway_motorway_casing", "rgba(90,130,180,0.9)");
      setLineColor("highway_motorway_inner", "#9fc4f0");
      setLineColor("highway_motorway_subtle", "#5580aa");
      setTextColor("highway_name_other", "rgba(150,165,185,0.9)");
      setTextColor("highway_name_motorway", "#bcd4f0");

      // Un toque en agua/edificios para que el "contexto" (qué es calle, qué
      // es agua, qué es construido) también se distinga, sin acercarse al
      // brillo de las vías.
      if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#0f2233");
      if (map.getLayer("building")) {
        map.setPaintProperty("building", "fill-color", "#0e1a2a");
        map.setPaintProperty("building", "fill-outline-color", "#1c3550");
      }
    });

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(failSafeTimer);

      // Marcador del CEDI: pin con halo pulsante en teal, a juego con el
      // sitio. Sin popup propio: la card flotante de ContactSection ya
      // muestra el nombre y el botón "Cómo llegar" — un popup nativo acá
      // encima duplicaba esa info y tapaba el pin.
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
