import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "@fontsource-variable/inter";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";
import "@fontsource/spectral/700.css";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/data";
import SmoothScroll from "@/components/SmoothScroll";
import PageLoader from "@/components/PageLoader";
import AmbientBackdrop from "@/components/AmbientBackdrop";

const SITE_URL = "https://www.mercasa.cr";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  // hreflang: la raíz sirve español sin prefijo (routing.localePrefix
  // "as-needed"), /en sirve inglés. x-default también apunta a español —
  // es el idioma principal y la audiencia mayoritaria del sitio.
  const languages = {
    es: SITE_URL,
    en: `${SITE_URL}/en`,
    "x-default": SITE_URL,
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: `%s | ${site.name}`,
    },
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    alternates: {
      languages,
    },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      url: locale === "en" ? languages.en : languages.es,
      siteName: site.name,
      locale: locale === "en" ? "en_US" : "es_CR",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Habilita el rendering estático de esta ruta pese a leer el locale desde
  // params (ver doc de next-intl: sin esto, cualquier uso de useTranslations
  // en un Server Component fuerza dynamic rendering).
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-ink text-mist-100 antialiased">
        {/*
          Adelanta la descarga del modelo 3D del camión (7.8MB comprimido con
          Draco) al instante en que el documento se parsea, en paralelo con
          la descarga/parseo de los bundles de JS — mucho antes de que
          PageLoader3D monte y arranque su propio fetch. No cambia nada del
          timing/animación del camión: solo hace que sus bytes ya estén en
          caché del navegador cuando el código los pide. Se omite por
          completo si el usuario prefiere menos movimiento, para no gastar
          ancho de banda en quien nunca verá el 3D. `beforeInteractive` lo
          inyecta en el <head> antes de hidratar, vía next/script (evita el
          warning de React por usar un <script> "a mano" dentro del árbol).
        */}
        <Script id="preload-truck-model" strategy="beforeInteractive">
          {`try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){var l=document.createElement('link');l.rel='preload';l.as='fetch';l.href='/models/mercasa-truck.glb';l.crossOrigin='anonymous';document.head.appendChild(l);var d=document.createElement('link');d.rel='preload';d.as='fetch';d.href='/draco/draco_decoder.wasm';d.crossOrigin='anonymous';document.head.appendChild(d);}}catch(e){}`}
        </Script>
        <NextIntlClientProvider messages={messages}>
          <AmbientBackdrop />
          <PageLoader />
          <SmoothScroll>{children}</SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
