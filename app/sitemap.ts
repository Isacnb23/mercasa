import type { MetadataRoute } from "next";

// Convención de Next.js (app/sitemap.ts -> /sitemap.xml, ver
// seo-mejora-diferenciacion.md punto 4) — vive en app/ (fuera de
// [locale]/) porque el sitemap en sí no depende de un locale particular,
// lista TODAS las rutas reales de ambos idiomas.
//
// SITE_URL repetido acá (no importado desde otro lado) — mismo criterio que
// app/[locale]/layout.tsx: es un solo valor, no vale la pena una capa de
// indirección extra por esto. Si cambia el dominio, actualizar ambos.
const SITE_URL = "https://www.mercasa.cr";

// Rutas reales del sitio además de la home — mismos slugs que
// app/[locale]/legal/*/page.tsx. El resto del contenido (Nosotros,
// Logística, Productos, Customer Class, Contacto) vive como anclas dentro
// de la misma home, no como páginas propias, así que no suman entradas
// nuevas acá.
const LEGAL_PAGES = ["legal/terminos-y-condiciones", "legal/politica-de-privacidad"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: SITE_URL,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1,
    alternates: {
      languages: {
        es: SITE_URL,
        en: `${SITE_URL}/en`,
      },
    },
  };

  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
    alternates: {
      languages: {
        es: `${SITE_URL}/${slug}`,
        en: `${SITE_URL}/en/${slug}`,
      },
    },
  }));

  return [homeEntry, ...legalEntries];
}
