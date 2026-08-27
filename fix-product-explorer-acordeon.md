# Corrección de dirección — ProductExplorer como acordeón en un solo cuadro

## Por qué este cambio
El rediseño anterior (`rediseno-product-explorer.md`) convirtió esto en
una navegación de 3 pantallas separadas (Familia → Sub-familia →
Categoría, cada una reemplazando a la anterior con breadcrumb para volver).
Isaac lo probó y NO es lo que quiere. La dirección correcta es más simple
y contenida:

- **Un solo cuadro/contenedor fijo**, que NO cambia de tamaño ni de
  posición en la página al interactuar.
- **Las familias son las protagonistas**: grandes, visuales, cada una con
  su propio acceso directo a la revista (abrir el catálogo de esa
  familia).
- Al hacer click en una familia, el contenido se **expande hacia adentro
  del mismo cuadro** (acordeón), mostrando sus categorías.
- Al hacer click en una categoría, se expande más adentro del mismo
  cuadro mostrando los **nombres de los productos** (solo texto, sin foto,
  sin precio) de esa categoría.
- Nada de esto debe sacar al usuario del cuadro ni cambiar el layout
  general de la sección — todo pasa por expansión/colapso dentro del
  mismo contenedor (como un accordion de varios niveles).
- **Eliminar el buscador** ("Buscar un producto por nombre...") — no va
  en esta sección.

## Qué SÍ se mantiene del intento anterior
- La prop `initialCategoryId` que se le agregó a `ProductCatalogModal`
  para abrirlo posicionado en una categoría específica — sigue siendo
  útil para el botón de "abrir revista" de cada familia/categoría.
- La paleta institucional (navy `#1B2A4A`, gold `#C9A84C`), el tono
  corporativo serio, las animaciones suaves ya usadas en el resto del
  sitio.
- El CTA de "Explorá el catálogo completo" que abre la revista desde la
  portada — puede quedarse como una opción adicional arriba del acordeón.

## Estructura nueva propuesta

```
┌─────────────────────────────────────────────────┐
│  [Explorá el catálogo completo]  (CTA opcional)  │
├─────────────────────────────────────────────────┤
│  ▸ Alimentos              +410 productos  [Revista →]  │
│  ▸ Cuidado del Hogar       +240 productos  [Revista →]  │
│  ▾ Bebidas                 +150 productos  [Revista →]  │  ← expandida
│      ▸ Gaseosas                    45 productos   │
│      ▾ Aguas                       30 productos   │  ← expandida
│          Agua Cristal 600ml                        │
│          Agua Alpina 1L                             │
│          ...                                        │
│      ▸ Energizantes                20 productos   │
│  ▸ Cuidado Personal        +80 productos  [Revista →]  │
│  ▸ Electrónica              7 productos   [Revista →]  │
└─────────────────────────────────────────────────┘
```

(Diagrama ilustrativo — el estilo visual final queda a criterio de
diseño, pero la ESTRUCTURA debe ser esta: un cuadro, con niveles anidados
que se expanden/colapsan adentro, no pantallas que se reemplazan.)

## Implementación

1. Volver a un solo componente contenedor (`.product-explorer-panel` o
   como se llame) que NO cambia de alto/ancho de forma abrupta — usar
   animación de expandir/colapsar altura (Framer Motion `AnimatePresence`
   + `layout` prop, o una transición de `max-height`/`height: auto`) para
   que el crecimiento del acordeón se sienta suave, no un salto.

2. Cada FAMILIA es una fila/tarjeta grande (protagonista):
   - Ícono, nombre, conteo de productos.
   - Un botón/link "Revista" o "Ver catálogo" que abre
     `ProductCatalogModal` directo en esa familia (usando
     `initialCategoryId` con la primera categoría de esa familia, o lo
     que corresponda).
   - Un click en el resto de la fila (no en el botón de Revista) expande/
     colapsa para mostrar sus sub-familias/categorías debajo, dentro del
     mismo cuadro.

3. Dentro de la familia expandida, las CATEGORÍAS se listan como filas
   más chicas (indentadas), cada una expandible también.

4. Dentro de la categoría expandida, los PRODUCTOS se listan como texto
   plano — solo nombre del producto, sin foto, sin precio, sin badge de
   disponibilidad. Puede ser una lista simple, en columnas si hay muchos,
   con scroll interno si la lista es muy larga (para no romper el alto
   del cuadro — considerar un `max-height` con `overflow-y: auto` en el
   nivel de productos específicamente, para que un cuadro con 400
   productos no vuelva gigante toda la página).

5. Solo una familia expandida a la vez, y dentro de ella solo una
   categoría expandida a la vez (acordeón clásico) — para mantener el
   cuadro manejable. Si Isaac prefiere que se puedan expandir varias a la
   vez, dejarlo así por defecto pero es un detalle menor a confirmar
   después si hace falta.

6. Eliminar completamente el `<input>` de búsqueda y toda la lógica
   asociada que se haya agregado para manejarlo.

## Fuente de datos de productos (solo nombres)
Esta vista sí necesita ahora la lista de nombres de producto por
categoría (a diferencia de la versión anterior que los había sacado del
todo). Confirmar de dónde sale esa data — probablemente ya está disponible
en el mismo fetch que alimenta los conteos de categoría (MercasaVIP API),
solo hay que asegurarse de que el nombre del producto esté incluido en
esa respuesta y renderizarlo como texto simple.

## No tocar
- `ProductCatalogModal.tsx` y su lógica de flipbook/canto de páginas/
  backdrop — ya está bien, solo se reusa `initialCategoryId` desde afuera.
- `/api/product-images` — este componente no necesita fotos, sigue sin
  usarlo.

## Verificación
- Que el cuadro no cambie de posición/tamaño de forma brusca al expandir
  (transición suave).
- Que expandir una familia distinta colapse la anterior (si se implementa
  como acordeón de "una sola a la vez").
- Que el botón de "Revista"/"Ver catálogo" de cada familia abra el modal
  en el lugar correcto.
- Que el buscador ya no exista en ningún lado de esta sección.
- Probar responsive (desktop y mobile).
- Si hay Chrome MCP disponible, verificar visualmente antes de dar por
  terminado.
