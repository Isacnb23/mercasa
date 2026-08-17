import Image from "next/image";
import { useId } from "react";
import { getTranslations } from "next-intl/server";
import { ChevronRight, MapPin, Mail, Phone } from "lucide-react";
import { navLinks, site } from "@/lib/data";
import logo from "@/public/brand/mercasa-logo-white.png";

/* lucide-react ya no incluye íconos de marcas (Facebook/LinkedIn/Instagram),
   así que los tres se dibujan a mano como SVG simples, mismo trazo. */
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 9H15V6.5h-1.5C11.6 6.5 10 8.1 10 10.2V12H8v2.5h2V21h2.5v-6.5H15l.5-2.5h-3v-1.6c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.94 8.5H4.06V19.5h2.88V8.5ZM5.5 4a1.66 1.66 0 1 0 0 3.32A1.66 1.66 0 0 0 5.5 4ZM19.94 19.5v-6.06c0-3.25-1.74-4.76-4.06-4.76-1.87 0-2.71 1.03-3.18 1.75V8.5H9.82c.04.83 0 11 0 11h2.88v-6.14c0-.33.02-.66.12-.9.26-.66.86-1.35 1.87-1.35 1.32 0 1.85.99 1.85 2.45v5.94Z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Círculo con borde azul #2F8CFF, ~43px, mismo tratamiento para los tres,
   aunque LinkedIn/Instagram todavía no tengan URL real. */
function SocialIcon({
  href,
  label,
  pendingLabel,
  children,
}: {
  href: string;
  label: string;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const isPlaceholder = href === "#";
  return (
    <a
      href={href}
      target={isPlaceholder ? undefined : "_blank"}
      rel={isPlaceholder ? undefined : "noopener noreferrer"}
      aria-label={label}
      title={isPlaceholder ? pendingLabel : label}
      className="flex h-[43px] w-[43px] items-center justify-center rounded-full border border-[rgba(47,140,255,0.65)] text-[#2F8CFF] transition duration-300 hover:-translate-y-px hover:border-[#2F8CFF] hover:bg-[rgba(47,140,255,0.08)]"
    >
      {children}
    </a>
  );
}

/* Curva de costura azul, propia del footer: trazo fino + halo de brillo
   suave, con la ligera curva orgánica de la referencia (no una línea recta). */
function FooterTopCurve() {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-14 w-full sm:h-16"
      viewBox="0 0 1920 80"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={`footer-curve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#248BFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#248BFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#248BFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`footer-curve-glow-${uid}`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* halo desenfocado */}
      <path
        d="M0,46 C 420,4 1180,72 1920,30"
        stroke={`url(#footer-curve-${uid})`}
        strokeWidth={6}
        strokeLinecap="round"
        filter={`url(#footer-curve-glow-${uid})`}
        opacity={0.35}
      />
      {/* trazo nítido, ~1px */}
      <path
        d="M0,46 C 420,4 1180,72 1920,30"
        stroke={`url(#footer-curve-${uid})`}
        strokeWidth={1.1}
      />
    </svg>
  );
}

/* Puntos decorativos: solo en los extremos, desaparecen hacia el centro. */
function FooterDots({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-0 hidden h-full w-[220px] sm:block ${
        side === "left" ? "left-0" : "right-0"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(59,123,255,0.7) 1.1px, transparent 1.6px)",
        backgroundSize: "24px 24px",
        maskImage:
          side === "left"
            ? "linear-gradient(to right, black 0%, transparent 92%)"
            : "linear-gradient(to left, black 0%, transparent 92%)",
        WebkitMaskImage:
          side === "left"
            ? "linear-gradient(to right, black 0%, transparent 92%)"
            : "linear-gradient(to left, black 0%, transparent 92%)",
        opacity: 0.55,
      }}
    />
  );
}

