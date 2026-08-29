// Datos NO traducibles del sitio de Mercasa: contactos, coordenadas, nombres
// propios (marcas, empresa) y las claves ("key") que cada componente usa para
// buscar su copy en /messages/{locale}.json vía useTranslations(). El texto
// visible (títulos, descripciones, labels) vive en los mensajes — este
// archivo solo tiene lo que NO cambia entre español e inglés.

export const site = {
  name: "Mercasa",
  parentCompany: "Grupo Inteca",
  foundedYear: 1963, // año de fundación de MERCASA (no de Grupo Inteca)
  phone: "+506 7071-3042",
  phoneHref: "tel:+50670713042",
  // phonesExtra: ["2217-3818", "2217-3778"],
  emails: {
    comunicaciones: "servicio_al_cliente@grupointeca.com",
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
  whatsappHref: "https://wa.me/50670713042",
  facebook: "https://www.facebook.com/mercasacr/",
  // AJUSTAR: Mercasa todavía no tiene estas cuentas activas — se deja el
  // botón listo en el footer, pero el link queda vacío ("#") a propósito
  // hasta que nos pasen la URL real. No inventar una cuenta.
  linkedin: "https://www.linkedin.com/company/grupo-inteca/posts/?feedView=all",
  instagram: "#",
};

// href + key (el label sale de Nav.<key> en los mensajes).
export const navLinks = [
  { href: "#inicio", key: "inicio" },
  { href: "#nosotros", key: "nosotros" },
  { href: "#logistica", key: "logistica" },
  { href: "#productos", key: "productos" },
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
  { key: "colaboradores", display: "+400" },
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

// Agrupación por categoría para el filtro opcional del muro de marcas.
// Lista de marcas confirmada contra el mural de marcas (2026-08-21).
// El label de cada categoría vive en Brands.categories.<key>; los nombres de
// marca dentro de `brands` son nombres propios y no se traducen.
// `image`: pared de logos propia por categoría (sin título quemado en la
// imagen — el label ya lo pone el chip). Viven junto al mural en
// /public/brand/marcas.
export const brandsMuralImage = "/brand/marcas/marcas-mural.jpg";

// Orden: categoría estrella primero (alimentos), luego el resto según lo
// pedido para el master-detail de Productos.
export const brandCategories = [
  {
    key: "alimentos",
    image: "/brand/marcas/alimentos.png",
    brands: [
      "MiSabor", "Girol", "Marquise", "Snickers", "Oreo", "Milka", "Trident",
      "Pietrobon", "Vitarella", "Halls", "Able Farm", "Pringles", "Renata",
      "Smucker's", "Pomi", "Mentos", "Pelican",
    ],
  },
  {
    key: "bebidas",
    image: "/brand/marcas/bebidas.png",
    brands: [
      "Carlsberg", "Monster Energy", "B-Healthy", "5,0", "Heineken",
      "Stella Artois", "Thüringer", "Red Bull", "Suerox", "Johnnie Walker",
      "Nescafé", "Jägermeister", "The Macallan", "Electrolit",
    ],
  },
  {
    key: "bebe-cuidado",
    image: "/brand/marcas/cuidado-personal.png",
    brands: [
      "Choice Care", "Ideal", "Selpak", "Nivea", "Palmolive", "Gillette",
      "Saba", "Belspá", "Tena", "Koa",
    ],
  },
  {
    key: "hogar-institucional",
    image: "/brand/marcas/cuidado-hogar.png",
    brands: [
      "EZlight", "EZwrap", "Bio EZserv", "Clinx", "EZserv", "EZtape",
      "Suavitel", "Ensueño", "EZbags", "EZClean", "Poderoso", "Pinol",
    ],
  },
];

// title/description en Brands.pillars.<key>
export const brandPillars = [{ key: "calidad" }, { key: "alianzas" }, { key: "compromiso" }];

// Selector "Soluciones por tipo de negocio" en Contacto. Label, frase de
// valor y el sustantivo para el mensaje de WhatsApp viven en
// Contact.segments.<key> (son texto visible, traducible).
//
// `categories` son chips clickeables que abren el catálogo real (ver
// customer-class-chips-reales.md) — cada key es o bien el slug de una
// Familia completa ("alimentos", "bebidas") o el slug de una Sub-familia
// puntual ("cuidado-del-bebe", "higiene-personal" -> Familia "Cuidado
// Personal"; "limpieza-del-hogar", "institucional" -> Familia "Cuidado del
// Hogar") — mismo esquema de slug que usa el árbol real de
// lib/mercasavip-catalog.ts, resuelto en CustomerClassSection.tsx
// (CHIP_TARGETS) contra los datos reales de MercasaVIP. Antes esto usaba 4
// etiquetas compuestas ("bebe-cuidado", "hogar-institucional") que NO
// correspondían a ninguna Familia/Sub-familia real 1 a 1 — divididas en sus
// componentes reales. Los labels viven en Contact.segmentCategories.<key>
// (ya no en Brands.categories, que sigue siendo exclusivo del filtro del
// muro de marcas — no se toca acá).
//
// `image`: foto de fondo de la columna izquierda del panel (ver
// rediseno-customer-class-spec-completo.md). Fotos reales de cada segmento,
// una por una, en `public/customer-class/` (ver fix-path-fotos-y-curva-
// otra-vez.md — la carpeta real tenía un typo, "custumer-class", corregido
// acá; el nombre de archivo de "restaurantes" trae un espacio literal).

export const businessSegments = [
  {
    key: "supermercados",
    icon: "store",
    image: "/customer-class/supermercados-cadenas.png",
    // Único segmento con copy detallado propio en el spec (título +
    // descripción distintos del valuePhrase corto de los otros 6 — ver
    // rediseno-customer-class-spec-completo.md). Categorías tal cual las
    // enumera el spec para este segmento (5, sin "cuidado-del-bebe": ese
    // recorte es intencional del mockup, no un olvido).
    detailedCopy: true,
    categories: ["alimentos", "bebidas", "higiene-personal", "limpieza-del-hogar", "institucional"],
  },
  {
    key: "hoteleria",
    icon: "hotel",
    image: "/customer-class/hotelería-turismo.png",
    detailedCopy: false,
    categories: [
      "cuidado-del-bebe",
      "higiene-personal",
      "limpieza-del-hogar",
      "institucional",
      "bebidas",
      "alimentos",
    ],
  },
  {
    key: "restaurantes",
    icon: "chef-hat",
    image: "/customer-class/restaurantes-food service.png",
    detailedCopy: false,
    categories: ["alimentos", "limpieza-del-hogar", "institucional", "bebidas"],
  },
  {
    key: "comercio-local",
    icon: "shopping-bag",
    image: "/customer-class/comercio-local-pulperías.png",
    detailedCopy: false,
    categories: ["alimentos", "bebidas", "limpieza-del-hogar", "institucional"],
  },
  {
    key: "panaderias",
    icon: "cookie",
    image: "/customer-class/panaderias.png",
    detailedCopy: false,
    categories: ["alimentos", "limpieza-del-hogar", "institucional"],
  },
  {
    key: "instituciones",
    icon: "building",
    image: "/customer-class/sector-público.png",
    detailedCopy: false,
    categories: ["limpieza-del-hogar", "institucional", "cuidado-del-bebe", "higiene-personal", "alimentos"],
  },
  {
    key: "retail",
    icon: "shopping-cart",
    image: "/customer-class/retail-tiendas-de-conveniencia.png",
    detailedCopy: false,
    categories: ["alimentos", "bebidas", "cuidado-del-bebe", "higiene-personal"],
  },
];

// Las 4 etapas de la cadena (importación → almacenamiento → distribución →
// punto de venta). title/description viven en Logistics.steps.<key>.
// El footer de cifra (icon+value, antes solo en los pasos 01 y 04) se quitó:
// generaba asimetría entre las 4 cards y el dato ya está en el párrafo de
// cada una.
// El color de acento (barra superior + badge de número) es el MISMO azul de
// marca en las 4 — antes cada paso tenía un color distinto (azul/teal/coral/
// púrpura), pero eso desentonaba con la paleta monocromática de Mercasa. Vive
// como constante en LogisticsSteps.tsx, no acá, porque ya no varía por paso.
// `image`: foto real de cada etapa (public/brand/Logistica/) — vive acá como
// ruta de string, no como import estático en el componente, para poder
// reemplazarla con un solo cambio de línea. Los archivos originales subidos
// tenían espacios y tildes en el nombre ("Importación Global.png", etc.); se
// renombraron a slugs ASCII para evitar problemas de resolución de rutas en
// producción/Vercel.
export const logisticsSteps = [
  {
    step: "01",
    key: "importacion",
    icon: "ship",
    image: "/brand/Logistica/importacion-global.png",
  },
  {
    step: "02",
    key: "almacenamiento",
    icon: "warehouse",
    image: "/brand/Logistica/almacenamiento-inteligente.png",
  },
  {
    step: "03",
    key: "distribucion",
    icon: "truck",
    image: "/brand/Logistica/distribucion-nacional.png",
  },
  {
    step: "04",
    key: "puntoDeVenta",
    icon: "store",
    image: "/brand/Logistica/punto-de-venta.png",
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

// Fotos del mosaico de "Nuestros Colaboradores". Placeholders: los archivos
// todavía no están subidos (ver public/brand/Colaboradores/README.md) —
// CollaboratorPhotoTile degrada a un ícono genérico si el archivo no existe,
// así que esto no rompe nada mientras tanto. Para poner las fotos reales,
// solo subir los archivos con estos mismos nombres a esa carpeta (o editar
// `src` acá si cambian los nombres/la cantidad de fotos).
// `size` controla cuántas celdas ocupa cada foto en el grid mosaico (ver
// SIZE_CLASSES en CollaboratorsSection.tsx) — variar los tamaños es lo que le
// da el efecto Pinterest/masonry liviano en vez de un grid parejo.
export const collaboratorPhotos: { src: string; size: "large" | "wide" | "tall" | "normal" }[] = [
  { src: "/brand/Colaboradores/foto-01.jpg", size: "large" },
  { src: "/brand/Colaboradores/foto-02.jpg", size: "normal" },
  { src: "/brand/Colaboradores/foto-03.jpg", size: "tall" },
  { src: "/brand/Colaboradores/foto-04.jpg", size: "wide" },
  { src: "/brand/Colaboradores/foto-05.jpg", size: "normal" },
  { src: "/brand/Colaboradores/foto-06.jpg", size: "normal" },
  { src: "/brand/Colaboradores/foto-07.jpg", size: "wide" },
  { src: "/brand/Colaboradores/foto-08.jpg", size: "normal" },
];
