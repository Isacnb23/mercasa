"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Quote,
  Star,
} from "lucide-react";
import Container from "../../ui/Container";
import Reveal from "../../ui/Reveal";
import SoftCurve from "../../ui/SoftCurve";
import WhatsAppIcon from "../../ui/WhatsAppIcon";
import { useActiveSegment } from "../customer-class/ActiveSegmentContext";
import { businessSegments, CATALOG_GENERAL_KEY, contactSites, site } from "@/lib/data";
import { buildWhatsappHref, cn } from "@/lib/utils";
import type { ContactSite } from "@/lib/data";

// Réplica exacta de la referencia (ver rediseno-exacto-hablemos-de-
// negocios.md) — reemplaza por completo el panel navy del rediseño anterior
// (rediseno-contacto-y-mapa.md): tarjeta única clara (crema), NO navy.
const NAVY = "#0B2F63";
const CARD_BG = "#F6F2E9";
// Navy específico del badge/marcador/popup del mapa (ver reference/mapa-
// target.png y ContactMap.tsx) — un tono levemente distinto del NAVY de
// arriba (que ya se usa en el resto de la sección: WhatsApp, botones,
// títulos), a propósito no lo tocamos para no alterar nada fuera del
// alcance de este cambio.
const MAP_NAVY = "#0B315E";
// Separación visual mapa/tarjeta (ver mapa-borde-separacion.md): el mapa
// "liberty" recoloreado quedó con fondo casi blanco, muy parecido al beige
// CARD_BG de al lado — sin nada entre medio, ambos bloques se sentían
// fundidos. Mismo tono de borde que ya usa el panel de Customer Class
// (CustomerClassSection.tsx, su propia constante BORDER) para no inventar
// un valor nuevo.
const MAP_BORDER = "#DDE3E8";
// Fondo propio de la franja de reseñas (ver contacto-rediseno-distribucion-
// referencia.md): distinto/contrastado del CARD_BG de la bandeja y del
// blanco de la tarjeta de info — un beige más cálido/profundo (mismo tono
// que BEIGE_LIGHT en CustomerClassSection.tsx) para que la franja se lea
// como su propia zona sin necesitar una card blanca alrededor de la cita.
const REVIEWS_BG = "#F1ECE4";

const ContactMap = dynamic(() => import("./ContactMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#F2F3F0]" />,
});

/**
 * Productos, Contacto y Footer comparten el mismo lienzo navy oscuro (el fondo
 * fijo de AmbientBackdrop) — el "cambio de capítulo" se logra con tarjetas
 * claras flotando encima, no con un cambio de color de página. El mapa
 * (vista satelital híbrida, ver mapa-satelital.md) vive enmarcado dentro de una tarjeta tipo mapa
 * impreso, a juego con el resto de la sección en vez de ser el único
 * contraste oscuro.
 */
