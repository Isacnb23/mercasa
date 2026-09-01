"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ContactSite } from "@/lib/data";

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

// Estilo VECTORIAL "liberty" de OpenFreeMap (ver mapa-vectorial-detallado-
// final.md — se probaron satelital y relieve pálido antes, ninguno convenció).
const LIBERTY_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Rediseño final según `reference/mapa-target.png` (ver mapa-rediseno-
// referencia-final.md): a diferencia de las rondas anteriores (mapa-
// contraste-detalle.md), la identidad de marca ya NO vive en recolorear
// agresivamente las 111 capas del mapa base — vive en el badge, el marcador
// y la tarjeta de info (ver ContactSection.tsx), todos navy sólido. El mapa
// de fondo vuelve a ser pálido/minimalista: fondo casi blanco, avenidas
// principales en beige suave, calles secundarias en líneas grises finas,
// edificios en beige muy claro, labels en gris oscuro (NO navy).
const NAVY = "#0B315E"; // badge, marcador, acentos de marca — no se usa para el mapa base
const INK = "#33322F"; // labels de texto (calles, lugares, POIs): gris oscuro/negro suave
const ROAD_MAJOR = "#D9C6A0"; // avenidas principales (ej. ruta 2): beige suave
const ROAD_SECONDARY = "#A8A8A2"; // calles secundarias: línea gris fina
const ROAD_MINOR = "#C7C7C2"; // calles menores/residenciales: un escalón más claro
const ROAD_MUTED = "#D6D6D0"; // service/track, superficie peatonal, aeroway: el escalón más discreto
const PATH_RAIL = "#B8AE9C"; // senderos/peatonal y ferrocarril, casi invisibles a propósito
const BUILDING = "#EFE3CE"; // edificios: beige muy claro
const PARK = "#E3ECDD"; // parques: verde pálido, distinto del beige de edificios
const PARK_LINE = "#C9D9BE";
const LANDUSE = "#F5F3EE"; // terreno genérico: casi igual al fondo, es el "vacío"
const WHITE = "#FAFAF8"; // fondo general del lienzo + casing de vías + halo de texto
const WATER = "#DCE3EC"; // agua: azul-gris pálido
const WATER_LINE = "#B7C4D4";

// "Falta nivel de detalle" (rondas anteriores) — revisado otra vez: ninguna
// capa de edificios/POI está apagada por el recoloreado (nunca se toca
// `visibility` ni `*-opacity`, sólo colores). Los edificios (minzoom 13) y
// los 3 niveles de POI (poi_r1/r7/r20, minzoom 15/16/17) siguen activos al
// zoom 17 que usa este mapa.
//
// Recolorea una capa del estilo "liberty" de fábrica con la paleta de arriba,
// por REGLA (id/source-layer), no capa por capa a mano — son 111 capas (58
// solo de líneas de transporte, separadas por clase de vía y puente/túnel/
// superficie) y casi todas son variantes de las mismas ~15 categorías
// visuales. `setPaintProperty` reemplaza por completo cualquier expresión de
// color de fábrica (ninguna acá depende de zoom, es un color plano) — más
// simple y predecible que tratar de preservar sus rampas.
function recolorLibertyLayer(map: maplibregl.Map, layer: { id: string; type: string; "source-layer"?: string }) {
  const { id, type } = layer;
  const sourceLayer = layer["source-layer"];
  // `as never`: setPaintProperty tipa el nombre de propiedad según el type
  // exacto de CADA capa (union muy estricta) — este helper es deliberadamente
  // genérico (una sola función para fill/line/fill-extrusion/symbol/
  // background), así que no hay forma de que TS lo infiera bien acá.
  const set = (prop: string, value: string) => map.setPaintProperty(id, prop as never, value as never);

  if (id === "background") return set("background-color", WHITE);
  if (sourceLayer === "water" && type === "fill") return set("fill-color", WATER);
  if (sourceLayer === "waterway") return set("line-color", WATER_LINE);
  if (id.startsWith("water_name") || id === "waterway_line_label") {
    set("text-color", INK);
    return set("text-halo-color", WHITE);
  }
  if (sourceLayer === "park") {
    return type === "fill" ? set("fill-color", PARK) : set("line-color", PARK_LINE);
  }
  if (sourceLayer === "landuse" || sourceLayer === "landcover") return set("fill-color", LANDUSE);
  if (sourceLayer === "building") {
    if (type === "fill-extrusion") return set("fill-extrusion-color", BUILDING);
    set("fill-color", BUILDING);
    return set("fill-outline-color", "rgba(60,50,35,0.15)");
  }
  if (sourceLayer === "aeroway") return type === "fill" ? set("fill-color", ROAD_MUTED) : set("line-color", ROAD_MUTED);
  if (id === "road_area_pattern") return set("fill-color", ROAD_MUTED);
  if (sourceLayer === "transportation" && (type === "line" || type === "fill")) {
    const casing = id.includes("casing");
    if (id.includes("motorway") || id.includes("trunk_primary")) return set("line-color", casing ? WHITE : ROAD_MAJOR);
    if (id.includes("secondary_tertiary") || id.includes("_link")) return set("line-color", casing ? WHITE : ROAD_SECONDARY);
    if (id.includes("minor") || id.includes("street")) return set("line-color", casing ? WHITE : ROAD_MINOR);
    if (id.includes("service_track")) return set("line-color", ROAD_MUTED);
    if (id.includes("path_pedestrian")) return set("line-color", PATH_RAIL);
    if (id.includes("rail")) return set("line-color", PATH_RAIL);
    return; // road_one_way_arrow(_opposite): símbolo/ícono, sin color de línea que tocar
  }
  if (sourceLayer === "transportation_name" || sourceLayer === "poi" || sourceLayer === "aerodrome_label") {
    set("text-color", INK);
    return set("text-halo-color", WHITE);
  }
  if (sourceLayer === "place") {
    set("text-color", INK);
    return set("text-halo-color", WHITE);
  }
  if (sourceLayer === "boundary") return set("line-color", "rgba(80,80,75,0.25)");
}

/**
 * Mapa de fondo para la sección de Contacto: vectorial "liberty" recoloreado
 * en tono pálido/minimalista (ver comentario arriba) — la identidad de marca
 * (navy sólido) vive en el badge flotante de acá abajo, el marcador y la
 * tarjeta de info en ContactSection.tsx, no en el mapa base.
 *
 * Controles: zoom +/-, geolocalización ("centrar en mi ubicación") y
 * pantalla completa apilados arriba a la derecha; barra de escala abajo a la
 * izquierda; atribución simplificada a una sola línea abajo a la derecha.
 *
 * Si el servicio de tiles no carga (red restringida, bloqueo de terceros),
 * cae a un iframe simple de Google Maps para que la sección nunca quede
 * vacía — este mecanismo de fallback NO se toca acá (ver mapa-rediseno-
 * referencia-final.md, sección "Mantener").
 */
export default function ContactMap({ site }: { site: ContactSite }) {
  const t = useTranslations("ContactMap");
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Última sede recibida, leída dentro de closures que no pueden depender de
  // `site` sin recrear el mapa entero (ver comentario del useEffect de abajo)
  // — se mantiene actualizada en cada render, sin efecto propio.
  const siteRef = useRef(site);
  siteRef.current = site;
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

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
      style: LIBERTY_STYLE_URL,
      center: [site.address.lng, site.address.lat],
      // zoom 16 (antes 17, ver mapa-zoom-inicial.md): a zoom 17 el pin
      // quedaba muy pegado/cerca, sin aire alrededor — un nivel menos deja
      // el marcador bien centrado con contexto real (calles y cuadras
      // cercanas) sin perder la referencia inmediata de la zona. Un único
      // valor de zoom vive en el mapa (no se resetea por sede): el efecto
      // de abajo que mueve el mapa al cambiar de sede solo cambia `center`
      // vía flyTo/jumpTo, así que este mismo valor aplica igual a las dos.
      // pitch/bearing en 0 (ver comentario arriba): vista plana de arriba,
      // orientada al norte, tipo mapa impreso.
      zoom: 16,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      interactive: true,
    });
    mapRef.current = map;

    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    // Sin rotación: un mapa de "aquí estamos" no necesita que el usuario lo
    // saque de norte-arriba por accidente al arrastrar o pellizcar.
    map.dragRotate.disable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.disableRotation();

    // Atribución simplificada a una sola línea corta (ver mapa-rediseno-
    // referencia-final.md, punto 6) — reemplaza el texto largo por defecto
    // de OpenFreeMap/OpenMapTiles.
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenMapTiles OpenStreetMap contributors",
      }),
      "bottom-right"
    );
    // Columna vertical arriba a la derecha: zoom, geolocalización y
    // pantalla completa, en ese orden (ver referencia).
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      "top-right"
    );
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    // Barra de escala abajo a la izquierda (ej. "200 m").
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      loaded = true;
      window.clearTimeout(failSafeTimer);

      // Recoloreado acá adentro de "load" (no en "style.load"): "style.load"
      // dispara mientras MapLibre todavía está construyendo los contenedores
      // internos de paint properties de cada capa — llamar setPaintProperty
      // ahí adentro tira "Cannot read properties of undefined (reading
      // 'value')" apenas toca la primera capa (confirmado con el stack trace
      // real en consola), la excepción queda sin capturar dentro del propio
      // dispatcher del evento de MapLibre, y el mapa nunca termina de
      // inicializar. "load" sí garantiza que esos contenedores ya existen
      // para la gran mayoría — pero no para TODAS las combinaciones capa/
      // propiedad: alguna capa puntual puede tirar ese mismo error si nunca
      // tuvo esa paint property en el JSON original de "liberty". Try/catch
      // POR CAPA (no uno solo alrededor de todo el for): si una sola capa
      // falla, no puede cortar el resto del recoloreado NI el código que
      // sigue (crear el marcador).
      for (const layer of map.getStyle().layers) {
        try {
          recolorLibertyLayer(map, layer);
        } catch (e) {
          console.warn(`[ContactMap] no se pudo recolorear la capa "${layer.id}"`, e);
        }
      }

      // Marcador del CEDI: círculo navy con ícono de bodega/edificio
      // industrial (lucide "Warehouse", como SVG crudo — este marcador se
      // arma con innerHTML, no con JSX, así que no se puede importar el
      // componente de lucide-react directamente; el path de abajo es el
      // mismo que exporta esa librería) — reemplaza el ícono de pin
      // genérico de antes (ver reference/mapa-target.png). Sigue con forma
      // de pin con colita triangular abajo, más grande que la versión
      // anterior (52px de círculo en vez de 44px, ver globals.css
      // .mercasa-map-pin__circle/__tail para las medidas). Halo pulsante
      // detrás, anclado en la punta de la colita.
      const el = document.createElement("div");
      el.className = "mercasa-map-pin";
      el.innerHTML = `
        <span class="mercasa-map-pin__pulse"></span>
        <span class="mercasa-map-pin__circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
            <path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11" />
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z" />
            <path d="M6 13h12" />
            <path d="M6 17h12" />
          </svg>
        </span>
        <span class="mercasa-map-pin__tail"></span>
      `;
      // anchor "bottom": la punta de la colita (no el centro del círculo) es
      // la que debe caer exactamente sobre la coordenada de la sede.
      //
      // CAUSA RAÍZ del mapa roto tras el selector de sedes (ver fix-mapa-
      // roto-y-tarjeta-inconsistente.md): acá se llamaba `.addTo(map)` ANTES
      // de `.setLngLat(...)` — Marker.addTo() dispara internamente un
      // `_update()` síncrono que proyecta `this._lngLat`, y con el marcador
      // recién creado esa coordenada todavía es `undefined` (confirmado con
      // el stack trace real: "Cannot read properties of undefined (reading
      // 'lng')" dentro de `Marker._update`). Esa excepción queda sin
      // capturar (se dispara desde el loop de render de MapLibre, no desde
      // este código), así que el resto del handler de "load" —incluyendo la
      // asignación a `markerRef.current`— nunca llegaba a ejecutarse:
      // `markerRef` se quedaba en null para siempre, y el efecto de abajo
      // (flyTo al cambiar de sede) bailaba en cada cambio de tab sin mover
      // nunca el mapa. Fix: `setLngLat` SIEMPRE antes de `addTo`.
      // Se posiciona con `siteRef.current` (no el `site` capturado al crear
      // el mapa/efecto): corrige el caso borde en que la sede activa cambió
      // MIENTRAS el mapa todavía estaba cargando (el efecto de abajo, que
      // reacciona a cambios de sede, no puede animar hacia una sede nueva
      // hasta que `markerRef.current` exista).
      const initial = siteRef.current;
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([initial.address.lng, initial.address.lat])
        .addTo(map);
      markerRef.current = marker;
      map.jumpTo({ center: [initial.address.lng, initial.address.lat] });
    });

    map.on("error", () => {
      if (!loaded) setFailed(true);
    });

    return () => {
      window.clearTimeout(failSafeTimer);
      mapRef.current = null;
      markerRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el mapa se crea
    // una sola vez; los cambios de sede posteriores los maneja el efecto de
    // abajo (flyTo + mover el marcador), no una recreación del mapa entero.
  }, []);

  // Sede activa cambia (tabs, ver contacto-selector-sedes.md): recentra el
  // mapa y mueve el marcador con una transición suave (flyTo), sin recrear
  // el mapa ni recargar tiles. Respeta prefers-reduced-motion con un salto
  // directo (jumpTo) en vez de la animación.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const center: [number, number] = [site.address.lng, site.address.lat];
    if (reduceMotion) {
      map.jumpTo({ center });
    } else {
      map.flyTo({ center, duration: 1400, essential: true });
    }
    marker.setLngLat(center);
  }, [site.address.lat, site.address.lng, reduceMotion]);

  if (failed) {
    // Fallback: pin en las coordenadas EXACTAS de la sede activa (no una
    // búsqueda por nombre de pueblo, que caería en el centro del poblado).
    // `q=lat,lng` deja el marcador rojo justo sobre el punto correcto.
    const mapSrc = `https://www.google.com/maps?q=${site.address.lat},${site.address.lng}&z=17&output=embed`;
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <iframe
          title={t(`sites.${site.key}.iframeTitle`)}
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
      {/* Badge flotante con el nombre del lugar (ver reference/mapa-target.png,
          punto 1) — encima del mapa, no parte de la tarjeta de info de abajo.
          pointer-events-none: es sólo un rótulo, no debe robarle clicks/drag
          al mapa debajo. Texto cambia con la sede activa (ver contacto-
          selector-sedes.md), con el mismo crossfade breve del resto de los
          textos que dependen de la sede. */}
      <div
        className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 overflow-hidden rounded-full py-2 pl-3 pr-3.5 text-[12.5px] font-semibold text-white"
        style={{ background: NAVY, boxShadow: "0 10px 24px -6px rgba(11,49,94,0.45)" }}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={reduceMotion ? "static-badge" : site.key}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {t(`sites.${site.key}.badgeLabel`)}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
