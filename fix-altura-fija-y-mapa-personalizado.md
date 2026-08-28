# Fix: altura fija del panel Customer Class + mapa más personalizado

## Problema 1 — El panel cambia de tamaño según el customer class elegido
Al cambiar entre los 7 "customer class", el panel (tarjeta blanca con el
selector + "categorías que te interesan") cambia de alto según cuántos
chips de categoría tenga ese segmento (algunos tienen 3, otros 4-6) —
esto empuja hacia abajo el bloque de info + mapa que está debajo,
haciendo que toda la sección "salte" cada vez que se cambia de segmento.

### Fix
Aplicar el mismo criterio que ya se usó para el acordeón de
`ProductExplorer` (fix anterior de altura fija, no `max-height` que
crece): el contenedor completo de la tarjeta de Customer Class (selector
+ panel de categorías que te interesan) debe tener una **altura fija**
desde el primer render, calculada para acomodar el caso con MÁS chips de
categoría (el segmento que tenga más), de forma que:

- Los segmentos con menos chips no estiran ni encogen el cuadro — el
  espacio extra queda vacío/con aire abajo dentro del mismo cuadro fijo
  (alineado arriba, no centrado verticalmente, para que no se vea raro).
- Los segmentos con más chips tampoco lo agrandan — si hiciera falta,
  que esos chips hagan wrap dentro del espacio ya fijo, no que estiren el
  contenedor.
- El bloque de info + mapa que está DEBAJO nunca se mueve, sin importar
  qué segmento esté seleccionado.

Confirmar cuál segmento tiene más chips (contando el título "categorías
que te interesan" + todos sus chips) para calcular la altura fija
correcta, y probar cambiando entre TODOS los 7 segmentos para confirmar
que ninguno rompe el alto fijo.

## Problema 2 — El mapa no se ve personalizado, solo parece Google Maps genérico
Isaac revisó el mapa en el navegador y no ve el casing azul institucional
ni el marco reforzado que se había reportado como aplicado — se ve como
un mapa genérico (marcador rojo default, colores estándar de POIs
naranja/azul genéricos).

### Primero: confirmar qué está pasando
1. Confirmar si los cambios del fix anterior (estilo "liberty" + casing
   azul en calles + marco azul con sombra) están efectivamente en el
   código actual del componente del mapa, o si por algún motivo no
   llegaron a aplicarse/commitearse correctamente.
2. Si están en el código pero no se ven en el navegador, puede ser caché
   del navegador o que el dev server no haya recargado ese componente —
   probar con hard refresh (`Ctrl+Shift+R`) y/o reiniciar `npm run dev`
   antes de asumir que el código está mal.
3. Reportar cuál de las dos cosas era: código no aplicado, o problema de
   caché/recarga.

### Después: llevar la personalización más lejos
Una vez confirmado que el casing básico funciona, agregar:

1. **Marcador personalizado**: reemplazar el pin rojo default de
   MapLibre por un marcador custom con la identidad de Mercasa — puede
   ser un pin en navy `#1B2A4A` con el logo/ícono de Mercasa adentro, o
   al menos un pin de color navy/gold en vez del rojo genérico.

2. **Paleta de colores del mapa completo**: en vez de solo el casing de
   calles, ajustar (vía el style.json de MapLibre, si es un estilo custom
   editable, o filtrando con capas propias encima) los colores de:
   - Áreas verdes/parques → un verde más apagado/institucional en vez del
     verde brillante default.
   - Agua → un azul más cercano al navy institucional.
   - Fondo general de tierra/edificios → tonos más neutros/beige que
     combinen con la paleta del sitio, en vez de los grises/blancos
     genéricos de OpenFreeMap.
   
   El objetivo es que el mapa se sienta como "el mapa de Mercasa", no
   como un mapa de Google/OSM genérico insertado sin ningún tratamiento
   de marca — pero sin perder legibilidad real (seguir viéndose como un
   mapa de verdad, no un dibujo abstracto).

3. Si OpenFreeMap/MapLibre no permite fácilmente re-colorear capas
   específicas del estilo "liberty" sin construir un style.json custom
   desde cero, evaluar cuánto esfuerzo implica — si es mucho trabajo,
   priorizar al menos el marcador personalizado (impacto visual alto,
   esfuerzo bajo) y dejar la recoloración completa de capas como mejora
   posterior si el tiempo no alcanza.

## Verificación
- Cambiar entre los 7 customer class, confirmar que el panel nunca cambia
  de alto y el mapa/info de abajo nunca se mueve.
- Confirmar visualmente (captura real del navegador, no solo código) que
  el mapa se ve con casing azul, marco reforzado, y el marcador
  personalizado.
- Si hay Chrome MCP disponible, usarlo para esta verificación — ya hubo
  una discrepancia entre "el código dice que está aplicado" y "lo que
  Isaac ve en pantalla", así que hace falta confirmar en vivo.