export default function ContactSection() {
  const t = useTranslations("Contact");

  // Segmento activo elegido en "Segmento de Mercado" (ver
  // reestructuracion-orden-secciones.md): esa sección ya no es vecina de
  // esta — vive justo después del Hero — así que el estado compartido pasó
  // de un simple useState acá arriba a ActiveSegmentContext. Solo se lee
  // acá para contextualizar el WhatsApp de cierre de abajo con el segmento
  // que el usuario eligió más arriba en la página.
  const { activeSegmentKey } = useActiveSegment();
  const isCatalogGeneral = activeSegmentKey === CATALOG_GENERAL_KEY;
  const activeSegment = businessSegments.find((seg) => seg.key === activeSegmentKey) ?? businessSegments[0];
  // "Catálogo general" no es un segmento de cliente real (ver refactor-
  // segmento-mercado-catalogo-general.md, punto 4) — el mensaje de WhatsApp
  // omite el "represento {noun}" en vez de inventar un segmento falso.
  const whatsappHref = buildWhatsappHref(
    site.whatsappHref,
    isCatalogGeneral
      ? t("genericWhatsappMessage")
      : t("segmentsWhatsappMessage", { noun: t(`segments.${activeSegment.key}.whatsappNoun`) })
  );

  // Selector de sedes (ver contacto-selector-sedes.md): teléfono, correos y
  // horario NO dependen de la sede — solo el bloque "Sede central (CEDI)",
  // el mapa (centro/marcador/badge) y la tarjeta flotante del mapa (popup)
  // cambian según la sede activa.
  const [activeSiteKey, setActiveSiteKey] = useState(contactSites[0].key);
  const activeSite = contactSites.find((s) => s.key === activeSiteKey) ?? contactSites[0];
  const reduceMotion = useReducedMotion();

  // "Copiar ubicación" vive ahora junto a la dirección en la tarjeta de
  // info (ver contacto-rediseno-distribucion-referencia.md) — antes era
  // parte de la card flotante sobre el mapa, que la nueva referencia
  // reemplaza por botones flotantes simples de Google Maps/Waze sin texto
  // de dirección propio (la dirección ya vive acá, no hace falta
  // repetirla sobre el mapa).
  const [locationCopied, setLocationCopied] = useState(false);
  const handleCopyLocation = async () => {
    await navigator.clipboard.writeText(`${activeSite.address.lat}, ${activeSite.address.lng}`);
    setLocationCopied(true);
    window.setTimeout(() => setLocationCopied(false), 1800);
  };

  // El mapa (MapLibre GL + capa 3D) es el chunk más pesado de la sección.
  // `dynamic(..., { ssr: false })` ya lo saca del bundle inicial, pero por sí
  // solo se dispara apenas ContactSection monta en el cliente — es decir, en
  // la hidratación, sin importar si el usuario todavía está arriba en el
  // Hero. Este observer retrasa el montaje real (y por lo tanto la descarga
  // del chunk) hasta que el host del mapa está a punto de entrar en
  // viewport, no en el load inicial de la página.
  const mapHostRef = useRef<HTMLDivElement>(null);
  const [mapInView, setMapInView] = useState(false);

  useEffect(() => {
    const el = mapHostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMapInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" } // precarga un poco antes de que sea visible, no en el load inicial
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section
        id="hablemos-de-negocios"
        // pt separado de pb y subido a 130/150px (ver header-spacing-fix.md):
        // antes compartían el mismo py-24/28 (96/112px) — suficiente para no
        // quedar tapado por el header (~96px reales) pero con poco aire
        // visual arriba. Mismo valor de pt que el resto de las secciones
        // para un espaciado parejo; pb se deja igual, no es el problema acá.
        className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden pb-24 pt-[130px] md:pb-28 md:pt-[150px]"
        style={{ background: "#FFFFFF" }}
      >
        {/* Sin degradado de entrada propio acá (ver afinar-transicion-
            linea-ondulada.md): la entrada desde Colaboradores (beige) ya la
            resuelve esa sección del lado suyo, con SU PROPIA curva —
            duplicar el degradado acá encima pintaba beige sólido justo en
            el borde donde Colaboradores ya había terminado de fundir a
            blanco, y ese empalme se veía como línea dura compitiendo con
            la curva. Un solo degradado por seam. */}
        {/* Esta curva solo marca la salida hacia el Footer (que cierra en un
            tono distinto, #F3F5F7). "Segmento de Mercado" (CustomerClassSection)
            y "Marcas" ya NO son las secciones inmediatamente anteriores acá
            arriba — viven justo después del Hero (ver
            reestructuracion-orden-secciones.md, pedido del equipo de que
            "Segmento de Mercado" no quedara tan abajo en la página); ahora
            "Colaboradores" es la sección previa. El segmento activo elegido
            allá arriba sigue llegando hasta acá vía ActiveSegmentContext
            (ver hooks arriba) para personalizar el WhatsApp de cierre.
            id="hablemos-de-negocios" es el target directo del ítem
            "Contacto" del nav (ver navbar-customer-class.md — antes
            "Contacto" apuntaba a CustomerClassSection, que ahora tiene su
            propio ítem con id "customer-class"). */}
        <SoftCurve position="bottom" flip />

        <Container className="relative z-10">
          {/* ---------- Encabezado único de la sección ---------- */}
          <Reveal className="mx-auto max-w-2xl text-center">
            <span
              className="inline-flex items-center gap-3 text-[13px] font-semibold uppercase"
              style={{ letterSpacing: "0.22em", color: "#075FD8" }}
            >
              <span className="h-px w-6" style={{ background: "rgba(7,95,216,0.5)" }} />
              {t("eyebrow")}
              <span className="h-px w-6" style={{ background: "rgba(7,95,216,0.5)" }} />
            </span>
            <h2
              className="mt-5 font-display text-corp-ink"
              style={{ fontSize: "clamp(36px, 4vw, 56px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              {t("title")}
            </h2>
            <p
              className="mx-auto mt-4 max-w-[700px] text-[16px] leading-[1.55] md:text-[17px]"
              style={{ color: "#3A4A5F" }}
            >
              {t("paragraph")}
            </p>
          </Reveal>

          {/* ---------- Bandeja beige + 3 tarjetas propias (info / mapa /
              reseñas) ----------
              Antes las 3 áreas compartían el mismo CARD_BG sin ningún
              límite más que un border-b/border-l delgado (ver contacto-
              recuperar-contraste-visual.md): con el mapa "liberty"
              recoloreado casi blanco, todo el bloque se leía plano, un
              único beige de punta a punta. Ahora CARD_BG queda como
              "bandeja" de fondo (visible como margen entre tarjetas, ver
              `p-3`/`gap-3` abajo) y cada bloque es su propia tarjeta blanca
              flotante con sombra — mismo criterio que ya usa el panel de
              Customer Class (PANEL_BG + tarjetas propias), sin volver al
              corte duro de color que se había descartado antes. */}
          <Reveal
            className="relative mx-auto mt-14 max-w-[1380px] rounded-[30px] p-3 sm:p-4"
            style={{ background: CARD_BG, boxShadow: "0 30px 70px rgba(16,37,63,0.14)" }}
          >
            {/* ---------- Fila 1: tarjeta de info (angosta) + mapa (resto
                del ancho) ---------- Ver contacto-rediseno-distribucion-
                referencia.md: vuelve a la distribución de 2 columnas lado a
                lado (info angosta / mapa ancho) en vez del bloque horizontal
                de ancho completo de la ronda anterior — más parecida a la
                referencia visual que le gustó a Isaac. */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:min-h-[560px] lg:grid-cols-[380px_1fr]">
              {/* Tarjeta de info de contacto */}
              <div
                className="flex flex-col gap-6 rounded-[22px] bg-white p-8"
                style={{ border: "1px solid rgba(11,47,99,0.06)", boxShadow: "0 16px 40px -22px rgba(16,37,63,0.35)" }}
              >
                <div>
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ letterSpacing: "0.18em", color: NAVY }}
                  >
                    {t("infoEyebrow")}
                  </span>
                  <h3
                    className="mt-3 font-display"
                    style={{ fontSize: "clamp(22px, 2vw, 28px)", lineHeight: 1.2, fontWeight: 700, color: NAVY }}
                  >
                    {t("infoTitle")}
                  </h3>
                </div>

                {/* Selector de sedes: dos pills, mismo criterio visual que
                    el toggle ES/EN (LocaleSwitcher.tsx) pero en la paleta
                    navy de esta sección. */}
                <div
                  role="tablist"
                  aria-label={t("sitesSelectorLabel")}
                  className="inline-flex w-fit items-center gap-1 rounded-full border p-1"
                  style={{ borderColor: "rgba(11,47,99,0.14)", background: "rgba(11,47,99,0.04)" }}
                >
                  {contactSites.map((s) => {
                    const isActive = s.key === activeSiteKey;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveSiteKey(s.key)}
                        className="rounded-full px-4 py-2 text-[15px] font-semibold transition"
                        style={{ color: isActive ? "#ffffff" : NAVY, background: isActive ? NAVY : "transparent" }}
                      >
                        {t(`sites.${s.key}.tabLabel`)}
                      </button>
                    );
                  })}
                </div>

                {/* Nombre de la sede como sub-encabezado propio (ver
                    contacto-rediseno-distribucion-referencia.md) — antes
                    era el título del ítem de dirección; en la referencia
                    va aparte, arriba de los datos. */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={reduceMotion ? "static-sede" : activeSite.key}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-5"
                  >
                    <p className="font-display text-[17px] font-bold" style={{ color: NAVY }}>
                      {t(`sites.${activeSite.key}.sedeTitle`)}
                    </p>

                    {/* min-h-[3lh] (ver fix-mapa-roto-y-tarjeta-
                        inconsistente.md): reserva altura para el caso más
                        largo (CEDI Central, 3 líneas físicas) para que la
                        tarjeta no cambie de tamaño al cambiar de sede. */}
                    <InfoRow icon={MapPin} title={t("direccionLabel")} contentClassName="min-h-[3lh]">
                      {activeSite.address.line1}
                      {activeSite.address.line2 && (
                        <>
                          <br />
                          {activeSite.address.line2}
                          {activeSite.address.postalCode ? ` · CP ${activeSite.address.postalCode}` : ""}
                        </>
                      )}
                      <br />
                      <button
                        type="button"
                        onClick={handleCopyLocation}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium transition hover:opacity-70"
                        style={{ color: "#075FD8" }}
                      >
                        <Copy className="h-3 w-3" />
                        {locationCopied ? t("copiedFeedback") : t("copyLocation")}
                      </button>
                    </InfoRow>
                  </motion.div>
                </AnimatePresence>

                <InfoRow icon={Phone} title={t("telefonoTitle")}>
                  <a href={site.phoneHref} className="transition hover:text-[#075FD8]">
                    {site.phone}
                  </a>
                </InfoRow>
                <InfoRow icon={Mail} title={t("correosTitle")}>
                  <a href={`mailto:${site.emails.comunicaciones}`} className="transition hover:text-[#075FD8]">
                    {site.emails.comunicaciones}
                  </a>
                  <br />
                  <a href={`mailto:${site.emails.rh}`} className="transition hover:text-[#075FD8]">
                    {site.emails.rh}
                  </a>{" "}
                  {t("correosRh")}
                </InfoRow>
                <InfoRow icon={Clock} title={t("horarioTitle")} last>
                  {t("horarioWeekdays")}
                  <br />
                  {t("horarioSaturday")}
                </InfoRow>

                {/* WhatsApp: ancho completo del bloque, con flecha a la
                    derecha (ver contacto-rediseno-distribucion-
                    referencia.md) — antes compartía fila 50/50 con "Llamar
                    ahora"; acá ese botón baja de categoría a link discreto,
                    así que WhatsApp puede tomar todo el ancho. */}
                <motion.a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  whileTap={{ scale: 0.97 }}
                  className="mt-1 inline-flex h-[52px] w-full items-center justify-between rounded-full px-6 text-base font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                  style={{ background: NAVY, boxShadow: "0 12px 28px rgba(11,47,99,0.28)" }}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    {t("whatsappCta")}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </motion.a>

                {/* "Llamar ahora": link discreto (ícono + texto + flecha),
                    NO botón outline grande — a propósito con menos peso
                    visual que WhatsApp, ver referencia. */}
                <a
                  href={site.phoneHref}
                  className="group -mt-2 inline-flex w-fit items-center gap-2 text-[15px] font-semibold transition hover:opacity-75"
                  style={{ color: NAVY }}
                >
                  <Phone className="h-4 w-4" />
                  {t("callCta")}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </a>
              </div>

              {/* Mapa: ocupa el resto del ancho (ver contacto-rediseno-
                  distribucion-referencia.md). Border propio por los 4 lados
                  (ver contacto-recuperar-contraste-visual.md, punto 2 — el
                  mapa "liberty" recoloreado quedó casi blanco) + su propio
                  border-radius. */}
              <div
                className="relative min-h-[360px] overflow-hidden rounded-[22px] lg:min-h-0"
                style={{ border: `1px solid ${MAP_BORDER}`, boxShadow: "0 16px 40px -22px rgba(16,37,63,0.35)" }}
              >
                <div ref={mapHostRef} className="absolute inset-0 bg-[#F2F3F0]">
                  {mapInView ? <ContactMap site={activeSite} /> : <div className="absolute inset-0 bg-[#F2F3F0]" />}
                  {/* Viñeta sutil para que el marco se sienta intencional aun si
                      el mapa todavía está cargando teselas. */}
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_12px_rgba(16,37,63,0.06)]" />

                  {/* Botones flotantes Google Maps / Waze en la esquina
                      inferior DERECHA (ver contacto-rediseno-distribucion-
                      referencia.md — reemplaza la card navy con título +
                      dirección + botones que vivía abajo a la izquierda; la
                      dirección ya se muestra en la tarjeta de info de al
                      lado, no hace falta repetirla acá). Recibe la sede
                      activa (ver contacto-selector-sedes.md) para las
                      coordenadas correctas. */}
                  <MapActions t={t} site={activeSite} />
                </div>
              </div>
            </div>

            {/* ---------- Fila 2: reseñas, franja propia con fondo beige
                distinto, SIN card blanca ---------- Ver contacto-rediseno-
                distribucion-referencia.md: label lateral (rotado 90°) +
                rating de Google a la izquierda, cita centrada, flechas de
                navegación a la derecha — reemplaza el bloque centrado y
                apilado de la ronda anterior (contacto-testimonios-sin-
                card.md, que se mantiene en cuanto a "sin card blanca", solo
                cambia la distribución). REVIEWS_BG (beige más profundo que
                CARD_BG) le da a la franja su propio fondo, distinto del
                blanco de la tarjeta de info y del CARD_BG de la bandeja. */}
            <div
              className="mt-3 flex flex-col items-center gap-6 rounded-[22px] p-8 text-center sm:mt-4 sm:p-10 md:p-12 lg:flex-row lg:items-center lg:gap-10 lg:text-left"
              style={{ background: REVIEWS_BG }}
            >
              {/* Label lateral + rating: rotado 90° en desktop (columna
                  angosta a la izquierda, como en la referencia); en mobile
                  se acuesta horizontal arriba de la cita. */}
              <div className="flex shrink-0 flex-col items-center gap-4 lg:h-full lg:items-start lg:justify-center">
                {/* Label vertical en desktop (columna angosta a la
                    izquierda, como en la referencia) — texto girado con
                    `writing-mode` en vez de una imagen o SVG, así se sigue
                    traduciendo como cualquier otro string. En mobile se
                    acuesta horizontal arriba de la cita (elemento
                    duplicado + `hidden`/`lg:hidden`, más simple y robusto
                    que alternar `writing-mode` por breakpoint). */}
                <p
                  className="hidden text-[12px] font-bold uppercase lg:block lg:[writing-mode:vertical-rl] lg:rotate-180"
                  style={{ letterSpacing: "0.18em", color: NAVY }}
                >
                  {t("reviewsTitle")}
                </p>
                <p
                  className="text-[12px] font-bold uppercase lg:hidden"
                  style={{ letterSpacing: "0.18em", color: NAVY }}
                >
                  {t("reviewsTitle")}
                </p>
                <GoogleRating t={t} />
              </div>

              {/* Cita + autor, centrado, con las flechas de navegación al
                  costado en vez de puntos (ver contacto-rediseno-
                  distribucion-referencia.md). */}
              <div className="min-w-0 flex-1">
                <ReviewsCarousel t={t} />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

// Calificación de Google ESTÁTICA/hardcodeada (ver google-rating-
// estatico.md) — dato real de la ficha "Grupo Inteca CEDI" en Google Maps,
// sin consultar la API de Places (requiere API key + facturación, no
// disponible todavía). Si la calificación cambia, actualizar los valores acá
// a mano; la versión con API en vivo queda documentada en
// google-reviews-contacto.md para cuando haya API key.
const GOOGLE_RATING = 4.3;
const GOOGLE_RATING_COUNT = 18;
const GOOGLE_PLACE_URL = "https://www.google.com/maps/place/?q=place_id:ChIJCw1XyOEfoY8RKYSZrRjlUxA";

function GoogleRating({ t }: { t: ReturnType<typeof useTranslations> }) {
  // Relleno parcial de estrellas vía overlay recortado con `width` en % (5
  // estrellas grises de fondo + 5 doradas encima, cortadas al ancho exacto
  // de 4.3/5) en vez de mostrar solo el número, para que se lea como una
  // calificación real de un vistazo.
  const fillPercent = (GOOGLE_RATING / 5) * 100;

  return (
    <a
      href={GOOGLE_PLACE_URL}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex w-fit items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition hover:-translate-y-0.5"
      style={{ borderColor: "rgba(11,47,99,0.1)" }}
    >
      <div className="relative inline-flex shrink-0">
        <div className="flex gap-0.5" style={{ color: "rgba(11,47,99,0.18)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
          ))}
        </div>
        <div
          className="absolute inset-0 flex gap-0.5 overflow-hidden"
          style={{ width: `${fillPercent}%`, color: "#F5B400" }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-[18px] w-[18px] shrink-0" fill="currentColor" strokeWidth={0} />
          ))}
        </div>
      </div>
      <p className="text-[14px] leading-tight" style={{ color: "#3A4A5F" }}>
        <span className="font-bold" style={{ color: NAVY }}>
          {GOOGLE_RATING}
        </span>{" "}
        · {GOOGLE_RATING_COUNT} {t("googleRatingReviews")}
        <br />
        <span className="text-[12.5px] font-medium group-hover:underline" style={{ color: "#075FD8" }}>
          {t("googleRatingCta")}
        </span>
      </p>
    </a>
  );
}

