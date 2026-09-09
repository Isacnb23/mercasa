# Refactor: consolidar "Productos" dentro de "Segmento de Mercado"

## Contexto y objetivo
Actualmente hay dos secciones separadas que llevan al catálogo:
"Productos" (grilla de 6 tarjetas de familia) y "Segmento de Mercado"
(7 tarjetas de tipo de cliente). Se pidió consolidar todo dentro de
"Segmento de Mercado", que pasa a ser la única puerta de entrada al
catálogo — con los segmentos de cliente como foco principal, y un
"Catálogo general" como una opción más entre las tarjetas de
selección.

**No borrar código** — `ProductsSection`/`ProductExplorer` y sus
archivos relacionados se dejan en el proyecto sin usar, por si hace
falta revertir o reutilizar después. Solo se quita su uso de la
navegación y de la página.

## Cambios

### 1. Quitar "Productos" de la navegación
- Quitar el ítem "Productos" del navbar (desktop y mobile) y del
  footer si está ahí.
- Quitar `<ProductsSection />` (o como se llame el componente) de
  `app/[locale]/page.tsx` — ya no se renderiza en el home.
- Confirmar que no queda ningún link roto apuntando a un anchor
  `#productos` que ya no existe.

### 2. Ampliar "Segmento de Mercado" a 8 tarjetas
Agregar una 8va tarjeta al selector existente, con el mismo estilo
visual que las otras 7 (mismo tamaño, mismo tratamiento de estado
activo/hover):
- Nombre: "Catálogo general"
- Ícono: algo que represente "ver todo" — ej. `LayoutGrid` o
  `Package` de `lucide-react`, distinto a los íconos ya usados por los
  7 segmentos para no repetir.
- Posición: al final de la fila de 7, como 8va opción (o donde se vea
  mejor en el layout — revisar si el diseño responsive necesita
  ajuste al pasar de 7 a 8 tarjetas).

### 3. Panel condicional según selección
El panel de contenido debajo del selector cambia según qué esté
seleccionado:

**Si es un segmento de cliente (1-7, comportamiento actual sin
cambios)**: foto de fondo, título, descripción, categorías
disponibles, botón "Explorar productos" (filtro multi-Familia), link
de contacto por WhatsApp — todo tal como ya funciona hoy, sin tocar.

**Si es "Catálogo general" (8va opción, nuevo)**: el panel muestra la
grilla de tarjetas de familia (Alimentos, Bebidas, Cuidado del Hogar,
Cuidado Personal, Construcción, Electrónica) — reutilizar los datos y
lógica de familias ya existentes (de `ProductExplorer`/
`ProductsSection`, mismo orden ya definido: Alimentos, Bebidas, y el
resto), pero en una versión visual más chica/discreta que combine con
el panel de Segmento de Mercado — el foco visual principal de la
sección sigue siendo el selector de 8 tarjetas de arriba, no esta
grilla secundaria.
- Cada tarjeta de familia mantiene su "Ver catálogo" que abre el
  catálogo filtrado a esa familia específica (comportamiento ya
  existente, sin segmento de cliente asociado).
- No hace falta reconstruir el diseño de las tarjetas de familia desde
  cero — adaptar/reescalar el componente ya existente al nuevo
  contexto (más chico, quizás sin el borde de color de acento tan
  prominente, para que no compita visualmente con las tarjetas de
  segmento de arriba).

### 4. Carrito y mensaje de WhatsApp — debe funcionar igual desde ambas entradas
Isaac ya construyó un carrito (con Claude Code, en una sesión
anterior) que arma un mensaje personalizado de WhatsApp al número ya
configurado, cuando se agregan productos desde el catálogo. Localizar
esa implementación real en el código (buscar el componente/hook del
carrito, cómo arma el mensaje) y confirmar que funciona exactamente
igual sin importar si el catálogo se abrió:
- Desde un segmento específico (ej. "Panaderías" → categorías
  filtradas).
- Desde "Catálogo general" → una familia específica (ej. "Alimentos").

Si el mensaje de WhatsApp actual incluye referencia al segmento de
cliente (ej. "represento una panadería"), definir qué pasa cuando no
hay segmento asociado (entrada por Catálogo general) — probablemente
el mensaje debe omitir esa parte y quedar genérico, sin inventar un
segmento falso. Revisar la lógica real antes de decidir, y aplicar el
ajuste mínimo necesario para que no se rompa ni muestre algo
incorrecto.

## Verificación
- [ ] "Productos" ya no aparece en navbar/footer, la sección no se
      renderiza en el home — pero los archivos siguen existiendo en
      el proyecto sin usarse.
- [ ] "Segmento de Mercado" muestra 8 tarjetas: 7 segmentos +
      "Catálogo general".
- [ ] Seleccionar cualquiera de los 7 segmentos mantiene el
      comportamiento actual sin cambios.
- [ ] Seleccionar "Catálogo general" muestra la grilla de familias en
      versión más chica/discreta, con "Ver catálogo" funcionando por
      familia.
- [ ] El carrito y el mensaje de WhatsApp funcionan igual desde ambas
      rutas de entrada (segmento específico y catálogo general).
- [ ] `npm run build` corre limpio.
- [ ] Revisar en desktop y mobile, ES y EN.
