"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, Compass, Mail, MapPin, Navigation, Phone } from "lucide-react";
import Container from "./Container";
import Reveal from "./Reveal";
import SoftCurve from "./SoftCurve";
import { site } from "@/lib/data";

const ContactMap = dynamic(() => import("./ContactMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#F6F1E6]" />,
});

/* Menú "Cómo llegar": un solo botón que despliega dos opciones (Google Maps /
   Waze) en vez de un link directo — coordenadas puras en ambos links, nunca
   el nombre "Mercasa" como búsqueda de texto, por la ferretería homónima en
   Agua Caliente que Google prioriza por reseñas. Se cierra al hacer clic
   fuera (listener en document, solo mientras está abierto). */
function DirectionsMenu({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("Contact");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const googleHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeHref = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
        style={{ borderRadius: "8px", background: "#075FD8" }}
      >
        {t("directionsCta")}
        <Navigation className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden"
            style={{
              borderRadius: "10px",
              border: "1px solid rgba(7,95,216,0.25)",
              background: "#0c1a2e",
              boxShadow: "0 14px 34px rgba(0,0,0,0.45), 0 0 0 1px rgba(7,95,216,0.06)",
            }}
          >
            <a
              role="menuitem"
              href={googleHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[rgba(7,95,216,0.16)]"
            >
              <Navigation className="h-3.5 w-3.5 shrink-0" style={{ color: "#6ba5ff" }} />
              {t("openInGoogleMaps")}
            </a>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <a
              role="menuitem"
              href={wazeHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[rgba(7,95,216,0.16)]"
            >
              <Compass className="h-3.5 w-3.5 shrink-0" style={{ color: "#6ba5ff" }} />
              {t("openInWaze")}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Marcas, Contacto y Footer comparten el mismo lienzo navy oscuro (el fondo
 * fijo de AmbientBackdrop) — el "cambio de capítulo" se logra con tarjetas
 * claras flotando encima, no con un cambio de color de página. El mapa
 * (estilo "positron" claro) vive enmarcado dentro de una tarjeta tipo mapa
 * impreso, a juego con el resto de la sección en vez de ser el único
 * contraste oscuro.
 */
export default function ContactSection() {
  const t = useTranslations("Contact");

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
    <section
      id="contacto"
      className="relative scroll-mt-20 overflow-hidden py-24 md:py-28"
      style={{ background: "#F7F3EB" }}
    >
      {/* El seam Marcas → Contacto ya lo marca la curva inferior de Marcas;
          acá solo se agrega la de salida hacia el Footer (que cierra en un
          tono distinto, #F3F5F7) para no duplicar el mismo trazo. */}
      <SoftCurve position="bottom" flip />

      <Container className="relative z-10">
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

        <div className="mt-12 grid min-w-0 gap-[22px] lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          {/* Info + CTAs */}
          <Reveal
            once
            className="flex min-w-0 flex-col justify-between gap-8 bg-white p-[26px] sm:p-[28px]"
            style={{
              borderRadius: "20px",
              border: "1px solid #D8E1EC",
              boxShadow: "0 16px 50px rgba(16,37,63,0.10)",
            }}
          >
            <div>
              <InfoRow icon={MapPin} title={t("sedeTitle")}>
                {site.address.line1}
                <br />
                {site.address.line2} · CP {site.address.postalCode}
              </InfoRow>
              <InfoRow icon={Phone} title={t("telefonoTitle")}>
                <a href={site.phoneHref} className="transition hover:text-[#075FD8]">
                  {site.phone}
                </a>{" "}
                · {site.phonesExtra.join(" · ")}
              </InfoRow>
              <InfoRow icon={Mail} title={t("correosTitle")}>
                <a
                  href={`mailto:${site.emails.comunicaciones}`}
                  className="transition hover:text-[#075FD8]"
                >
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

            <div className="flex flex-wrap items-center gap-3">
              <motion.a
                href={site.whatsappHref}
                target="_blank"
                rel="noreferrer"
                whileTap={{ scale: 0.97 }}
                className="inline-flex h-[50px] items-center gap-2.5 px-6 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                style={{
                  borderRadius: "10px",
                  background: "#075FD8",
                  boxShadow: "0 6px 18px rgba(7,95,216,0.30)",
                }}
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                {t("whatsappCta")}
              </motion.a>
              <motion.a
                href={site.phoneHref}
                whileTap={{ scale: 0.97 }}
                className="inline-flex h-[50px] items-center gap-2.5 px-6 text-sm font-semibold transition duration-300 hover:-translate-y-0.5"
                style={{
                  borderRadius: "10px",
                  border: "1px solid rgba(7,95,216,0.5)",
                  color: "#082B5C",
                  background: "#ffffff",
                }}
              >
                <Phone className="h-4 w-4" style={{ color: "#075FD8" }} />
                {t("callCta")}
              </motion.a>
            </div>
          </Reveal>

          {/* Mapa: se queda dark a propósito (único contraste oscuro dentro
              de la sección clara) — marco/sombra igual al de la vitrina de
              Marcas para que se distinga bien del fondo alrededor. */}
          <Reveal
            delay={0.1}
            once
            className="group relative min-h-[420px] w-full min-w-0 overflow-hidden lg:min-h-0"
            style={{
              borderRadius: "20px",
              border: "1px solid #D8E1EC",
              boxShadow: "0 20px 50px rgba(16,37,63,0.10)",
            }}
          >
            <div ref={mapHostRef} className="relative h-full min-h-[420px] w-full bg-[#F6F1E6] lg:min-h-0">
              {mapInView ? <ContactMap /> : <div className="absolute inset-0 bg-[#F6F1E6]" />}
              {/* Viñeta sutil para que el marco se sienta intencional aun si
                  el mapa todavía está cargando teselas — aclarada a juego
                  con el mapa claro (antes oscurecía bordes sobre un mapa
                  dark). */}
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_50px_16px_rgba(16,37,63,0.12)]" />

              {/* Tarjeta flotante superpuesta: en la esquina inferior
                  izquierda, lejos del pin (centrado en el mapa) y de los
                  controles de zoom (arriba a la derecha), para que el pin
                  respire sin competir con otro elemento azul fuerte. */}
              <div
                className="absolute bottom-4 left-4 max-w-[280px] bg-white p-4"
                style={{
                  borderRadius: "12px",
                  boxShadow: "0 14px 30px -10px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: "#12233f" }} />
                  <p className="text-[13px] font-bold" style={{ color: "#12233f", letterSpacing: "0.02em" }}>
                    {t("mapCardTitle")}
                  </p>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: "rgba(18,35,63,0.65)" }}>
                  {site.address.line1}
                </p>
                <div className="mt-3">
                  <DirectionsMenu lat={site.address.lat} lng={site.address.lng} />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
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
    <div className="flex gap-3.5">
      <span
        className="flex h-[58px] w-[58px] shrink-0 items-center justify-center"
        style={{
          borderRadius: "12px",
          background: "rgba(7,95,216,0.05)",
          border: "1px solid rgba(7,95,216,0.16)",
        }}
      >
        <Icon className="h-6 w-6" style={{ color: "#075FD8" }} />
      </span>
      <div
        className={`min-w-0 flex-1 pb-4 ${!last ? "border-b" : ""}`}
        style={!last ? { borderColor: "rgba(15,40,75,0.11)" } : undefined}
      >
        <p
          className="text-[13px] font-bold"
          style={{ letterSpacing: "0.04em", color: "#075FD8" }}
        >
          {title.toUpperCase()}
        </p>
        <p className="mt-1 break-words text-[14px] leading-[1.55]" style={{ color: "#0c1a26" }}>
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
