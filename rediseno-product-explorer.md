# Rediseño de `ProductExplorer.tsx` — de listado de productos a mapa visual de navegación

## Contexto y decisión de producto
Ahora que existe el catálogo tipo revista (`ProductCatalogModal.tsx`) como
la experiencia real para ver productos individuales con foto, esta sección
en la página principal (`ProductExplorer.tsx`, dentro de "Nuestros
Productos") YA NO debe listar productos individuales ni sus fotos. Su rol
cambia: es un mapa de navegación visual de la estructura del catálogo
(Familia → Sub-familia → Categoría) que termina siempre en un CTA que abre
la revista, filtrada en el punto correspondiente.

Resultado esperado: dos componentes con roles claramente distintos.
- `ProductExplorer` (esta sección, en la home): impresiona visualmente,
  comunica la amplitud del catálogo, invita a explorar.
- `ProductCatalogModal` (la revista): es donde efectivamente se ven
  productos con foto real.

## Estado actual (lo que hay que reemplazar)
Ahora mismo es un layout tipo panel de admin: sidebar angosto con tarjetas
de familia apiladas verticalmente + botón "Revista" en cada una, un panel
a la derecha con pills de sub-familia, y debajo una lista de categorías en
filas con contador y chevron (que probablemente expande a productos
individuales — ESO se elimina). Funcional, pero se ve genérico, como un
dashboard, no como parte de un sitio corporativo premium.

## Nueva dirección visual — rediseño fuerte

### Concepto
Un "selector de familias" a pantalla ancha, con tarjetas grandes tipo
hero (no un sidebar angosto), cada una con su ícono, nombre, conteo, y un
fondo sutil con textura o color distintivo — pensado para que la sección
completa se sienta como una vitrina, no como una tabla de datos.

### Nivel 1 — Selector de Familias (5 tarjetas grandes)
- Grid de 5 tarjetas (responsive: 5 columnas en desktop, 2-3 en tablet, 1
  en mobile), cada una notablemente más grande que las pills actuales.
- Cada tarjeta: ícono grande, nombre de la familia, conteo de productos
  ("+410 productos"), y un fondo con textura sutil o gradiente en tono
  navy/beige que varíe ligeramente entre familias para diferenciarlas
  visualmente (sin necesidad de fotos de producto — puede ser un patrón
  geométrico sutil, o reusar los tonos institucionales con distinta
  intensidad).
- Al hacer click/tap, la tarjeta seleccionada se expande o se transiciona
  suavemente hacia el nivel 2 (sub-familias) — usar una transición con
  Framer Motion (ya está en el proyecto) para que el cambio de nivel se
  sienta fluido, no un salto brusco.
- Quitar el botón "Revista" individual de cada tarjeta de familia — ese
  acceso directo a la revista se moverá al nivel de categoría (ver abajo),
  que es donde tiene más sentido (la gente ya decidió qué quiere ver).

### Nivel 2 — Sub-familias (dentro de la familia seleccionada)
- En vez de pills pequeñas en una fila, usar tarjetas medianas con más
  aire — pueden llevar un ícono distinto por sub-familia si es viable, o
  al menos jerarquía tipográfica más fuerte (nombre grande, conteo debajo).
- Mantener la barra de progreso/indicador visual que ya existe (la línea
  azul debajo de las pills), pero integrada al nuevo estilo de tarjeta.

### Nivel 3 — Categorías (dentro de la sub-familia seleccionada)
- Reemplazar la lista de filas con chevron por un grid de tarjetas más
  visual — cada categoría como una tarjeta con nombre, conteo, y un ícono
  o color de acento.
- ELIMINAR el comportamiento de expandir para mostrar productos
  individuales — ese nivel de detalle ya no vive acá.
- Cada tarjeta de categoría tiene un CTA claro: **"Ver en el catálogo"**
  (o similar), que abre `ProductCatalogModal` ya posicionado/filtrado en
  esa categoría específica — reusar la lógica que ya existe para el
  selector "Ir a categoría" dentro de la revista, pero disparada desde
  acá en vez de solo desde adentro del modal.

### Búsqueda
- El buscador ("Buscar un producto por nombre...") puede quedarse, pero
  su resultado ya NO debe listar productos con detalle acá — al
  encontrar coincidencias, debe llevar directo a la revista abierta en el
  producto/categoría correspondiente, consistente con la nueva regla de
  "productos individuales solo se ven en la revista".

### Estilo general
- Mantener la paleta institucional (navy `#1B2A4A`, gold `#C9A84C`) y el
  tono "corporativo serio, no startup" que ya se definió para todo el
  sitio (fondos alternados blanco/beige, nada de dark/cyberpunk).
- Usar las animaciones de scroll y transiciones que ya existen en el
  resto del sitio (AOS/Framer Motion) para que esta sección se sienta
  consistente con el resto de la página, no como un widget aparte.
- Considerar agregar un CTA prominente arriba de todo tipo "Explorá
  nuestro catálogo completo" que abra la revista directamente desde cero
  (portada), para quien no quiere navegar por familia/categoría y prefiere
  hojear todo de una vez.

## Qué NO hacer
- No mostrar fotos de producto individuales en este componente — ese
  trabajo ya lo hace la revista.
- No mostrar precio ni disponibilidad (regla ya existente, se mantiene).
- No duplicar la lógica de fetch de `/api/product-images` acá — este
  componente solo necesita la data de estructura (Familia → Sub-familia →
  Categoría con conteos), no fotos.

## Archivos a tocar
- `components/ProductExplorer.tsx` (o donde viva este componente,
  confirmar el nombre exacto del archivo en el repo).
- Los estilos asociados (CSS module, Tailwind classes inline, lo que
  corresponda según cómo esté armado).
- Puede que haga falta exponer una prop o función en `ProductCatalogModal`
  para poder abrirlo ya posicionado en una categoría específica desde
  afuera (si esa función no existe todavía, hay que agregarla — revisar
  primero si ya existe algo similar reusado por el selector "Ir a
  categoría" interno).

## Verificación
- Probar el flujo completo: Familia → Sub-familia → Categoría → click en
  "Ver en el catálogo" → confirmar que la revista abre en el lugar
  correcto (mismo comportamiento que el selector "Ir a categoría" interno).
- Probar responsive (desktop, tablet, mobile) — el grid de 5 familias
  necesita un buen comportamiento en pantallas chicas.
- Si hay Chrome MCP disponible en esta sesión, usarlo para verificar
  visualmente cada nivel (familia, sub-familia, categoría) antes de dar
  por terminado — no asumir que el layout se ve bien solo por el código.
