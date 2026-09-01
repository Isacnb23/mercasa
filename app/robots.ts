import type { MetadataRoute } from "next";

// Convención de Next.js (app/robots.ts -> /robots.txt, ver
// seo-mejora-diferenciacion.md punto 4). Permite rastrear todo el sitio
// público — solo bloquea /api/ (endpoints internos, no contenido para
// indexar) — y apunta al sitemap real.
const SITE_URL = "https://www.mercasa.cr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
