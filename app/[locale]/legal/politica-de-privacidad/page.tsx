import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalPage from "@/components/sections/legal/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.privacy" });
  return { title: t("metaTitle") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Legal");
  const tPrivacy = await getTranslations("Legal.privacy");
  const sections = tPrivacy.raw("sections") as { title: string; body: string }[];

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={tPrivacy("title")}
      lastUpdated={t("lastUpdated", { date: t("publishDate") })}
      sections={sections}
    />
  );
}
