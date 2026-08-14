"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import Reveal from "./Reveal";
import SeamArc from "./SeamArc";
import { site } from "@/lib/data";

const ContactMap = dynamic(() => import("./ContactMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-navy-950" />,
});

/**
 * Marcas, Contacto y Footer comparten el mismo lienzo navy oscuro (el fondo
 * fijo de AmbientBackdrop) — el "cambio de capítulo" se logra con tarjetas
 * claras flotando encima, no con un cambio de color de página. El mapa 3D
 * se mantiene como una "ventana" oscura enmarcada dentro de una tarjeta
 * clara tipo mapa impreso, no como fondo de toda la sección.
 */
export default function ContactSection() {
  const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${site.address.lat},${site.address.lng}`;

  return (
    <section id="contacto" className="relative scroll-mt-20 overflow-hidden py-28 md:py-36">
      <SeamArc
        flip
        className="pointer-events-none absolute inset-x-0 top-0 h-20 w-full sm:h-28"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">
            <span className="h-px w-6 bg-teal-400/50" />
            Contacto
            <span className="h-px w-6 bg-teal-400/50" />
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Hablemos de negocios
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-mist-200/70">
            Visítenos en nuestro CEDI en El Tejar de El Guarco, Cartago, o
            escríbanos directamente — atendemos proveedores internacionales y
            clientes locales.
          </p>
        </Reveal>

        <div className="mt-14 grid min-w-0 gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-stretch">
          {/* Info + CTAs */}
          <Reveal className="flex min-w-0 flex-col justify-between space-y-8 rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(4,10,22,0.6)] transition-transform duration-500 hover:-translate-y-1.5 sm:p-8">
            <div className="space-y-5">
              <InfoRow icon={MapPin} title="Sede central (CEDI)">
                {site.address.line1}
                <br />
                {site.address.line2} · CP {site.address.postalCode}
              </InfoRow>
              <InfoRow icon={Phone} title="Teléfono central">
                <a href={site.phoneHref} className="transition hover:text-teal-700">
                  {site.phone}
                </a>{" "}
                · {site.phonesExtra.join(" / ")}
              </InfoRow>
              <InfoRow icon={Mail} title="Correos oficiales">
                <a
                  href={`mailto:${site.emails.comunicaciones}`}
                  className="transition hover:text-teal-700"
                >
                  {site.emails.comunicaciones}
                </a>
                <br />
                <a href={`mailto:${site.emails.rh}`} className="transition hover:text-teal-700">
                  {site.emails.rh}
                </a>{" "}
                (RH)
              </InfoRow>
              <InfoRow icon={Clock} title="Horario de atención">
                Lunes a viernes, horario de oficina
              </InfoRow>

              <a
                href={googleMapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 pt-1 text-xs font-semibold text-navy-900/40 transition hover:text-navy-900"
              >
                Ver en Google Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.a
                href={site.whatsappHref}
                target="_blank"
                rel="noreferrer"
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3.5 text-sm font-semibold text-navy-950 shadow-lg shadow-teal-500/20 transition duration-300 hover:-translate-y-1 hover:brightness-110"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Escríbanos por WhatsApp
              </motion.a>
              <motion.a
                href={site.phoneHref}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-navy-900/12 bg-mist-50 px-6 py-3.5 text-sm font-semibold text-navy-950 transition duration-300 hover:-translate-y-1 hover:bg-mist-100"
              >
                <Phone className="h-4 w-4" />
                Llamar ahora
              </motion.a>
            </div>
          </Reveal>

          {/* Mapa 3D, enmarcado como una tarjeta clara tipo "mapa impreso" */}
          <Reveal
            delay={0.1}
            className="group relative min-h-[360px] w-full min-w-0 rounded-[28px] bg-white p-2.5 shadow-[0_40px_80px_-40px_rgba(4,10,22,0.6)] transition-transform duration-500 hover:-translate-y-1.5 lg:min-h-0"
          >
            <div className="relative h-full min-h-[330px] w-full overflow-hidden rounded-[22px] bg-navy-950 lg:min-h-0">
              <ContactMap />
              {/* Viñeta sutil para que el marco se sienta intencional aun si
                  el mapa todavía está cargando teselas. */}
              <div className="pointer-events-none absolute inset-0 rounded-[22px] shadow-[inset_0_0_60px_20px_rgba(6,15,24,0.55)]" />
              <span className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-navy-950/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-100/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                CEDI · El Guarco
              </span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Ceja/arco que funde el cierre de Contacto con el inicio del Footer */}
      <SeamArc className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full sm:h-28" />
    </section>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-900/40">{title}</p>
        <p className="mt-0.5 break-words text-sm leading-relaxed text-navy-900">{children}</p>
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
