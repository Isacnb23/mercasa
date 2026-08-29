"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import Container from "../../ui/Container";
import Reveal from "../../ui/Reveal";
import SoftCurve from "../../ui/SoftCurve";
import CustomerClassSection, { resolveChipTarget } from "../customer-class/CustomerClassSection";
import ProductCatalogModal from "../../modals/product-catalog/ProductCatalogModal";
import { businessSegments, site } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { HierarchyNode } from "@/lib/product-types";

function buildWhatsappHref(baseHref: string, message: string) {
  return `${baseHref}?text=${encodeURIComponent(message)}`;
}

// Réplica exacta de la referencia (ver rediseno-exacto-hablemos-de-
// negocios.md) — reemplaza por completo el panel navy del rediseño anterior
// (rediseno-contacto-y-mapa.md): tarjeta única clara (crema), NO navy.
const NAVY = "#0B2F63";
const CARD_BG = "#F6F2E9";

const ContactMap = dynamic(() => import("./ContactMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#F2F3F0]" />,
});

/**
 * Productos, Contacto y Footer comparten el mismo lienzo navy oscuro (el fondo
 * fijo de AmbientBackdrop) — el "cambio de capítulo" se logra con tarjetas
 * claras flotando encima, no con un cambio de color de página. El mapa
 * (estilo "positron" claro) vive enmarcado dentro de una tarjeta tipo mapa
 * impreso, a juego con el resto de la sección en vez de ser el único
 * contraste oscuro.
 */
