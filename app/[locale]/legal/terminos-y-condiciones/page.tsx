import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/sections/legal/LegalPage";

// SITE_URL/slug repetidos acá (no importados desde layout.tsx) — mismo
// criterio que el resto del proyecto: son constantes chicas, no vale la
// pena una capa de indirección extra. Si cambia el dominio o el slug,
// actualizar layout.tsx, sitemap.ts y esta página juntos.
// Ver seo-corregir-dominio.md: dominio real es "mercasacr.com" (sin "www",
// ".com"), HTTP por ahora — mismo criterio que app/[locale]/layout.tsx.
const SITE_URL = "http://mercasacr.com";
const PAGE_PATH = "/legal/terminos-y-condiciones";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.terms" });
  // Descripción/canonical propios de esta página (ver
  // seo-mejora-diferenciacion.md, puntos 1 y 5) — a diferencia de la home,
  // NO hereda la description genérica del layout raíz.
  const canonicalUrl = locale === "en" ? `${SITE_URL}/en${PAGE_PATH}` : `${SITE_URL}${PAGE_PATH}`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        es: `${SITE_URL}${PAGE_PATH}`,
        en: `${SITE_URL}/en${PAGE_PATH}`,
      },
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Legal");
  const tTerms = await getTranslations("Legal.terms");
  const sections = tTerms.raw("sections") as { title: string; body: string }[];

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={tTerms("title")}
      lastUpdated={t("lastUpdated", { date: t("publishDate") })}
      sections={sections}
    />
  );
}
