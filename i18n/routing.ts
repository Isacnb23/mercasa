import { defineRouting } from "next-intl/routing";

// Español es el idioma principal del sitio (audiencia local, Costa Rica); el
// inglés existe para proveedores internacionales que evalúan a Mercasa como
// socio comercial. `localePrefix: "as-needed"` deja la raíz del dominio
// (mercasa.cr) sirviendo español SIN prefijo (no rompe el SEO/los enlaces ya
// indexados del sitio en vivo) y solo antepone /en para el inglés.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