export default function ContactSection({ families = [] }: { families?: HierarchyNode[] }) {
  const t = useTranslations("Contact");

  // Único estado de segmento para las DOS secciones (Customer Class +
  // Hablemos de negocios, ver rediseno-customer-class-spec-completo.md):
  // aunque ahora son dos <section> independientes en el DOM, el estado
  // sigue viviendo acá arriba para no perder la contextualización del
  // WhatsApp de cierre con el segmento elegido en Customer Class.
  const [activeSegmentKey, setActiveSegmentKey] = useState("supermercados");
  const activeSegment = businessSegments.find((seg) => seg.key === activeSegmentKey) ?? businessSegments[0];
  const whatsappHref = buildWhatsappHref(
    site.whatsappHref,
    t("segmentsWhatsappMessage", { noun: t(`segments.${activeSegment.key}.whatsappNoun`) })
  );

  // Catálogo abierto desde un chip de "categorías" o el botón "Explorar
  // productos" de Customer Class (ver customer-class-chips-reales.md y
  // rediseno-customer-class-spec-completo.md) — mismo patrón de
  // ProductExplorer (family+categoryId en vez de un booleano "open"):
  // `catalogFamily` es null cuando no hay ninguna abierta, así que
  // ProductCatalogModal se desmonta por completo al cerrar en vez de solo
  // ocultarse.
  const [catalogFamilyId, setCatalogFamilyId] = useState<string | null>(null);
  const [catalogCategoryId, setCatalogCategoryId] = useState<string | undefined>(undefined);
  const catalogFamily = families.find((f) => f.id === catalogFamilyId) ?? null;
  const closeCatalog = () => {
    setCatalogFamilyId(null);
    setCatalogCategoryId(undefined);
  };

  // Resuelve el chip/categoría clickeado (ver resolveChipTarget en
  // CustomerClassSection.tsx) contra los datos reales de MercasaVIP y abre
  // el catálogo posicionado ahí. Si `families` todavía no llegó (fetch en
  // curso o falló) o el slug no matchea nada real, no hace nada — el chip
  // queda igual de clickeable, solo que esta vez no encuentra destino (no
  // vale la pena un estado de error visible para un caso tan puntual).
  const handleSelectCategory = (categoryKey: string) => {
    const resolved = resolveChipTarget(families, categoryKey);
    if (!resolved) return;
    setCatalogFamilyId(resolved.familyId);
    setCatalogCategoryId(resolved.categoryId);
  };

  // Botón "Explorar productos" del panel de Customer Class: mismo
  // comportamiento que ya tenían los chips, aplicado a la primera categoría
  // del segmento activo — no es un botón nuevo sin función (ver spec).
  const handleExploreProducts = () => {
    handleSelectCategory(activeSegment.categories[0]);
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
      {/* Customer Class ahora es su propia sección independiente, ubicada
          antes de "Hablemos de negocios" (ver
          rediseno-customer-class-spec-completo.md — reemplaza por completo
          el módulo anterior de dos columnas dentro de esta tarjeta). El
          estado del segmento activo se queda acá arriba (ver comentario en
          los hooks) para que el WhatsApp de cierre de abajo siga
          contextualizado. */}
      <CustomerClassSection
        activeKey={activeSegmentKey}
        onSelect={setActiveSegmentKey}
        onSelectCategory={handleSelectCategory}
        onExploreProducts={handleExploreProducts}
      />

      {catalogFamily && (
        <ProductCatalogModal
          family={catalogFamily}
          allFamilies={families}
          initialCategoryId={catalogCategoryId}
          onClose={closeCatalog}
        />
      )}

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
        {/* El seam Customer Class → Contacto ya lo marca la curva inferior de
            CustomerClassSection; acá solo se agrega la de salida hacia el
            Footer (que cierra en un tono distinto, #F3F5F7) para no
            duplicar el mismo trazo. Fondo blanco (ver
            ajustes-customer-class-4-puntos.md, punto 4): alterna con el
            beige de Customer Class arriba — antes ambas secciones eran
            beige y se sentían pegadas/mezcladas. id="hablemos-de-negocios" es
            el target directo del ítem "Contacto" del nav (ver
            navbar-customer-class.md — antes "Contacto" apuntaba a
            CustomerClassSection, que ahora tiene su propio ítem con id
            "customer-class"). El mismo id también lo usa el CTA "Contactar
            sobre..." de CustomerClassSection (ver customer-class-fixes.md,
            punto 4) para bajar el usuario hasta el WhatsApp ya personalizado
            con el segmento elegido arriba. */}
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
              className="mx-auto mt-4 max-w-[700px] text-[15px] leading-[1.55] md:text-[16px]"
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
                  <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: "#5C6B7D" }}>
                    {t("infoDescription")}
                  </p>
                </div>

                <div>
                  <InfoRow icon={MapPin} title={t("sedeTitle")}>
                    {site.address.line1}
                    <br />
                    {site.address.line2} · CP {site.address.postalCode}
                  </InfoRow>
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
                    className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-full px-6 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                    style={{ background: NAVY, boxShadow: "0 12px 28px rgba(11,47,99,0.28)" }}
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    {t("whatsappCta")}
                  </motion.a>
                  <motion.a
                    href={site.phoneHref}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-full bg-white px-6 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(11,47,99,0.04)]"
                    style={{ border: `1.5px solid ${NAVY}`, color: NAVY }}
                  >
                    <Phone className="h-4 w-4" />
                    {t("callCta")}
                  </motion.a>
                </div>
              </div>

              {/* Columna derecha (~60%): mapa a pantalla completa, sin marco
                  propio — el corte lo da el rounded-[30px] del contenedor
                  único que lo envuelve. */}
              <div className="relative min-h-[360px] lg:min-h-0">
                <div ref={mapHostRef} className="absolute inset-0 bg-[#F2F3F0]">
                  {mapInView ? <ContactMap /> : <div className="absolute inset-0 bg-[#F2F3F0]" />}
                  {/* Viñeta sutil para que el marco se sienta intencional aun si
                      el mapa todavía está cargando teselas. */}
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_12px_rgba(16,37,63,0.06)]" />

                  {/* Tarjeta flotante compacta (ver
                      rediseno-exacto-hablemos-de-negocios.md, punto 6): en
                      vez del botón "Cómo llegar" con menú Google Maps/Waze,
                      ahora un link de texto directo a Google Maps. */}
                  <div
                    className="absolute bottom-4 left-4 max-w-[240px] bg-white p-3.5"
                    style={{ borderRadius: "14px", boxShadow: "0 10px 24px -6px rgba(0,0,0,0.2)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: NAVY }} />
                      <p className="text-[12.5px] font-bold" style={{ color: NAVY, letterSpacing: "0.01em" }}>
                        {t("mapCardTitle")}
                      </p>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug" style={{ color: "#5C6B7D" }}>
                      {site.address.line1}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${site.address.lat},${site.address.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold transition hover:gap-1.5"
                      style={{ color: NAVY }}
                    >
                      {t("openInGoogleMaps")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
  last = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  last?: boolean;
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
        <p className="text-[11.5px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: NAVY }}>
          {title}
        </p>
        <p className="mt-1 break-words text-[14px] leading-[1.55]" style={{ color: "#3A4A5F" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.51 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.57-.36.76-.36h.55c.18 0 .42-.03.65.5.24.55.81 1.93.88 2.07.07.14.12.3.02.49-.1.19-.15.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.13.57.17.29.75 1.24 1.61 2 1.11.99 2.04 1.3 2.33 1.44.29.15.46.13.63-.07.17-.2.72-.85.91-1.14.19-.29.38-.24.63-.14.26.1 1.63.77 1.91.91.29.14.48.21.55.34.07.13.07.75-.17 1.43Z" />
    </svg>
  );
}
