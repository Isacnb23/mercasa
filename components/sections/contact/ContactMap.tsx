"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
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
 * Mapa de fondo para la sección de Contacto: usa OpenFreeMap, estilo
 * "positron" (ver rediseno-exacto-hablemos-de-negocios.md). Historia de
 * este valor, va y viene:
 * - Originalmente "positron" — se descartó por "lavado"/muy monocromático.
 * - Se pasó a "liberty" con paleta institucional (navy/beige, ver
 *   fix-altura-fija-y-mapa-personalizado.md) y después a colores tipo
 *   Google Maps (ver rediseno-contacto-y-mapa.md).
 * - Ahora la referencia exacta que Isaac compartió pide justo lo que antes
 *   se había descartado: un mapa pálido/casi monocromático, estilo "reporte
 *   editorial" — así que se vuelve a "positron" a propósito. Sus valores de
 *   fábrica (fondo rgb(242,243,240), agua/parques/edificios en grises muy
 *   claros, casing de autopista gris claro sin color saturado, labels en
 *   #666 con halo blanco) YA SON exactamente la paleta pedida — no hace
 *   falta repintar nada acá, a diferencia de los estilos anteriores.
 *
 * pitch 0 (antes 45°, ver fix-mapa-relieve.md): ese pitch existía solo para
 * que se notara el relieve de la capa `building-3d` (fill-extrusion) de
 * "liberty" — "positron" no tiene esa capa (edificios son un fill 2D plano,
 * sin altura), así que un pitch inclinado acá no revelaría relieve alguno,
 * solo inclinaría un plano vacío. La referencia además es explícitamente
 * una vista plana de arriba, tipo mapa impreso — pitch 0 es lo correcto acá.
 *
 * El único marcador y su info viven en la card flotante de ContactSection
 * (no hay popup nativo de MapLibre acá): dos tarjetas mostrando lo mismo se
 * sentía saturado y el popup tapaba el propio pin.
 *
 * Si el servicio de tiles no carga (red restringida, bloqueo de terceros),
 * cae a un iframe simple de Google Maps para que la sección nunca quede vacía.
 */
export default function ContactMap() {
  const t = useTranslations("ContactMap");
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let loaded = false;

    // Salvavidas: en redes restringidas (proxy corporativo, firewall) la
    // petición al tile server a veces queda "colgada" en vez de disparar un
    // error limpio — el mapa se queda con el lienzo negro para siempre. Si
    // no terminó de cargar en 16s, se fuerza el fallback a Google Maps para
    // que la sección nunca se quede con un recuadro vacío. Antes eran 6s:
    // medido en la práctica (ver fix-altura-fija-y-mapa-personalizado.md),
    // el worker + las tiles vectoriales de la vista inicial pueden tardar
    // 10-13s en una conexión fría/con proxy — con 6s el fail-safe disparaba
    // ANTES de que el mapa real terminara de cargar, y el usuario terminaba
    // viendo siempre el fallback de Google (pin rojo genérico) creyendo que
    // el mapa personalizado nunca se había aplicado.
    const failSafeTimer = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 16000);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [site.address.lng, site.address.lat],
      // zoom 17 deja el CEDI como protagonista, con la vía de acceso y las
      // cuadras inmediatas a su alrededor, sin el ruido de calles lejanas que
      // aparecía a zoom 15. pitch/bearing en 0 (ver comentario arriba): vista
      // plana de arriba, orientada al norte, tipo mapa impreso.
      zoom: 17,
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

    // Sin repintar nada acá a propósito (ver rediseno-exacto-hablemos-de-
    // negocios.md): la paleta de fábrica de "positron" (fondo gris muy claro,
    // agua/parques/edificios en grises pálidos, casing de autopista gris
    // claro, labels chicos en #666) YA ES la paleta pálida/editorial pedida.
    // Los fixes anteriores necesitaban repintar porque el estilo base
    // ("liberty") traía colores vivos — acá sería trabajo de más, y el
    // riesgo de no matchear "exacto" es mayor que dejarlo tal cual viene.
    // Layer IDs confirmados vía GET
    // https://tiles.openfreemap.org/styles/positron (55 layers — nombres de
    // casing "highway_major_casing"/"highway_motorway_casing", distintos de
    // los "road_..._casing" de "liberty").

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(failSafeTimer);

      // Marcador del CEDI: círculo navy sólido con ícono de ubicación blanco
      // y una colita triangular abajo apuntando al punto exacto (ver
      // rediseno-exacto-hablemos-de-negocios.md — reemplaza la gota/pin
      // clásico anterior, ver globals.css .mercasa-map-pin__circle/__tail
      // para las medidas). Halo pulsante detrás, anclado en la punta de la
      // colita. Sin popup propio: la card flotante de ContactSection ya
      // muestra el nombre y el link "Abrir en Google Maps" — un popup nativo
      // acá encima duplicaba esa info y tapaba el marcador.
      const el = document.createElement("div");
      el.className = "mercasa-map-pin";
      el.innerHTML = `
        <span class="mercasa-map-pin__pulse"></span>
        <span class="mercasa-map-pin__circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <span class="mercasa-map-pin__tail"></span>
      `;
      // anchor "bottom": la punta de la colita (no el centro del círculo) es
      // la que debe caer exactamente sobre la coordenada del CEDI.
      new maplibregl.Marker({ element: el, anchor: "bottom" })
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
          title={t("iframeTitle")}
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
