// Contenido estructurado del sitio de Mercasa.
// Fuente: brief proporcionado por el cliente (Grupo Inteca). Editar aquí
// para actualizar textos/cifras sin tocar los componentes.

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

export const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#logistica", label: "Logística" },
  { href: "#marcas", label: "Marcas" },
  { href: "#contacto", label: "Contacto" },
];

/* Datos destacados de la tarjeta del Hero */
export const heroHighlights = [
  {
    key: "transito",
    label: "Tránsito internacional",
    value: "1,900+ TEUs al año",
  },
  {
    key: "infraestructura",
    label: "Infraestructura propia",
    value: "10,500+ posiciones de tarima",
  },
  {
    key: "cobertura",
    label: "Cobertura nacional",
    value: "2,500 entregas comerciales por semana",
  },
];

/* Cifras institucionales que acompañan el bloque "Nosotros".
   Ojo: esta sección es sobre la EMPRESA (identidad, trayectoria, respaldo).
   Las cifras operativas (países, tarima, entregas) viven exclusivamente en
   Logística — no se repiten aquí para no duplicar el mismo dato en dos
   secciones distintas. */
export const aboutStats = [
  { key: "colaboradores", display: "+200", label: "Colaboradores" },
  { key: "trayectoria", value: 60, suffix: "+", label: "Años de trayectoria" },
  { key: "cedis", value: 2, suffix: "", label: "Macro-CEDIs propios" },
  // Ojo: 1963 es el año de fundación de MERCASA (site.foundedYear), no de
  // Grupo Inteca — por eso esta tarjeta no lleva año, solo identifica a la
  // casa matriz (el año ya se cuenta arriba, en "Años de trayectoria").
  { key: "respaldo", display: site.parentCompany, label: "Casa matriz y respaldo institucional" },
];

// Nota (revisión de contenido): estos 4 pilares describen a Mercasa como
// ORGANIZACIÓN (capacidades y relaciones que la respaldan), a diferencia de
// los 4 pasos de la sección Logística, que explican el PROCESO operativo
// paso a paso con sus propias cifras y fotos. Se evita deliberadamente
// repetir aquí los datos (proveedores, países, posiciones de tarima, etc.)
// que ya se detallan en profundidad en esa sección.
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
// Se listan como texto (además de la foto del muro) para accesibilidad y SEO.
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
export const brandCategories = [
  {
    key: "alimentos",
    label: "Alimentos y despensa",
    brands: [
      "Nature Valley", "Renata", "Matilde Vicenzi", "Fiber One", "Smucker's",
      "Pietrobon", "Pomí", "Heinz", "La Costeña", "San Marcos", "MiSabor",
      "Girol", "Boom Bastic", "Pillsbury", "Betty Crocker", "McCain",
    ],
  },
  {
    key: "bebe-cuidado",
    label: "Bebés y cuidado personal",
    brands: [
      "Choice Care", "Smarty Baby", "Bebín", "Pelican", "Senior", "Ideal",
      "Selpak", "Koa", "Shave & Go", "BelSpá", "B-Healthy",
    ],
  },
  {
    key: "hogar-institucional",
    label: "Limpieza del hogar e institucional",
    brands: ["Clinx", "Bio EZserv", "EZlight", "EZbags", "EZserv", "EZclean", "EZtape"],
  },
  {
    key: "bebidas",
    label: "Bebidas",
    brands: ["Monday", "Thüringer", "St. Omer", "Tika"],
  },
];

export const brandPillars = [
  {
    key: "calidad",
    title: "Calidad garantizada",
    description:
      "Marcas de las mejores casas productoras internacionales, seleccionadas para garantizar excelencia en cada hogar.",
  },
  {
    key: "alianzas",
    title: "Alianzas estratégicas",
    description:
      "Relaciones comerciales duraderas con marcas reconocidas que confían en nuestra red de distribución nacional.",
  },
  {
    key: "compromiso",
    title: "Compromiso con el cliente",
    description:
      "Seguimos ampliando nuestro portafolio para responder a lo que el mercado costarricense necesita.",
  },
];

/* Sección "Logística y Cobertura": intro + las 4 etapas de la cadena
   (importación → almacenamiento → distribución → punto de venta). */
export const logisticsIntro = {
  eyebrow: "Logística y cobertura",
  titleLead: "El motor detrás de cada",
  titleAccent: "entrega",
  lead:
    "Unimos el mundo con Costa Rica a través de una cadena logística eficiente, moderna y confiable que garantiza disponibilidad y velocidad en cada entrega.",
};

// Cifras por etapa: cada paso lleva como máximo UNA cifra propia, distinta a
// las 3 stats de impacto del Hero (1,900+ TEUs, 10,500+ posiciones de tarima,
// 2,500 entregas/semana), para no repetir el mismo dato en dos secciones. Los
// pasos que no tienen una cifra propia real (almacenamiento y distribución ya
// están cubiertos por el hero) quedan sin stats — mejor sin chip que con el
// mismo número dos veces.
export const logisticsSteps = [
  {
    step: "01",
    icon: "ship",
    title: "Importación Global",
    description:
      "Conectamos con más de 45 proveedores en 30 países, gestionando el tráfico internacional y aduanas con los más altos estándares.",
    visual: "map-world",
    stats: [{ icon: "globe", value: "30+", label: "países" }],
  },
  {
    step: "02",
    icon: "warehouse",
    title: "Almacenamiento Inteligente",
    description:
      "Dos macro-CEDIs propios con más de 10,500 posiciones de tarima y tecnología de gestión de inventarios de clase mundial.",
    visual: "photo-warehouse",
    stats: [],
  },
  {
    step: "03",
    icon: "truck",
    title: "Distribución Nacional",
    description:
      "Red logística propia con cobertura en todo el país, optimizando rutas para entregas eficientes y puntuales.",
    visual: "map-cr",
    stats: [],
  },
  {
    step: "04",
    icon: "store",
    title: "Punto de Venta",
    description:
      "Cerramos el ciclo logístico llevando cada producto a manos del consumidor final, en cualquier rincón del país.",
    visual: "store",
    stats: [{ icon: "users", value: "Miles", label: "de clientes atendidos cada semana" }],
  },
];

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

