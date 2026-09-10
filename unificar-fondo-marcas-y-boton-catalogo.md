# Ajustes visuales: fondo marcas + tamaño botón catálogo

## Contexto

`mercasa-web` (Next.js), sitio en producción en `mercasacr.com`. Después de aplicar
`transicion-fluida-boton-discreto.md`, se revisó visualmente en Chrome y quedan dos
detalles por corregir en la sección **Segmento de Mercado** y el mural de marcas
que va justo después.

Paleta del sitio (para referencia): navy `#0B315E` / `#082B5C`, beige `#F7F4EE` / `#F1ECE4`, gold `#E3A93D`.

## Problema 1 — Fondo inconsistente entre "Segmento de Mercado" y "Respaldados por marcas líderes"

Actualmente hay un corte de color visible entre ambas secciones: "Segmento de Mercado"
usa el fondo beige de la paleta, y el mural de marcas ("Respaldados por marcas líderes")
tiene fondo blanco. Deben compartir el mismo fondo, sin ese salto de color al hacer scroll.

**Acción:**
- Ubicar el componente de la sección de marcas (mural "Respaldados por marcas líderes").
- Homologar su fondo con el de la sección "Segmento de Mercado" (mismo beige — usar la
  variable/color que ya use esa sección, no un nuevo valor hardcodeado).
- Confirmar que la transición entre ambas secciones se vea continua, sin franja ni salto.

## Problema 2 — Botón "Ver catálogo completo" demasiado grande

Dentro del banner navy "Catálogo general" (el que dice "Explorá todo nuestro catálogo
por familia de producto"), el botón "Ver catálogo completo" es demasiado grande e invasivo
visualmente respecto al resto del banner.

**Acción:**
- Ubicar el botón "Ver catálogo completo" dentro de ese banner.
- Reducirlo: menos padding horizontal/vertical, tipografía más pequeña, y/o cambiar de
  botón sólido grande a un estilo más discreto (por ejemplo outline/ghost o un tamaño
  "sm" si el sistema de diseño ya tiene esa variante).
- Debe seguir siendo claramente clickeable y legible, solo menos protagonista.

## Qué NO tocar

- Lógica funcional del carrito ni el mensaje de WhatsApp.
- Data del catálogo, familias ni segmentos.
- Comportamiento de los 7 tabs de "Segmento de Mercado".

## Verificación

- Revisar el resultado en Chrome (desktop) y también en una vista mobile/responsive.
- Confirmar que el fondo se vea continuo entre Segmento de Mercado → banner Catálogo
  general → mural de marcas.
- Confirmar que el botón "Ver catálogo completo" ya no domine visualmente el banner.