// Reseñas reales de Google con nombre de autor (ver google-comentarios-
// reales.md) — reemplaza el enfoque anterior (cita genérica "Very good" sin
// nombre, de la API limitada a 5 resultados) por citas más creíbles
// encontradas revisando la ficha real de Google Maps directamente. Texto
// de la cita NUNCA se traduce (es lo que escribió el cliente real en
// español) — solo el título del apartado tiene traducción ES/EN. Solo 2
// por ahora (ver mural-reviews-carousel.md, feedback de seguimiento: "traé
// varias más de Google, buenas") — agregar más acá cuando se confirme el
// texto real de otras reseñas de la ficha; el carrusel de abajo ya soporta
// cualquier cantidad sin cambios.
const GOOGLE_REVIEWS = [
  { quote: "Excelente mercadería", author: "René Calderón", stars: 5 },
  { quote: "Muy bueno", author: "Marcelo G.", stars: 5 },
];

// Carrusel de reseñas (ver mural-reviews-carousel.md): reemplaza la grilla
// estática de 2 tarjetas — con más reseñas reales (agregadas arriba) una
// grilla se vuelve angosta/apretada; mostrar UNA a la vez, grande, con
// crossfade automático escala a cualquier cantidad sin volver a tocar el
// layout. `useEffect` reprograma el temporizador cada vez que cambia el
// índice (por auto-avance o click en una flecha), así un click manual no
// compite con el siguiente auto-avance.
const REVIEW_ROTATE_MS = 6000;

