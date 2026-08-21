import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ChevronRight, MapPin, Mail, Phone } from "lucide-react";
import { navLinks, site } from "@/lib/data";
import logo from "@/public/models/mercasa-logo-transparent.png";

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

/* Círculo azul sólido de marca, ~43px, mismo tratamiento para los tres,
   aunque LinkedIn/Instagram todavía no tengan URL real. Antes era un
   círculo con solo borde e ícono azul sin relleno — contra el fondo claro
   del footer eso se leía casi invisible; ahora el ícono siempre es blanco
   sobre un fondo azul con contraste garantizado. Hover oscurece el azul en
   vez de invertir a blanco. */
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
      className="flex h-[43px] w-[43px] items-center justify-center rounded-full bg-[#185FA5] text-white transition duration-300 hover:-translate-y-px hover:bg-[#0C447C]"
    >
      {children}
    </a>
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
        /* Remate claro para cerrar el sitio: un tono distinto al de Contacto
           (#F7F3EB) para marcar el cierre, pero siempre dentro del mismo
           lenguaje claro — la curva de Contacto ya marca este cambio de tono. */
        background: "#F3F5F7",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[1120px] px-6 md:px-0">
        <div className="grid grid-cols-1 gap-x-[55px] gap-y-10 sm:grid-cols-2 md:grid-cols-[1.25fr_0.7fr_1.25fr]">
          {/* Columna 1 — Mercasa */}
          <div className="sm:col-span-2 md:col-span-1">
            <Image src={logo} alt="Mercasa" className="h-auto w-[135px] md:w-[165px]" />
            {/* Único acento amarillo del footer, a propósito: el color de
                marca cierra el sitio en vez de quedar ausente en la última
                sección — el texto va en marino, el subrayado en amarillo. */}
            <p className="mt-[22px] text-[14px] font-medium text-corp-ink md:text-[15px]">
              {t("tagline", { year: site.foundedYear })}
            </p>
            <span
              aria-hidden
              className="mt-[14px] block h-[2px] w-[48px] rounded-full bg-corp-yellow"
            />
            <p className="mt-4 max-w-sm text-[14px] leading-[1.7] md:text-[15px]" style={{ color: "#3A4A5F" }}>
              {t("description")}
            </p>
          </div>

          {/* Columna 2 — Navegación */}
          <div className="md:border-l md:pl-12" style={{ borderColor: "#E2E8F0" }}>
            <p
              className="text-[13px] font-bold uppercase md:text-[14px]"
              style={{ letterSpacing: "0.07em", color: "#075FD8" }}
            >
              {t("navTitle")}
            </p>
            <ul className="mt-5 flex flex-col gap-[17px] text-[15px] leading-none md:text-[16px]">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-2 transition hover:text-[#075FD8]"
                    style={{ color: "#3A4A5F" }}
                  >
                    <ChevronRight
                      className="h-[14px] w-[14px] shrink-0 text-[#075FD8] transition group-hover:translate-x-0.5"
                    />
                    {tNav(link.key as "inicio" | "nosotros" | "logistica" | "marcas" | "contacto")}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Contacto */}
          <div className="md:border-l md:pl-12" style={{ borderColor: "#E2E8F0" }}>
            <p
              className="text-[13px] font-bold uppercase md:text-[14px]"
              style={{ letterSpacing: "0.07em", color: "#075FD8" }}
            >
              {t("contactTitle")}
            </p>
            <ul className="mt-5 flex flex-col gap-[19px] text-[15px]">
              <li className="flex items-start gap-[14px]">
                <MapPin className="mt-0.5 h-[19px] w-[19px] shrink-0 text-[#075FD8]" />
                <span style={{ color: "#3A4A5F" }}>{site.address.line1}</span>
              </li>
              <li className="flex items-center gap-[14px]">
                <Phone className="h-[19px] w-[19px] shrink-0 text-[#075FD8]" />
                <a href={site.phoneHref} className="transition hover:text-[#075FD8]" style={{ color: "#3A4A5F" }}>
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-[14px]">
                <Mail className="h-[19px] w-[19px] shrink-0 text-[#075FD8]" />
                <a
                  href={`mailto:${site.emails.comunicaciones}`}
                  className="transition hover:text-[#075FD8]"
                  style={{ color: "#3A4A5F" }}
                >
                  {site.emails.comunicaciones}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-[35px] border-t pt-6" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] md:text-[13px] text-slate-500">
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
