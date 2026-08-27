# Reemplazar imágenes de portada e índice en ProductCatalogModal

## Contexto
Ya se generaron y guardaron dos imágenes nuevas en `public/Catalogo/`:
- `portada.png` — foto aérea del edificio/bodega de Mercasa con paneles
  solares, para la PORTADA del catálogo (primera página del flipbook).
- `indice.png` — foto interior de bodega con montacargas y logo Mercasa
  en la pared, para la página de "Nuestro Portafolio" (la página que
  lista las 5 familias con sus descripciones).

Estas dos imágenes son las que se REPITEN/comparten en varias partes del
catálogo (portada general + página de portafolio), a diferencia de las
imágenes de las páginas divisoras por sub-familia, que van a ser distintas
para cada una y se generan/agregan después.

## Objetivo
En `ProductCatalogModal.tsx` (o donde esté definida la estructura de
`bookPages`/páginas del flipbook), encontrar:
1. La página de portada (la primera, con el título "Catálogo de
   Productos" / "Soluciones que mueven tu negocio" sobre una foto de
   fondo) — reemplazar la imagen de fondo actual por `/Catalogo/portada.png`.
2. La página de "Nuestro Portafolio" (la que lista las 5 familias con la
   foto de carretera/logística al lado, vista en capturas anteriores) —
   reemplazar esa imagen por `/Catalogo/indice.png`.

## Implementación
- Usar el path `/Catalogo/portada.png` y `/Catalogo/indice.png` (Next.js
  sirve todo lo que está en `public/` desde la raíz `/`).
- Si el componente usa `next/image`, confirmar que las dimensiones/props
  (`width`, `height`, o `fill`) sigan siendo apropiadas para el tamaño
  real de las imágenes nuevas — puede que si el placeholder anterior
  tenía un aspect ratio distinto, haga falta ajustar `object-fit: cover`
  o el contenedor para que no se vean recortadas o distorsionadas raro.
- Si las imágenes actuales estaban hardcodeadas como URLs externas
  (ej. de un servicio de stock), buscar esas referencias específicas y
  reemplazarlas — no dejar ambas conviviendo.

## Verificación
- Abrir el catálogo, confirmar que la portada muestra la foto aérea nueva.
- Navegar a la página "Nuestro Portafolio", confirmar que muestra la foto
  de bodega con montacargas nueva.
- Confirmar que ambas imágenes se ven bien recortadas/posicionadas dentro
  de su contenedor (sin distorsión, sin cortes raros de composición
  importante como caras o el logo).
- Si hay Chrome MCP disponible, verificar visualmente.

## No tocar
- El resto de la lógica del flipbook, canto de páginas, backdrop, etc. —
  esto es solo el reemplazo puntual de dos imágenes.
