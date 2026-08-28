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
 * Mapa de fondo para la sección de Contacto: vista plana (top-down, sin tilt
 * ni rotación) para que se lea al instante como "aquí está la bodega", no
 * como un render abstracto. Usa OpenFreeMap (estilo "liberty", ver
 * ajuste-customer-class-y-mapa.md) vía MapLibre GL — sin API key ni
 * facturación. Antes usaba "positron" (deliberadamente pálido/monocromático,
 * pensado para overlays de datos) — se veía "lavado" y se confundía con el
 * fondo beige de la página; "liberty" trae colores reales de fábrica (agua
 * azul, parques verdes, calles con jerarquía) sin necesidad de repintar casi
 * nada.
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
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [site.address.lng, site.address.lat],
      // Vista plana: zoom 17 deja el CEDI como protagonista, con la vía de
      // acceso y las cuadras inmediatas a su alrededor, sin el ruido de
      // calles lejanas que aparecía a zoom 15; pitch/bearing en 0 para que
      // se lea como un mapa de ubicación normal, orientado al norte, no
      // como un render 3D.
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

    // "liberty" ya trae colores reales de fábrica (agua rgb(158,189,255),
    // parques/landcover en verde, casing de calles en naranja tipo mapa de
    // carretera) que se leen bien de entrada, pero para que el mapa se
    // sienta "de Mercasa" y no un OSM genérico insertado sin tratamiento de
    // marca (ver fix-altura-fija-y-mapa-personalizado.md), se repinta la
    // paleta completa hacia los tonos institucionales (navy/beige/verde
    // apagado) en vez de solo el casing de calles. Layer IDs confirmados vía
    // GET https://tiles.openfreemap.org/styles/liberty (111 layers, base
    // completamente distinta a "positron": el casing ya no se llama
    // "highway_major_casing"/"highway_motorway_casing" sino
    // "road_trunk_primary_casing"/"road_motorway_casing").
    map.on("style.load", () => {
      // setPaintProperty exige el nombre de capa en pantalla (getLayer) antes
      // de tocarla, por si el estilo remoto la renombró o quitó.
      const setLineColor = (layerId: string, color: string) => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-color", color);
      };
      const setFillColor = (layerId: string, color: string) => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "fill-color", color);
      };

      if (map.getLayer("background")) {
        map.setPaintProperty("background", "background-color", "#F6F1E6");
      }

      // Agua: de fábrica un celeste pastel genérico (rgb(158,189,255)) — se
      // acerca al azul institucional sin perder lectura como agua real.
      setFillColor("water", "#7FA3D1");

      // Parques/vegetación: de fábrica un verde brillante de mapa turístico
      // — se apaga hacia un verde institucional grisáceo, a juego con el
      // resto de la paleta desaturada del sitio.
      setFillColor("park", "#C7D3BC");
      setFillColor("landcover_wood", "#B9C9AC");
      setFillColor("landcover_grass", "#C3D2B5");

      // Edificios: de fábrica un gris cálido neutro — se corre hacia el
      // mismo beige de marca que el fondo de la sección, para que se sientan
      // parte del mismo mundo visual en vez de "grises de OSM".
      setFillColor("building", "#E4D9C2");
      if (map.getLayer("building-3d")) {
        map.setPaintProperty("building-3d", "fill-extrusion-color", "#E4D9C2");
      }

      setLineColor("road_motorway_casing", "rgba(12,68,124,0.32)");
      setLineColor("road_trunk_primary_casing", "rgba(12,68,124,0.26)");

      // Etiquetas de calles residenciales/de servicio (Avenida 48, Calle 58,
      // etc.) solo generan ruido a esta escala y hacen que el CEDI se pierda
      // entre nombres de vías secundarias — se ocultan, dejando visibles
      // solo las etiquetas de vías principales ("highway-name-major", mismo
      // ID en liberty).
      if (map.getLayer("highway-name-minor")) {
        map.setLayoutProperty("highway-name-minor", "visibility", "none");
      }
    });

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(failSafeTimer);

      // Marcador del CEDI: imagen de marca (gota azul con isotipo, ver
      // globals.css para el detalle de por qué el contenedor mide 51px con
      // una imagen de 56px) y halo pulsante detrás. Sin popup propio: la
      // card flotante de ContactSection ya muestra el nombre y el botón
      // "Cómo llegar" — un popup nativo acá encima duplicaba esa info y
      // tapaba el pin.
      const el = document.createElement("div");
      el.className = "mercasa-map-pin";
      el.innerHTML = `
        <span class="mercasa-map-pin__pulse"></span>
        <img class="mercasa-map-pin__img" src="/brand/Mapa/pin-mapa-sin-fondo.png" alt="" draggable="false" />
      `;
      // anchor "bottom": la punta de la gota (no su centro visual) es la que
      // debe caer exactamente sobre la coordenada del CEDI.
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
