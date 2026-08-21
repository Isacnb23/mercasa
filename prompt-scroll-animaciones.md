Dos mejoras de experiencia relacionadas con el scroll:

## 1. Smooth scroll en la navegación (navbar + footer)

Actualmente al hacer click en los enlaces de navegación (Inicio, Nosotros, 
Logística, Marcas, Contacto — tanto en el navbar como en el footer) que 
apuntan a anclas (#secciones), el salto es brusco/instantáneo.

Cambiar a:
- Scroll suave y animado hacia la sección correspondiente al hacer click en 
  cualquiera de estos enlaces (navbar y footer).
- Si el proyecto es Next.js/React con navegación por hash, implementar con 
  `scroll-behavior: smooth` en CSS como base, y si se necesita más control 
  (por ejemplo, compensar el offset del navbar sticky para que la sección no 
  quede tapada arriba), usar un scroll programático con `element.scrollIntoView 
  ({ behavior: 'smooth', block: 'start' })` o una librería si ya está 
  instalada (ej. Lenis, framer-motion scroll utils), ajustando el offset para 
  que el navbar fijo no tape el título de la sección de destino.
- Duración/easing del scroll debe sentirse natural, ni muy lento (no más de 
  ~800ms-1s para distancias largas) ni instantáneo.
- Verificar que funcione tanto desde el navbar como desde los enlaces del 
  footer, y que el estado "activo" del navbar (el subrayado azul debajo de 
  "Inicio" que ya existe) se actualice correctamente según la sección visible 
  mientras se scrollea.

## 2. Scroll-reveal en el contenido de las secciones

Al bajar por la página, actualmente todo el contenido está visible de 
entrada sin ninguna animación de aparición. Agregar animaciones sutiles de 
"reveal" cuando los elementos entran en el viewport:

- Efecto: fade-in (opacity 0 → 1) + translate-y corto (desde ~20-30px hacia 
  su posición final), con easing suave (ease-out), duración ~500-600ms.
- Debe dispararse UNA vez cuando el elemento entra en el viewport (no repetir 
  cada vez que se vuelve a scrollear hacia arriba/abajo sobre el mismo 
  elemento), usando Intersection Observer (o la librería de scroll/animación 
  que ya esté instalada en el proyecto, ej. framer-motion con 
  `whileInView` + `viewport={{ once: true }}`).
- Aplicar a los bloques principales de cada sección: el hero de logística 
  ("El motor detrás de cada entrega"), las 4 cards del proceso, el bloque de 
  marcas con el mural, la sección de contacto (info + mapa) — no a elementos 
  chiquitos individuales dentro de un mismo bloque (evitar que cada línea de 
  texto anime por separado, que se vea recargado).
- Si hay varios elementos en la misma fila (ej. las 4 cards del proceso), 
  aplicar un stagger sutil (delay incremental de ~80-100ms entre cada una) 
  para que entren en secuencia en vez de todas a la vez — se ve más elegante.
- Importante: la animación debe respetar `prefers-reduced-motion` — si el 
  usuario tiene esa preferencia activada en su sistema, mostrar el contenido 
  directamente sin animación.
- No debe haber layout shift ni que el contenido "salte": los elementos deben 
  ocupar su espacio real desde el inicio, solo animando opacity/transform.

Objetivo: que la página se sienta más viva y con más intención al navegar y 
scrollear, sin caer en algo exagerado o que distraiga del contenido.
