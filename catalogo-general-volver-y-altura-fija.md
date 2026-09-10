# Catálogo general: falta volver atrás + salto de layout

## Contexto

`mercasa-web` (Next.js), sección "Segmento de Mercado". Dentro del banner navy
"Catálogo general" hay un botón/link "Ver catálogo completo" que, al hacer clic,
reemplaza la tarjeta actual (la del segmento seleccionado, ej. "Supermercados y
cadenas" con su descripción/imagen) por una vista de "Todo nuestro catálogo, por
familia" (grid de familias: Alimentos, Bebidas, Cuidado del Hogar, etc.).

## Problemas a corregir

### 1. No hay forma de volver

Una vez que se entra a la vista "Todo nuestro catálogo, por familia", no existe
ningún botón, link o affordance para regresar a la vista anterior (la tarjeta del
segmento de cliente seleccionado). El usuario queda atrapado en esa vista y solo
puede salir cambiando de tab arriba (Supermercados, Hotelería, etc.), lo cual no es
obvio.

**Acción:** agregar una forma clara de volver — por ejemplo un botón "← Volver" o
similar arriba de la vista de familias, o hacer que el link "Ver catálogo completo"
se convierta en un toggle (ej. "Ver catálogo completo" ↔ "Volver a segmentos") que
alterne entre ambas vistas.

### 2. La sección cambia de alto/espacio al alternar vistas

Al pasar de la tarjeta de segmento a la vista de familias (y viceversa), el
contenedor cambia de tamaño y empuja el contenido de abajo (el mural de marcas),
generando un salto visual (layout shift).

**Acción:** ambas vistas deben vivir dentro del mismo espacio/contenedor, con una
altura consistente (o una altura mínima común, o transición animada de altura) para
que el cambio entre "segmento seleccionado" y "catálogo por familia" no mueva el
resto de la página. Si el contenido de una vista es más corto que el de la otra,
usar altura mínima fija o centrar verticalmente en vez de dejar que el contenedor
colapse.

## Qué NO tocar

- La navegación por tabs de segmento (Supermercados, Hotelería, etc.) — debe seguir
  funcionando igual.
- El fondo unificado entre Segmento de Mercado y el mural de marcas (ya corregido en
  `unificar-fondo-marcas-y-boton-catalogo.md`).
- El tamaño/estilo ya reducido del botón "Ver catálogo completo".

## Verificación

- Entrar a "Ver catálogo completo", confirmar que aparece una forma clara de volver.
- Volver a la vista de segmento y confirmar que el layout no salta ni empuja el
  mural de marcas hacia arriba/abajo.
- Repetir el toggle varias veces (ida y vuelta) para confirmar que no hay parpadeo
  ni salto de scroll.
- Revisar en desktop y en mobile.
