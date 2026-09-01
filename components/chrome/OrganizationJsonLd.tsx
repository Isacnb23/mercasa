import { contactSites, site } from "@/lib/data";

// Structured data (JSON-LD) para que Google entienda con claridad qué es
// este sitio — ver seo-mejora-diferenciacion.md: "Mercasa" es un nombre
// genérico compartido con otras empresas no relacionadas (ej. una
// ferretería), así que hace falta decirle explícitamente al buscador que
// esto es una distribuidora MAYORISTA, parte de Grupo Inteca, con
// ubicaciones reales en Costa Rica.
//
// `@type: "WholesaleStore"` (subtipo real de schema.org, no inventado —
// hereda de Store -> LocalBusiness -> Organization) es justo lo que pide el
// doc: descarta cualquier lectura como tienda minorista genérica o
// ferretería. Las dos sedes reales (ver contactSites en lib/data.ts) se
// listan bajo `department`, la propiedad de schema.org pensada exactamente
// para esto ("a store with a pharmacy", "a bakery with a cafe" — acá, un
// CEDI con oficinas administrativas en otra sede).
//
// SITE_URL hardcodeado iguial que en layout.tsx (no vale la pena
// compartirlo vía import solo por esto) — si ese valor cambia, actualizar
// ambos lugares.
const SITE_URL = "https://www.mercasa.cr";

function siteToAddress(address: { line1: string; line2?: string; postalCode?: string }) {
  return {
    "@type": "PostalAddress" as const,
    streetAddress: address.line2 ?? address.line1,
    addressLocality: address.line1,
    addressRegion: "Cartago",
    postalCode: address.postalCode,
    addressCountry: "CR",
  };
}

export default function OrganizationJsonLd() {
  const cediCentral = contactSites.find((s) => s.key === "cedi-central")!;
  const sanFrancisco = contactSites.find((s) => s.key === "san-antonio")!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WholesaleStore",
    name: site.name,
    alternateName: `${site.name} - ${site.parentCompany}`,
    legalName: site.parentCompany,
    description:
      "Distribuidora mayorista de productos de consumo masivo en Costa Rica, empresa de Grupo Inteca. Importación, logística y distribución a supermercados, retail y comercio local.",
    url: SITE_URL,
    logo: `${SITE_URL}/models/mercasa-logo-transparent.png`,
    image: `${SITE_URL}/brand/Hero/hero-warehouse.png`,
    foundingDate: String(site.foundedYear),
    telephone: site.phone,
    email: site.emails.comunicaciones,
    address: siteToAddress(site.address),
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.address.lat,
      longitude: site.address.lng,
    },
    areaServed: {
      "@type": "Country",
      name: "Costa Rica",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "12:00",
      },
    ],
    // Solo redes con URL real confirmada — site.instagram vive como "#"
    // hasta que Mercasa tenga la cuenta activa (ver lib/data.ts), no se
    // inventa un perfil que no existe.
    sameAs: [site.facebook, site.linkedin].filter((url) => url && url !== "#"),
    department: [
      {
        "@type": "WholesaleStore",
        name: `${site.name} · CEDI Central`,
        address: siteToAddress(cediCentral.address),
        geo: {
          "@type": "GeoCoordinates",
          latitude: cediCentral.address.lat,
          longitude: cediCentral.address.lng,
        },
      },
      {
        "@type": "WholesaleStore",
        name: `${site.parentCompany} · San Francisco`,
        address: {
          "@type": "PostalAddress",
          streetAddress: sanFrancisco.address.line1,
          addressRegion: "San José",
          addressCountry: "CR",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: sanFrancisco.address.lat,
          longitude: sanFrancisco.address.lng,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify de datos propios (no input de usuario) — sin riesgo
      // de inyección, el contenido es enteramente estático desde lib/data.ts.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
