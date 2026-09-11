"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, Copy, ExternalLink, Mail, MapPin, Navigation, Phone, Quote, Star } from "lucide-react";
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

          {/* ---------- Tarjeta única, dos columnas (NO panel navy) ----------
              Réplica exacta de la referencia (ver
              rediseno-exacto-hablemos-de-negocios.md) — reemplaza por
              completo el panel navy del rediseño anterior
              (rediseno-contacto-y-mapa.md), que no convenció. Fondo claro
              crema (mismo tono que Customer Class), columna de info ~40% a
              la izquierda, mapa ~60% a la derecha ocupando toda la altura
              (esquinas redondeadas solo del lado derecho, heredadas del
              rounded-[30px] + overflow-hidden del contenedor único). */}
          <Reveal
            className="relative mx-auto mt-14 max-w-[1380px] overflow-hidden rounded-[30px]"
            style={{ background: CARD_BG, boxShadow: "0 30px 70px rgba(16,37,63,0.14)" }}
          >
            <div className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[2fr_3fr]">
              {/* Columna izquierda (~40%) */}
              <div className="relative flex flex-col gap-8 p-8 sm:p-10 md:p-12">
                <div>
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ letterSpacing: "0.18em", color: NAVY }}
                  >
                    {t("infoEyebrow")}
                  </span>
                  <h3
                    className="mt-3 font-display"
                    style={{ fontSize: "clamp(24px, 2.4vw, 32px)", lineHeight: 1.2, fontWeight: 700, color: NAVY }}
                  >
                    {t("infoTitle")}
                  </h3>
                  <p className="mt-3 text-[16px] leading-[1.6]" style={{ color: "#5C6B7D" }}>
                    {t("infoDescription")}
                  </p>
                </div>

                <div>
                  {/* Selector de sedes: dos pills, mismo criterio visual que
                      el toggle ES/EN (LocaleSwitcher.tsx) pero en la paleta
                      navy de esta sección. */}
                  <div
                    role="tablist"
                    aria-label={t("sitesSelectorLabel")}
                    className="mb-4 inline-flex w-fit items-center gap-1 rounded-full border p-1"
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

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={reduceMotion ? "static-sede" : activeSite.key}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* min-h-[3lh] (ver fix-mapa-roto-y-tarjeta-
                          inconsistente.md): reserva altura para el caso más
                          largo (CEDI Central, 3 líneas físicas — dirección +
                          línea 2 + código postal) para que la tarjeta no
                          cambie de tamaño cuando San Francisco, con menos
                          datos, deja el resto del espacio vacío en vez de
                          inventar un line2/CP falso solo para rellenar. */}
                      <InfoRow
                        icon={MapPin}
                        title={t(`sites.${activeSite.key}.sedeTitle`)}
                        contentClassName="min-h-[3lh]"
                      >
                        {activeSite.address.line1}
                        {activeSite.address.line2 && (
                          <>
                            <br />
                            {activeSite.address.line2}
                            {activeSite.address.postalCode ? ` · CP ${activeSite.address.postalCode}` : ""}
                          </>
                        )}
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
                </div>

                {/* Dos botones en fila: WhatsApp sólido navy, Llamar ahora
                    con borde navy — ambos tipo píldora. */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <motion.a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-full px-6 text-base font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                    style={{ background: NAVY, boxShadow: "0 12px 28px rgba(11,47,99,0.28)" }}
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    {t("whatsappCta")}
                  </motion.a>
                  <motion.a
                    href={site.phoneHref}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-full bg-white px-6 text-base font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(11,47,99,0.04)]"
                    style={{ border: `1.5px solid ${NAVY}`, color: NAVY }}
                  >
                    <Phone className="h-4 w-4" />
                    {t("callCta")}
                  </motion.a>
                </div>
              </div>

              {/* Columna derecha (~60%): mapa a pantalla completa — border
                  sutil ALREDEDOR de todo el contenedor (no solo el borde
                  compartido con la columna de info a la izquierda) — ver
                  mapa-borde-separacion.md: el mapa "liberty" recoloreado
                  (fondo casi blanco) y el CARD_BG beige de al lado se
                  sentían fundidos, sin ninguna separación más que el cambio
                  de color. Esta capa no tiene su propio border-radius, así
                  que en las esquinas que coinciden con las del contenedor
                  único (rounded-[30px] + overflow-hidden un poco más abajo)
                  el corte redondeado de afuera sigue mandando — el border
                  recto queda recortado junto con el resto, sin verse
                  cuadrado en esas esquinas. */}
              <div className="relative min-h-[360px] border lg:min-h-0" style={{ borderColor: MAP_BORDER }}>
                <div ref={mapHostRef} className="absolute inset-0 bg-[#F2F3F0]">
                  {mapInView ? <ContactMap site={activeSite} /> : <div className="absolute inset-0 bg-[#F2F3F0]" />}
                  {/* Viñeta sutil para que el marco se sienta intencional aun si
                      el mapa todavía está cargando teselas. */}
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_12px_rgba(16,37,63,0.06)]" />

                  {/* Tarjeta flotante navy (ver reference/mapa-target.png,
                      punto 3 — reemplaza la tarjeta blanca de la ronda
                      anterior): título + dirección en navy, dos botones
                      píldora del mismo tamaño (Google Maps / Waze) y un
                      link secundario "Copiar ubicación". Recibe la sede
                      activa (ver contacto-selector-sedes.md) para mostrar
                      sus propios datos/coordenadas. */}
                  <MapInfoCard t={t} site={activeSite} />
                </div>
              </div>
            </div>
          </Reveal>

          {/* ---------- Testimonios, franja propia a todo el ancho ----------
              Antes vivían apretados dentro de la columna de info (entre el
              horario y los botones de WhatsApp/Llamar) — ver
              testimonios-seccion-propia.md: quedaban chicos y perdidos en
              medio de mucha otra información. Ahora tienen su propia tarjeta
              (mismo lenguaje visual CARD_BG que la de arriba), con el rating
              de Google como encabezado que "presenta" la sección — el link
              "Ver reseñas en Google" sigue viviendo ahí. */}
          <Reveal
            className="relative mx-auto mt-8 max-w-[1380px] overflow-hidden rounded-[30px] px-8 py-14 text-center sm:px-12 sm:py-16"
            style={{ background: CARD_BG, boxShadow: "0 30px 70px rgba(16,37,63,0.14)" }}
          >
            <div className="flex justify-center">
              <GoogleRating t={t} />
            </div>
            <h3
              className="mx-auto mt-6 max-w-2xl font-display text-corp-ink"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              {t("reviewsTitle")}
            </h3>
            <ReviewsCarousel />
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
// crossfade automático + puntos de navegación abajo escala a cualquier
// cantidad sin volver a tocar el layout. `useEffect` reprograma el
// temporizador cada vez que cambia el índice (por auto-avance o click en
// un punto), así un click manual no compite con el siguiente auto-avance.
const REVIEW_ROTATE_MS = 6000;

