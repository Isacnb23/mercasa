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
    rh: "rh@grupointeca.com",
  },
  address: {
    line1: "Tejar de El Guarco, Cartago, Costa Rica",
    line2: "800 m sur del Parque Industrial de Cartago",
    postalCode: "30801",
    mapQuery: "Grupo Inteca CEDI, El Tejar, Cartago, Costa Rica",
    // Coordenadas EXACTAS del CEDI (Grupo Inteca / Mercasa) en El Tejar de El
    // Guarco, Cartago — verificadas en Google Maps ("Grupo Inteca CEDI",
    // tel. 2217-3600, Plus Code R2WX+JX3, Cartago). Este es el punto que marca
    // el pin del mapa y al que abren "Abrir en Maps" y "Cómo llegar".
    lat: 9.8465184,
    lng: -83.9500786,
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
  { key: "colaboradores", display: "201 a 500", label: "Colaboradores" },
  { key: "trayectoria", value: 60, suffix: "+", label: "Años de trayectoria" },
  { key: "cedis", value: 2, suffix: "", label: "Macro-CEDIs propios" },
  // Ojo: 1963 es el año de fundación de MERCASA (site.foundedYear), no de
  // Grupo Inteca — por eso esta tarjeta no lleva año, solo identifica a la
  // casa matriz (el año ya se cuenta arriba, en "Años de trayectoria").
  { key: "respaldo", display: site.parentCompany, label: "Casa matriz y respaldo institucional" },
];

// Nota: la antigua lista `pillars` ("Nuestra operación": Compras Internacionales,
// Logística Integral, Gestión de CEDIs, Red de Distribución) se eliminó porque
// describía el MISMO recorrido que las 4 etapas de `logisticsSteps` — la
// operación vive ahora solo en la sección Logística. "Nosotros" queda enfocado
// en identidad (trayectoria, respaldo, cifras institucionales en `aboutStats`).

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

export const logisticsSteps = [
  {
    step: "01",
    icon: "ship",
    title: "Importación Global",
    description:
      "Conectamos con más de 45 proveedores en 30 países, gestionando el tráfico internacional y aduanas con los más altos estándares.",
    visual: "map-world",
    stats: [
      { icon: "globe", value: "30+", label: "países" },
      { icon: "ship", value: "1,900+", label: "TEUs al año" },
    ],
  },
  {
    step: "02",
    icon: "warehouse",
    title: "Almacenamiento Inteligente",
    description:
      "Dos macro-CEDIs propios con más de 10,500 posiciones de tarima y tecnología de gestión de inventarios de clase mundial.",
    visual: "photo-warehouse",
    stats: [{ icon: "boxes", value: "10,500+", label: "posiciones de tarima" }],
  },
  {
    step: "03",
    icon: "truck",
    title: "Distribución Nacional",
    description:
      "Red logística propia con cobertura en todo el país, optimizando rutas para entregas eficientes y puntuales.",
    visual: "map-cr",
    stats: [{ icon: "truck", value: "2,500+", label: "entregas comerciales cada semana" }],
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

export const logisticsTrustBadges = [
  {
    key: "experiencia",
    icon: "shield",
    title: "Más de 60 años",
    description: "de experiencia en el mercado.",
  },
  {
    key: "respaldo",
    icon: "handshake",
    title: "Respaldo institucional",
    // Ojo: 1963 es el año de fundación de MERCASA (site.foundedYear, ya
    // destacado en la tarjeta "Más de 60 años" de este mismo bloque) — no
    // de Grupo Inteca, así que aquí no se repite esa fecha.
    description: `Operamos bajo el respaldo corporativo de ${site.parentCompany}, líder regional.`,
  },
  {
    key: "estandares",
    icon: "award",
    title: "Estándares internacionales",
    description: "Procesos certificados y control de calidad en toda la cadena.",
  },
  {
    key: "cobertura",
    icon: "map",
    title: "Cobertura nacional",
    description: "Llegamos a cada región del país.",
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