function ReviewsCarousel({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const review = GOOGLE_REVIEWS[index];

  useEffect(() => {
    if (reduceMotion || GOOGLE_REVIEWS.length <= 1) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % GOOGLE_REVIEWS.length);
    }, REVIEW_ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [index, reduceMotion]);

  const goPrev = () => setIndex((i) => (i - 1 + GOOGLE_REVIEWS.length) % GOOGLE_REVIEWS.length);
  const goNext = () => setIndex((i) => (i + 1) % GOOGLE_REVIEWS.length);

  return (
    // Sin card envolvente (ver contacto-testimonios-sin-card.md, mantenido
    // en contacto-rediseno-distribucion-referencia.md): apoyada solo en
    // tipografía/espaciado — comillas grandes decorativas, cita en display
    // italic, línea sutil (border-t) antes de autor+estrellas. Alineación a
    // la izquierda en desktop (mx-0, ver referencia: label a la izquierda,
    // cita al lado, flechas a la derecha) y centrada en mobile (mx-auto,
    // heredando el text-center del contenedor padre en esa franja). Flechas
    // ← → reemplazan los puntos de la ronda anterior (ver referencia,
    // punto "Flechas de navegación a la derecha para pasar entre reseñas").
    <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <Quote
          className="mx-auto h-10 w-10 lg:mx-0"
          style={{ color: "rgba(11,47,99,0.16)" }}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={reduceMotion ? "static-review" : index}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <p
              className="mx-auto -mt-1 max-w-[480px] font-display italic leading-snug lg:mx-0"
              style={{ fontSize: "clamp(20px, 2.2vw, 26px)", color: NAVY }}
            >
              &ldquo;{review.quote}&rdquo;
            </p>
            <div
              className="mx-auto mt-5 flex w-fit items-center gap-3 border-t pt-4 lg:mx-0"
              style={{ borderColor: "rgba(11,47,99,0.16)" }}
            >
              {/* Avatar con la inicial del autor: sin foto real, pero le da
                  a cada reseña un ancla visual propia en vez de ser solo
                  texto plano — mismo tratamiento navy sólido que el resto
                  de los acentos de la sección. */}
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
                style={{ background: NAVY }}
                aria-hidden
              >
                {review.author.charAt(0)}
              </span>
              <div className="text-left">
                <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
                  {review.author}
                </p>
                <div className="flex gap-0.5" style={{ color: "#F5B400" }}>
                  {Array.from({ length: review.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {GOOGLE_REVIEWS.length > 1 && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={t("reviewsPrev")}
            onClick={goPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition hover:-translate-y-0.5"
            style={{ border: "1px solid rgba(11,47,99,0.14)", color: NAVY }}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label={t("reviewsNext")}
            onClick={goNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition hover:-translate-y-0.5"
            style={{ border: "1px solid rgba(11,47,99,0.14)", color: NAVY }}
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
  last = false,
  contentClassName,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  last?: boolean;
  /** Clase extra para el <p> de contenido — usada por el bloque de sede
   * (ver fix-mapa-roto-y-tarjeta-inconsistente.md) para reservar una altura
   * mínima fija y que la tarjeta no cambie de tamaño según cuántas líneas
   * de dirección tenga la sede activa. */
  contentClassName?: string;
}) {
  return (
    <div className="flex gap-4">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: CARD_BG, border: "1px solid rgba(11,47,99,0.08)" }}
      >
        <Icon className="h-5 w-5" style={{ color: NAVY }} />
      </span>
      <div
        className={cn("min-w-0 flex-1 py-3.5", !last && "border-b")}
        style={!last ? { borderColor: "rgba(11,47,99,0.14)" } : undefined}
      >
        <p className="text-[12.5px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: NAVY }}>
          {title}
        </p>
        <p className={cn("mt-1 break-words text-[16px] leading-[1.55]", contentClassName)} style={{ color: "#3A4A5F" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

// Tarjeta flotante navy sobre el mapa (ver reference/mapa-target.png, punto
// 3): título + dirección en navy, dos botones píldora del mismo ancho
// (Google Maps / Waze) y un link secundario "Copiar ubicación" que copia
// las coordenadas EXACTAS del CEDI (mismas que usa el marcador — nunca el
// nombre "Mercasa" como búsqueda, ver comentario en site.address) al
// portapapeles, con feedback visual breve ("¡Copiado!") en vez del label
// normal. Componente aparte (no inline en ContactSection) porque necesita
// su propio estado de "copiado" — subirlo al padre no aportaba nada.
// Botones flotantes Google Maps / Waze (ver contacto-rediseno-distribucion-
// referencia.md) — reemplaza la card navy con título + dirección + botones
// + "copiar ubicación" (MapInfoCard, ronda anterior): la referencia solo
// pide los controles de navegación como botones flotantes en la esquina
// inferior DERECHA, sin repetir texto de dirección (esa info ya vive en la
// tarjeta de info de al lado) ni el link de copiar (se movió ahí también,
// ver handleCopyLocation en ContactSection). Iconos circulares simples en
// vez de píldoras con texto — mismo espíritu de la referencia, no copia
// literal (el mockup no trae texto en estos botones).
function MapActions({ t, site: activeSite }: { t: ReturnType<typeof useTranslations>; site: ContactSite }) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${activeSite.address.lat},${activeSite.address.lng}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t("openInGoogleMaps")}
        title={t("openInGoogleMaps")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white transition hover:-translate-y-0.5 hover:brightness-95"
        style={{ color: MAP_NAVY, boxShadow: "0 10px 24px -6px rgba(11,49,94,0.45)" }}
      >
        <ExternalLink className="h-[18px] w-[18px]" />
      </a>
      <a
        href={`https://waze.com/ul?ll=${activeSite.address.lat},${activeSite.address.lng}&navigate=yes`}
        target="_blank"
        rel="noreferrer"
        aria-label={t("openInWaze")}
        title={t("openInWaze")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white transition hover:-translate-y-0.5 hover:brightness-95"
        style={{ color: MAP_NAVY, boxShadow: "0 10px 24px -6px rgba(11,49,94,0.45)" }}
      >
        <Navigation className="h-[18px] w-[18px]" />
      </a>
    </div>
  );
}
