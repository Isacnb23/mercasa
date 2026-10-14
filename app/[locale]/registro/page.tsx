import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Container from "@/components/ui/Container";
import Footer from "@/components/layout/Footer";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import RegistrationFlow from "@/components/registration/RegistrationFlow";
import { REGISTRATION_ENABLED } from "@/lib/feature-flags";
import logo from "@/public/models/mercasa-logo-transparent.png";

// Registro de clientes. Sin NEXT_PUBLIC_ENABLE_REGISTRATION=true la ruta no existe (404). Mismo marco mínimo que
// las páginas legales (logo, idioma, "Volver al sitio") y fondo blanco opaco sobre el AmbientBackdrop del sitio.
// No se indexa: es un formulario, no contenido.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Registration" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function RegistroPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!REGISTRATION_ENABLED) notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Legal");

  return (
    <div className="relative z-10 min-h-screen bg-white">
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

      <main className="pb-24 pt-12 md:pb-28 md:pt-16">
        <Container>
          <RegistrationFlow />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
