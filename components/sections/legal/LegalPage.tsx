import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/ui/Container";
import Footer from "@/components/layout/Footer";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import logo from "@/public/models/mercasa-logo-transparent.png";

// Layout compartido por las páginas legales (Términos y Condiciones /
// Política de Privacidad, ver paginas-legales-terminos-privacidad.md) — NO
// reusa <Header/> a propósito: ese componente asume que vive en la home de
// una sola página (scroll-spy contra secciones con id, links con href="#..."),
// nada de eso existe acá. Esta es una barra mínima propia: logo (vuelve a
// inicio), selector de idioma, y un link explícito "Volver al sitio".
//
// AmbientBackdrop (fixed, z-[-50], navy oscuro) sigue detrás de TODO el sitio
// (ver app/[locale]/layout.tsx) — por eso este wrapper necesita su propio
// fondo blanco opaco + z-10, igual que cualquier otra sección del sitio
// (ver ContactSection.tsx), si no el texto quedaría ilegible sobre el navy.
export default async function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  sections,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  sections: { title: string; body: string }[];
}) {
  const t = await getTranslations("Legal");

  return (
    <div className="relative z-10 bg-white">
      <header className="border-b" style={{ borderColor: "#E8ECF1" }}>
        <Container className="flex h-[76px] items-center justify-between">
          <Link href="/" aria-label={t("logoAria")} className="flex items-center transition active:scale-95">
            <Image src={logo} alt="Mercasa" priority className="h-8 w-auto md:h-9" />
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold transition hover:opacity-70"
              style={{ color: "#075FD8" }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {t("backToSite")}
            </Link>
          </div>
        </Container>
      </header>

      <main className="pb-24 pt-14 md:pb-28 md:pt-20">
        <Container className="max-w-[860px]">
          <span
            className="text-[12px] font-bold uppercase"
            style={{ letterSpacing: "0.18em", color: "#075FD8" }}
          >
            {eyebrow}
          </span>
          <h1
            className="mt-4 font-display text-corp-ink"
            style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.1, fontWeight: 650 }}
          >
            {title}
          </h1>
          <p className="mt-4 text-[14px] font-medium" style={{ color: "#8493A5" }}>
            {lastUpdated}
          </p>
          <span aria-hidden className="mt-6 block h-[3px] w-[48px] rounded-full bg-corp-yellow" />

          <div className="mt-10 flex flex-col gap-9">
            {sections.map((section) => (
              <section key={section.title}>
                <h2
                  className="font-display text-corp-ink"
                  style={{ fontSize: "clamp(19px, 2.2vw, 22px)", lineHeight: 1.3, fontWeight: 650 }}
                >
                  {section.title}
                </h2>
                <p
                  className="mt-3 whitespace-pre-line text-[16px] leading-[1.75]"
                  style={{ color: "#3A4A5F" }}
                >
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