export default async function Footer() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden pb-[35px] pt-[46px] sm:pt-[55px]"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(36,139,255,0.1), transparent 45%)," +
          /* Sutil profundización hacia el cierre — translúcida sobre el mismo
             lienzo navy compartido (AmbientBackdrop), no un relleno opaco
             nuevo, para que no exista una costura de color con Contacto. */
          "linear-gradient(180deg, rgba(4,14,26,0) 0%, rgba(3,10,20,0.4) 55%, rgba(2,8,16,0.62) 100%)",
      }}
    >
      <FooterTopCurve />
      <FooterDots side="left" />
      <FooterDots side="right" />

      <div className="relative z-10 mx-auto max-w-[1120px] px-6 md:px-0">
        <div className="grid grid-cols-1 gap-x-[55px] gap-y-10 sm:grid-cols-2 md:grid-cols-[1.25fr_0.7fr_1.25fr]">
          {/* Columna 1 — Mercasa */}
          <div className="sm:col-span-2 md:col-span-1">
            <Image src={logo} alt="Mercasa" className="h-auto w-[135px] md:w-[165px]" />
            <p className="mt-[22px] text-[14px] font-medium text-[#2F8CFF] md:text-[15px]">
              {t("tagline", { year: site.foundedYear })}
            </p>
            <span
              aria-hidden
              className="mt-[14px] block h-[2px] w-[48px] rounded-full"
              style={{ background: "#2F8CFF" }}
            />
            <p
              className="mt-4 max-w-sm text-[14px] leading-[1.7] md:text-[15px]"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {t("description")}
            </p>
          </div>

          {/* Columna 2 — Navegación */}
          <div className="md:border-l md:pl-12" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p
              className="text-[13px] font-bold uppercase md:text-[14px]"
              style={{ letterSpacing: "0.07em", color: "#2F8CFF" }}
            >
              {t("navTitle")}
            </p>
            <ul className="mt-5 flex flex-col gap-[17px] text-[15px] leading-none md:text-[16px]">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-2 transition hover:text-white"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    <ChevronRight
                      className="h-[14px] w-[14px] shrink-0 text-[#2F8CFF] transition group-hover:translate-x-0.5"
                    />
                    {tNav(link.key as "inicio" | "nosotros" | "logistica" | "marcas" | "contacto")}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Contacto */}
          <div className="md:border-l md:pl-12" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p
              className="text-[13px] font-bold uppercase md:text-[14px]"
              style={{ letterSpacing: "0.07em", color: "#2F8CFF" }}
            >
              {t("contactTitle")}
            </p>
            <ul className="mt-5 flex flex-col gap-[19px] text-[15px]">
              <li className="flex items-start gap-[14px]">
                <MapPin className="mt-0.5 h-[19px] w-[19px] shrink-0 text-[#2F8CFF]" />
                <span style={{ color: "rgba(255,255,255,0.85)" }}>{site.address.line1}</span>
              </li>
              <li className="flex items-center gap-[14px]">
                <Phone className="h-[19px] w-[19px] shrink-0 text-[#2F8CFF]" />
                <a
                  href={site.phoneHref}
                  className="transition hover:text-white"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-[14px]">
                <Mail className="h-[19px] w-[19px] shrink-0 text-[#2F8CFF]" />
                <a
                  href={`mailto:${site.emails.comunicaciones}`}
                  className="transition hover:text-white"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {site.emails.comunicaciones}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-[35px] border-t pt-6"
          style={{ borderColor: "rgba(255,255,255,0.13)" }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] md:text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("copyright", { year, name: site.name, parent: site.parentCompany })}
            </p>
            <div className="flex items-center gap-[14px]">
              <SocialIcon
                href={site.facebook}
                label={t("socialFacebook")}
                pendingLabel={t("socialPending", { label: t("socialFacebook") })}
              >
                <FacebookIcon className="h-[17px] w-[17px]" />
              </SocialIcon>
              <SocialIcon
                href={site.linkedin}
                label={t("socialLinkedin")}
                pendingLabel={t("socialPending", { label: t("socialLinkedin") })}
              >
                <LinkedinIcon className="h-[17px] w-[17px]" />
              </SocialIcon>
              {/* <SocialIcon
                href={site.instagram}
                label={t("socialInstagram")}
                pendingLabel={t("socialPending", { label: t("socialInstagram") })}
              >
                <InstagramIcon className="h-[17px] w-[17px]" />
              </SocialIcon> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
