# Ajuste de encaje de la sección "Nuestros Productos" en pantallas de laptop

## Problema
En pantallas de laptop (resoluciones comunes: 1366×768, 1440×900, que
tienen menos alto disponible que un monitor de escritorio grande), la
sección completa —el título "Todo lo que tu negocio necesita", los 3
íconos de features, el buscador/CTA, y el cuadro de familias/categorías—
ocupa más alto del que cabe cómodamente, y el cuadro con las categorías
queda cortado justo debajo del borde visible, obligando a scrollear la
página entera para ver el contenido completo del cuadro.

## Objetivo
Ajustar el "encaje" general de la sección para que en laptops comunes se
vea más compacta y el cuadro de familias/categorías sea más visible sin
tanto scroll de página.

## Cambios sugeridos (aplicar los que tengan sentido, usar criterio)

### 1. Reducir espacio vertical antes del cuadro
- Achicar un poco el `margin`/`padding` entre: el título de la sección,
  los 3 íconos de features (Catálogo completo / Disponibilidad
  garantizada / Compromiso con el cliente), el texto "FAMILIAS DE
  PRODUCTO", el botón "Explorá el catálogo completo", y el cuadro en sí.
- No hace falta eliminar ningún elemento, solo ajustar los espacios entre
  ellos para que el conjunto sea más compacto verticalmente.

### 2. Altura del cuadro responsive en vez de fija en pixels
Actualmente el cuadro tiene una altura fija (`h-[640px]` o similar,
definida en un fix anterior). Cambiar a una altura que se adapte al alto
de viewport disponible, usando `clamp()` con unidades de viewport height:

```css
.product-explorer-box {
  height: clamp(420px, 65vh, 640px);
  /* mínimo 420px (que no quede demasiado chico en pantallas muy bajas),
     preferido 65% del alto de viewport,
     máximo 640px (no crecer más que eso en monitores grandes) */
}
```

Ajustar los números exactos a ojo probando en un viewport de laptop
simulado (1366×768 o 1440×900 en DevTools) hasta que el cuadro se vea
completo (o casi completo, con el mínimo de scroll de página posible)
sin cortarse feo.

### 3. Considerar el alto del sidebar de features (los 3 íconos)
Si los 3 íconos con su texto ocupan mucho espacio vertical, evaluar si en
pantallas de laptop (breakpoint intermedio, no necesariamente mobile)
tiene sentido ponerlos en una fila más compacta (íconos más chicos, texto
más corto o en una sola línea) — solo si no complica demasiado, es un
nice-to-have, no bloqueante.

## Verificación
- Probar en DevTools con viewport simulado de 1366×768 y 1440×900
  (laptops comunes) además del tamaño de escritorio normal.
- Confirmar que el cuadro de familias/categorías es más visible sin tener
  que scrollear tanto la página completa.
- Confirmar que en monitores grandes (1920×1080 o más) el cuadro no se ve
  raro por el `clamp()` — debe seguir viéndose bien, solo un poco más
  compacto que antes si aplica.
- Confirmar que en mobile no se rompe nada (el `clamp()` con `vh` puede
  comportarse distinto en mobile por las barras del navegador — revisar).
- Si hay Chrome MCP disponible, usarlo para probar los distintos tamaños
  de viewport y compartir cómo se ve antes de dar por terminado.
