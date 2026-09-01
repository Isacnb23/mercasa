import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/sections/legal/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.terms" });
  return { title: t("metaTitle") };
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
