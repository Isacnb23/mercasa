# Fix: reordenar mural de marcas + rediseñar "Catálogo general" como elemento distinto

## Cambio 1 — mover el mural de marcas después de "Segmento de Mercado"
Ahora que la sección "Productos" ya no existe, el mural de marcas
(`BrandsSection` o como se llame el componente del carrusel/mural de
logos) debe aparecer justo DESPUÉS de "Segmento de Mercado" en el
orden de la página (`app/[locale]/page.tsx`), en vez de donde estaba
antes (probablemente después de Productos).

Confirmar el nombre real del componente y su posición actual antes de
mover, y ajustar el orden en `page.tsx`.

## Cambio 2 — "Catálogo general" con diseño propio, no una tarjeta más de la grilla

Actualmente "Catálogo general" es la 8va tarjeta del selector,
idéntica en forma a las 7 de segmento (mismo tamaño, ícono en círculo,
título) — se pidió que tenga un diseño genuinamente distinto, no solo
más grande o de otro color dentro del mismo molde de tarjeta.

### Dirección: banner/CTA propio, separado de la grilla de 7
Sacar "Catálogo general" de la grilla de 7 tarjetas de segmento (que
vuelve a ser una grilla limpia de 7, sin la 8va huérfana) y convertirlo
en un elemento distinto debajo del selector:

- Un banner horizontal de ancho completo, con fondo navy sólido (o un
  degradado sutil navy), ubicado justo debajo de la fila de 7
  tarjetas de segmento.
- Contenido del banner: ícono a la izquierda (el mismo `LayoutGrid`/
  `Package` ya elegido, pero más grande, en un círculo con fondo claro
  sobre el navy), título "Catálogo general" en blanco, una descripción
  corta ("Explorá todo nuestro catálogo por familia de producto" o
  similar), y un botón/CTA a la derecha tipo "Ver catálogo completo →"
  en dorado o blanco con borde, contrastando con el fondo navy.
- Al hacer click en el banner (o en su botón), se despliega el mismo
  panel de familias (Alimentos, Bebidas, etc.) que ya se armó en el
  refactor anterior — mismo comportamiento funcional, solo cambia
  cómo se ve el disparador (banner en vez de tarjeta de grilla).
- El banner debe sentirse como una opción complementaria clara y
  diferenciada — "elegí tu segmento arriba, o explorá todo el
  catálogo acá abajo" — no como una 8va opción más disputando espacio
  visual con las 7 tarjetas de segmento.

## Verificación
- [ ] Mural de marcas aparece justo después de "Segmento de Mercado".
- [ ] La grilla de segmentos vuelve a ser de 7 tarjetas limpias, sin
      la 8va tarjeta huérfana.
- [ ] "Catálogo general" aparece como un banner distinto debajo de la
      grilla, con su propio diseño (navy, ícono grande, CTA).
- [ ] El click en el banner sigue abriendo el panel de familias
      correctamente (mismo comportamiento que antes, solo cambia el
      disparador visual).
- [ ] El carrito y el mensaje de WhatsApp siguen funcionando igual
      desde esta nueva forma de entrada.
- [ ] Revisar en desktop y mobile, ES y EN.
