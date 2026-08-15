"use client";

import { useId } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from "lucide-react";
import Reveal from "./Reveal";
import SeamArc from "./SeamArc";
import { site } from "@/lib/data";

const ContactMap = dynamic(() => import("./ContactMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-navy-950" />,
});

/* Curva azul de cierre, propia de esta sección: trazo fino + halo suave y un
   punto de brillo cerca del centro/derecha, sobre la curva orgánica. */
function ContactBottomCurve() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full sm:h-16"
      viewBox="0 0 1920 100"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`contact-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#367FF7" stopOpacity="0" />
          <stop offset="50%" stopColor="#367FF7" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#367FF7" stopOpacity="0" />
        </linearGradient>
        <filter id={`contact-curve-glow-${uid}`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <path
        d="M0,58 C 440,20 1180,86 1920,42"
        stroke={`url(#contact-curve-${uid})`}
        strokeWidth={6}
        strokeLinecap="round"
        filter={`url(#contact-curve-glow-${uid})`}
        opacity={0.35}
      />
      <path
        d="M0,58 C 440,20 1180,86 1920,42"
        stroke={`url(#contact-curve-${uid})`}
        strokeWidth={1.1}
      />
      {/* punto de brillo sutil cerca del centro/derecha */}
      <circle cx="1180" cy="58" r="3.2" fill="#8fc1ff" opacity="0.9" filter={`url(#contact-curve-glow-${uid})`} />
      <circle cx="1180" cy="58" r="2" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

/* Puntos decorativos azules en ambos extremos, alrededor de la altura de las
   tarjetas — se apagan progresivamente hacia el centro. */
function ContactDots({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-1/2 hidden h-[420px] w-[200px] -translate-y-1/2 sm:block ${
        side === "left" ? "left-0" : "right-0"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(59,123,255,0.65) 1.1px, transparent 1.6px)",
        backgroundSize: "24px 24px",
        maskImage:
          side === "left"
            ? "radial-gradient(60% 80% at 0% 50%, black 0%, transparent 75%)"
            : "radial-gradient(60% 80% at 100% 50%, black 0%, transparent 75%)",
        WebkitMaskImage:
          side === "left"
            ? "radial-gradient(60% 80% at 0% 50%, black 0%, transparent 75%)"
            : "radial-gradient(60% 80% at 100% 50%, black 0%, transparent 75%)",
        opacity: 0.5,
      }}
    />
  );
}

/**
 * Marcas, Contacto y Footer comparten el mismo lienzo navy oscuro (el fondo
 * fijo de AmbientBackdrop) — el "cambio de capítulo" se logra con tarjetas
 * claras flotando encima, no con un cambio de color de página. El mapa 3D
 * se mantiene como una "ventana" oscura enmarcada dentro de una tarjeta
 * clara tipo mapa impreso, no como fondo de toda la sección.
 */