function ReviewsCarousel() {
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

  return (
    <div className="mx-auto mt-10 max-w-[680px]">
      {/* Contraste contra el CARD_BG beige que envuelve la sección (ver
          fix-contraste-testimonios.md): blanco puro + sombra difusa +
          borde sutil de refuerzo hacen que la tarjeta "flote" en vez de
          perderse contra el fondo. */}
      <div
        className="relative overflow-hidden rounded-[24px] border border-black/[0.05] bg-white px-8 py-10 text-center sm:px-14 sm:py-12"
        style={{ boxShadow: "0 20px 48px rgba(16,37,63,0.18)" }}
      >
        <Quote
          className="mx-auto h-9 w-9"
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
              className="mx-auto mt-4 max-w-[520px] font-display italic leading-snug"
              style={{ fontSize: "clamp(21px, 2.4vw, 27px)", color: NAVY }}
            >
              &ldquo;{review.quote}&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
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
        <div className="mt-6 flex items-center justify-center gap-2">
          {GOOGLE_REVIEWS.map((r, i) => (
            <button
              key={r.author}
              type="button"
              aria-label={`Reseña ${i + 1} de ${GOOGLE_REVIEWS.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: i === index ? 22 : 8, background: i === index ? NAVY : "rgba(11,47,99,0.22)" }}
            />
          ))}
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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white"
        style={{ border: "1px solid rgba(11,47,99,0.08)" }}
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
function MapInfoCard({ t, site: activeSite }: { t: ReturnType<typeof useTranslations>; site: ContactSite }) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleCopyLocation = async () => {
    await navigator.clipboard.writeText(`${activeSite.address.lat}, ${activeSite.address.lng}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="absolute bottom-4 left-4 z-10 w-[260px] p-4"
      style={{ background: MAP_NAVY, borderRadius: "16px", boxShadow: "0 14px 32px -8px rgba(11,49,94,0.45)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={reduceMotion ? "static-popup" : activeSite.key}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white" />
            <p className="text-[14px] font-bold text-white" style={{ letterSpacing: "0.01em" }}>
              {t(`sites.${activeSite.key}.mapCardTitle`)}
            </p>
          </div>
          <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "#B8C2D0" }}>
            {activeSite.address.line1}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dos píldoras del MISMO tamaño (flex-1 cada una) — a diferencia del
          link de texto simple de la ronda anterior. */}
      <div className="mt-3 flex gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${activeSite.address.lat},${activeSite.address.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-white text-[12.5px] font-semibold transition hover:brightness-95"
          style={{ color: MAP_NAVY }}
        >
          {t("openInGoogleMaps")}
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://waze.com/ul?ll=${activeSite.address.lat},${activeSite.address.lng}&navigate=yes`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-white text-[12.5px] font-semibold transition hover:brightness-95"
          style={{ color: MAP_NAVY }}
        >
          {t("openInWaze")}
          <Navigation className="h-3 w-3" />
        </a>
      </div>

      <button
        type="button"
        onClick={handleCopyLocation}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium transition hover:opacity-80"
        style={{ color: "#B8C2D0" }}
      >
        <Copy className="h-3 w-3" />
        {copied ? t("copiedFeedback") : t("copyLocation")}
      </button>
    </div>
  );
}
