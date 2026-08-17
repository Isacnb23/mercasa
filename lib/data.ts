// Datos NO traducibles del sitio de Mercasa: contactos, coordenadas, nombres
// propios (marcas, empresa) y las claves ("key") que cada componente usa para
// buscar su copy en /messages/{locale}.json vía useTranslations(). El texto
// visible (títulos, descripciones, labels) vive en los mensajes — este
// archivo solo tiene lo que NO cambia entre español e inglés.

export const site = {
  name: "Mercasa",
  parentCompany: "Grupo Inteca",
  foundedYear: 1963, // año de fundación de MERCASA (no de Grupo Inteca)
  phone: "+506 2217-3600",
  phoneHref: "tel:+50622173600",
  phonesExtra: ["2217-3818", "2217-3778"],
  emails: {
    comunicaciones: "comunicaciones.mercasa@grupointeca.com",
    rh: "reclutamiento@grupointeca.com",
  },
  address: {
    line1: "Tejar de El Guarco, Cartago, Costa Rica",
    line2: "800 m sur del Parque Industrial de Cartago",
    postalCode: "30801",
    mapQuery: "Tejar, El Guarco, Cartago, Costa Rica",
    // Coordenadas EXACTAS del CEDI. Este es el único punto que usan el pin del
    // mapa, el fallback embebido de Google y los enlaces "Abrir en Maps" /
    // "Cómo llegar" — todos arman la URL con lat,lng puros (nunca con el
    // nombre "Mercasa" como búsqueda), porque existe una ferretería no
    // relacionada con el mismo nombre en Agua Caliente que Google Maps
    // prioriza por reseñas si se busca por texto.
    lat: 9.84671923526572,
    lng: -83.9500356896771,
  },
  whatsappHref: "https://wa.me/50622173600",
  facebook: "https://www.facebook.com/mercasacr/",
  // AJUSTAR: Mercasa todavía no tiene estas cuentas activas — se deja el
  // botón listo en el footer, pero el link queda vacío ("#") a propósito
  // hasta que nos pasen la URL real. No inventar una cuenta.
  linkedin: "#",
  instagram: "#",
};

// href + key (el label sale de Nav.<key> en los mensajes).
export const navLinks = [
  { href: "#inicio", key: "inicio" },
  { href: "#nosotros", key: "nosotros" },
  { href: "#logistica", key: "logistica" },
  { href: "#marcas", key: "marcas" },
  { href: "#contacto", key: "contacto" },
];

/* Datos destacados de la tarjeta del Hero — label/value en Hero.highlights.<key> */
export const heroHighlights = [
  { key: "transito" },
  { key: "infraestructura" },
  { key: "cobertura" },
];

/* Cifras institucionales del bloque "Nosotros" — label en About.stats.<key>.
   Ojo: esta sección es sobre la EMPRESA (identidad, trayectoria, respaldo).
   Las cifras operativas (países, tarima, entregas) viven exclusivamente en
   Logística — no se repiten aquí para no duplicar el mismo dato en dos
   secciones distintas. */
export const aboutStats = [
  { key: "colaboradores", display: "+200" },
  { key: "trayectoria", value: 60, suffix: "+" },
  { key: "cedis", value: 2, suffix: "" },
  // Ojo: 1963 es el año de fundación de MERCASA (site.foundedYear), no de
  // Grupo Inteca — por eso esta tarjeta no lleva año, solo identifica a la
  // casa matriz (el año ya se cuenta arriba, en "Años de trayectoria").
  { key: "respaldo", display: site.parentCompany },
];

// Nota (revisión de contenido): estos 4 pilares describen a Mercasa como
// ORGANIZACIÓN (capacidades y relaciones que la respaldan), a diferencia de
// los 4 pasos de la sección Logística, que explican el PROCESO operativo
// paso a paso con sus propias cifras y fotos. Se evita deliberadamente
// repetir aquí los datos (proveedores, países, posiciones de tarima, etc.)
// que ya se detallan en profundidad en esa sección.
// AJUSTAR: sin uso actualmente en ningún componente (dead data, se conserva
// tal cual del brief original) — no se movió a mensajes de i18n a propósito.
export const pillars = [
  {
    key: "compras",
    title: "Compras Internacionales",
    description:
      "Relaciones comerciales estables con proveedores aliados en el extranjero, la base de un abastecimiento constante para todo nuestro portafolio.",
  },
  {
    key: "logistica",
    title: "Logística Integral",
    description:
      "Un equipo propio que coordina cada eslabón de la cadena de suministro, desde la negociación hasta la entrega, bajo un mismo estándar de calidad.",
  },
  {
    key: "cedis",
    title: "Gestión de CEDIs",
    description:
      "Infraestructura propia que nos da control total sobre el inventario, la seguridad y la disponibilidad de cada producto.",
  },
  {
    key: "red",
    title: "Red de Distribución Nacional",
    description:
      "Presencia constante en cada región del país, con una red propia que sostiene relaciones cercanas y duraderas con nuestros clientes.",
  },
];

