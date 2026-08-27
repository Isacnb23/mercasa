# Fix: dropdown plano de categorías + catálogo no abre en la página correcta

## Problema 1 — Dropdown "Ir a categoría" es una lista plana sin agrupar
El selector "Ir a categoría" (arriba del catálogo) muestra TODAS las
categorías de la familia actual en una sola lista larga sin agrupar
(Helados, Yogurt, Leche Fluida, Quesos... Snacks, Confites, Chocolates...
Pan Cuadrado, Pan dulce...) — mezclando categorías de distintas
sub-familias sin ninguna jerarquía visual. Es difícil de usar así.

### Objetivo
Agrupar el dropdown por SUB-FAMILIA, con las categorías anidadas debajo
de cada una — igual que ya está organizado en el `ProductExplorer` de la
home (Sub-familia como encabezado, categorías debajo). Si el dropdown es
un `<select>` nativo de HTML, usar `<optgroup label="Nombre Sub-familia">`
para cada grupo. Si es un componente custom (dropdown hecho a mano con
`motion.div` o similar), replicar la misma agrupación visual: título de
sub-familia (no clickeable, o clickeable si querés que también sirva de
atajo) seguido de sus categorías indentadas.

Ejemplo de estructura esperada:
```
Lácteos y Sucedáneos
  Helados
  Yogurt
  Leche Fluida
  Quesos
  ...
Confitería y Snacks
  Snacks
  Confites
  Chocolates
  ...
Panadería Repostería y galletas
  Galletas
  Pastelitos
  Pan Cuadrado
  ...
```

## Problema 2 — El catálogo no abre en la página correcta (ni portada ni la categoría esperada)
Reportado: TANTO el botón "Explorá el catálogo completo" (que debería
abrir siempre en la PORTADA, página 1) COMO el botón "Revista" de una
familia específica (que debería abrir en la página correspondiente a esa
familia) están abriendo en una página incorrecta — parece que se queda
en una posición residual de una apertura anterior del modal, en vez de
ir a donde corresponde cada vez.

### Causa probable
`react-pageflip` (`HTMLFlipBook`) mantiene su propio estado interno de
"página actual" una vez montado. Si el componente `ProductCatalogModal`
no se desmonta completamente entre aperturas (o si el `key` del
`HTMLFlipBook` no cambia), la librería puede estar recordando la última
página vista de la apertura anterior, ignorando el `initialCategoryId` o
el `startPage` que se le pasa la próxima vez que se abre.

### A revisar y corregir
1. Confirmar cómo se abre/cierra `ProductCatalogModal` — ¿se desmonta del
   DOM por completo al cerrar (`{isOpen && <ProductCatalogModal ... />}`)
   o se queda montado y solo se oculta con CSS (`display: none` /
   `visibility: hidden`)? Si se queda montado, ESE es probablemente el
   bug — hay que forzar un remount completo cada vez que se abre, o
   manejar explícitamente el reset de página al abrir.

2. Si se decide mantenerlo montado (por rendimiento, transiciones, etc.),
   entonces al abrir hay que:
   - Calcular explícitamente el `startPage`/página destino según el
     `initialCategoryId` recibido (0 si es la apertura general "portada
     completa", el índice correspondiente si es una categoría/familia
     específica).
   - Llamar al método de la librería para saltar a esa página
     inmediatamente después de abrir — `react-pageflip` expone una `ref`
     con métodos como `pageFlip().flip(targetPageIndex)` o
     `pageFlip().turnToPage(targetPageIndex)` (confirmar el nombre exacto
     según la versión instalada) — usar eso en un `useEffect` que corra
     cada vez que `isOpen` pasa a `true` o que `initialCategoryId` cambia.

3. Si se opta por desmontar/remontar completo, usar un `key` único en el
   `HTMLFlipBook` (o en `ProductCatalogModal` entero) que cambie cada vez
   que se abre con un `initialCategoryId` distinto — eso fuerza a
   `react-pageflip` a inicializar de cero en la página correcta, sin
   arrastrar estado de la apertura anterior.

4. Confirmar específicamente:
   - "Explorá el catálogo completo" → SIEMPRE abre en página 1 (portada),
     sin importar en qué página se había quedado la última vez que se
     cerró el modal.
   - Botón "Revista" de una familia en el sidebar → abre en la página que
     le corresponde a esa familia (la primera categoría de esa familia,
     o la página divisoria de la familia si existe una).
   - Selector "Ir a categoría" (una vez agrupado) → sigue funcionando
     igual que antes, saltando a la categoría elegida.

## Verificación
1. Abrir el catálogo con "Explorá el catálogo completo", navegar manualmente
   varias páginas adelante (ej. hasta la página 50), cerrar el modal.
2. Volver a abrir con "Explorá el catálogo completo" — confirmar que abre
   en la página 1 (portada), NO en la página 50 donde se había quedado.
3. Repetir la prueba abriendo con el botón "Revista" de una familia
   específica (ej. Bebidas) después de haber estado navegando en otra
   familia — confirmar que abre en la página correcta de Bebidas, no
   donde se había quedado antes.
4. Confirmar que el dropdown "Ir a categoría" ahora agrupa por sub-familia
   visualmente, y que elegir una categoría sigue saltando correctamente.
5. Si hay Chrome MCP disponible, verificar todo esto interactuando de
   verdad en el navegador (abrir, navegar, cerrar, reabrir) — no alcanza
   con revisar el código, hay que probar la secuencia real de aperturas
   múltiples para confirmar que no hay estado residual.