export default function ContactSection() {
  const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${site.address.lat},${site.address.lng}`;
  const googleDirectionsHref = `https://www.google.com/maps/dir/?api=1&destination=${site.address.lat},${site.address.lng}`;

  return (
    <section
      id="contacto"
      className="relative scroll-mt-20 overflow-hidden py-24 md:py-28"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, rgba(30,100,220,0.07), transparent 48%)",
      }}
    >
      <SeamArc
        flip
        className="pointer-events-none absolute inset-x-0 top-0 h-20 w-full sm:h-28"
      />
      <ContactDots side="left" />
      <ContactDots side="right" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-3 text-[13px] font-semibold uppercase"
            style={{ letterSpacing: "0.22em", color: "#388CFF" }}
          >
            <span className="h-px w-6" style={{ background: "rgba(56,140,255,0.5)" }} />
            Contacto
            <span className="h-px w-6" style={{ background: "rgba(56,140,255,0.5)" }} />
          </span>
          <h2
            className="mt-5 font-display font-medium tracking-tight"
            style={{ fontSize: "48px", lineHeight: 1.05, color: "rgba(255,255,255,0.96)" }}
          >
            Hablemos de negocios
          </h2>
          <p
            className="mx-auto mt-4 max-w-[700px] text-[15px] leading-[1.55] md:text-[16px]"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Visítenos en nuestro CEDI en El Tejar de El Guarco, Cartago, o
            escríbanos directamente — atendemos proveedores internacionales y
            clientes locales.
          </p>
        </Reveal>

        <div className="mt-12 grid min-w-0 gap-[22px] lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          {/* Info + CTAs */}
          <Reveal
            className="flex min-w-0 flex-col justify-between gap-8 bg-white p-[26px] sm:p-[28px]"
            style={{
              borderRadius: "16px",
              boxShadow: "0 20px 45px rgba(0,0,0,0.16), 0 0 0 1px rgba(35,95,180,0.08)",
            }}
          >
            <div>
              <InfoRow icon={MapPin} title="Sede central (CEDI)">
                {site.address.line1}
                <br />
                {site.address.line2} · CP {site.address.postalCode}
              </InfoRow>
              <InfoRow icon={Phone} title="Teléfono central">
                <a href={site.phoneHref} className="transition hover:text-[#2468E8]">
                  {site.phone}
                </a>{" "}
                · {site.phonesExtra.join(" · ")}
              </InfoRow>
              <InfoRow icon={Mail} title="Correos oficiales">
                <a
                  href={`mailto:${site.emails.comunicaciones}`}
                  className="transition hover:text-[#2468E8]"
                >
                  {site.emails.comunicaciones}
                </a>
                <br />
                <a href={`mailto:${site.emails.rh}`} className="transition hover:text-[#2468E8]">
                  {site.emails.rh}
                </a>{" "}
                (RH)
              </InfoRow>
              <InfoRow icon={Clock} title="Horario de atención" last>
                Lunes a viernes, horario de oficina
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
                  background: "linear-gradient(135deg, #1754D8, #216CF2)",
                  boxShadow: "0 6px 18px rgba(30,100,240,0.25)",
                }}
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Escríbanos por WhatsApp
              </motion.a>
              <motion.a
                href={site.phoneHref}
                whileTap={{ scale: 0.97 }}
                className="inline-flex h-[50px] items-center gap-2.5 px-6 text-sm font-semibold transition duration-300 hover:-translate-y-0.5"
                style={{
                  borderRadius: "10px",
                  border: "1px solid rgba(40,105,230,0.65)",
                  color: "#12233f",
                  background: "#ffffff",
                }}
              >
                <Phone className="h-4 w-4" style={{ color: "#2468E8" }} />
                Llamar ahora
              </motion.a>
            </div>
          </Reveal>

          {/* Mapa: el propio mapa funciona como tarjeta */}
          <Reveal
            delay={0.1}
            className="group relative min-h-[420px] w-full min-w-0 overflow-hidden lg:min-h-0"
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(80,135,235,0.55)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.20), 0 0 20px rgba(35,105,245,0.06)",
            }}
          >
            <div className="relative h-full min-h-[420px] w-full bg-navy-950 lg:min-h-0">
              <ContactMap />
              {/* Viñeta sutil para que el marco se sienta intencional aun si
                  el mapa todavía está cargando teselas. */}
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_20px_rgba(6,15,24,0.4)]" />

              {/* Tarjeta flotante superpuesta */}
              <div
                className="absolute left-4 top-4 max-w-[280px] bg-white p-4"
                style={{
                  borderRadius: "12px",
                  boxShadow: "0 14px 30px -10px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: "#12233f" }} />
                  <p className="text-[13px] font-bold" style={{ color: "#12233f", letterSpacing: "0.02em" }}>
                    CEDI - El Guarco
                  </p>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: "rgba(18,35,63,0.65)" }}>
                  {site.address.line1}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={googleMapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
                    style={{ borderRadius: "8px", background: "#2468E8" }}
                  >
                    Abrir en Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={googleDirectionsHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Cómo llegar"
                    title="Cómo llegar"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center transition hover:bg-[rgba(36,104,232,0.08)]"
                    style={{ borderRadius: "8px", border: "1px solid rgba(36,104,232,0.35)" }}
                  >
                    <Navigation className="h-3.5 w-3.5" style={{ color: "#2468E8" }} />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <ContactBottomCurve />
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
          background: "rgba(37,99,235,0.035)",
          border: "1px solid rgba(37,99,235,0.14)",
        }}
      >
        <Icon className="h-6 w-6" style={{ color: "#2468E8" }} />
      </span>
      <div
        className={`min-w-0 flex-1 pb-4 ${!last ? "border-b" : ""}`}
        style={!last ? { borderColor: "rgba(15,40,75,0.11)" } : undefined}
      >
        <p
          className="text-[13px] font-bold"
          style={{ letterSpacing: "0.04em", color: "#2468E8" }}
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