// Marcas que Mercasa importa, comercializa y distribuye en Costa Rica.
// Nombres propios: NO se traducen. Se listan como texto (además de la foto
// del muro) para accesibilidad y SEO.
export const brandNames = [
  "Nature Valley", "Renata", "Matilde Vicenzi", "Fiber One", "Smucker's", "Pietrobon",
  "Pomí", "Heinz", "La Costeña", "San Marcos", "MiSabor", "Girol", "Boom Bastic",
  "Pillsbury", "Betty Crocker", "McCain", "Choice Care", "Smarty Baby", "Bebín", "Pelican", "Senior",
  "Ideal", "Selpak", "Koa", "Shave & Go", "Clinx", "BelSpá",
  "Bio EZserv", "EZlight", "EZbags", "EZserv", "EZclean", "EZtape", "B-Healthy",
  "Monday", "Thüringer", "St. Omer", "Tika",
];

// AJUSTAR: agrupación por categoría para el filtro opcional del muro de marcas.
// Es una primera clasificación de referencia (no viene del brief del cliente) —
// pídanle a Grupo Inteca que la confirme o corrija antes de darla por definitiva.
// El label de cada categoría vive en Brands.categories.<key>; los nombres de
// marca dentro de `brands` son nombres propios y no se traducen.
export const brandCategories = [
  {
    key: "alimentos",
    brands: [
      "Nature Valley", "Renata", "Matilde Vicenzi", "Fiber One", "Smucker's",
      "Pietrobon", "Pomí", "Heinz", "La Costeña", "San Marcos", "MiSabor",
      "Girol", "Boom Bastic", "Pillsbury", "Betty Crocker", "McCain",
    ],
  },
  {
    key: "bebe-cuidado",
    brands: [
      "Choice Care", "Smarty Baby", "Bebín", "Pelican", "Senior", "Ideal",
      "Selpak", "Koa", "Shave & Go", "BelSpá", "B-Healthy",
    ],
  },
  {
    key: "hogar-institucional",
    brands: ["Clinx", "Bio EZserv", "EZlight", "EZbags", "EZserv", "EZclean", "EZtape"],
  },
  {
    key: "bebidas",
    brands: ["Monday", "Thüringer", "St. Omer", "Tika"],
  },
];

// title/description en Brands.pillars.<key>
export const brandPillars = [{ key: "calidad" }, { key: "alianzas" }, { key: "compromiso" }];

// Las 4 etapas de la cadena (importación → almacenamiento → distribución →
// punto de venta). title/description/statLabel viven en Logistics.steps.<key>.
// Cada paso lleva como máximo UNA cifra propia (icon+value numéricos, sin
// label — el label sale de los mensajes), distinta a las 3 stats de impacto
// del Hero (1,900+ TEUs, 10,500+ posiciones de tarima, 2,500 entregas/semana),
// para no repetir el mismo dato en dos secciones. Los pasos sin cifra propia
// real (almacenamiento y distribución ya están cubiertos por el hero) quedan
// sin stats — mejor sin chip que con el mismo número dos veces.
export const logisticsSteps = [
  {
    step: "01",
    key: "importacion",
    icon: "ship",
    visual: "map-world",
    stats: [{ icon: "globe", value: "30+" }],
  },
  {
    step: "02",
    key: "almacenamiento",
    icon: "warehouse",
    visual: "photo-warehouse",
    stats: [],
  },
  {
    step: "03",
    key: "distribucion",
    icon: "truck",
    visual: "map-cr",
    stats: [],
  },
  {
    step: "04",
    key: "puntoDeVenta",
    icon: "store",
    visual: "store",
    stats: [{ icon: "users", value: "Miles" }],
  },
];

// AJUSTAR: sin uso actualmente (no hay un formulario de contacto montado que
// lo consuma; /api/contact ya arma sus propias etiquetas internas en
// español para el correo interno del equipo, que no es contenido visible del
// sitio) — no se movió a mensajes de i18n a propósito.
export const contactChannels = [
  {
    key: "proveedor",
    title: "Nuevo Proveedor Internacional",
    description: "Alianzas comerciales, negociación de nuevas líneas y tráfico internacional.",
  },
  {
    key: "cliente",
    title: "Nuevo Cliente Local",
    description: "Supermercados, retail, mini-súper y comercio local que desean abastecerse con Mercasa.",
  },
];
