# Fix: Sección Customer Class — 4 cambios

## Contexto
La sección "Customer Class" (antes de Contacto) tiene 4 problemas a
resolver en esta pasada. Aplicar los 4, y al final VERIFICAR
VISUALMENTE en navegador cada uno con captura antes de reportar como
terminado — ya pasó antes que el código "se ve bien" pero en pantalla
no se nota el cambio (pasó justo con el corte circular que se está
arreglando ahora).

---

## 1. Renombrar "Institucional" → "Sector Público" en TODA la página

Buscar todas las apariciones del texto visible "Institucional" en el
proyecto (chips de categorías en el panel de Customer Class, catálogo,
cualquier otro componente) y cambiar el label mostrado al usuario a
"Sector Público".

**IMPORTANTE — no romper el matching interno:**
La sub-familia real del catálogo de productos sigue llamándose
"Institucional" en la base de datos / lógica interna (es la que se usa
para filtrar productos, hacer match con las categorías del catálogo,
etc.). NO renombrar el valor interno/key/id que se usa para ese
matching — solo el texto que ve el usuario.

Patrón a seguir: si hay un mapeo tipo
`{ id: "institucional", label: "Institucional" }`, cambiar solo
`label` a `"Sector Público"` y dejar `id` intacto. Si el texto
"Institucional" está hardcodeado directo como string visible en JSX sin
pasar por un mapeo (ej. en el chip de categorías del panel), cambiar el
string visible pero revisar que no se use ese mismo string en ningún
`.includes()`, `===`, o filtro que dependa del texto exacto "Institucional"
para matchear con el catálogo — si existe ese caso, hay que separar el
label visual del valor de comparación en vez de romper el filtro.

Revisar especialmente:
- El chip "Institucional" dentro del panel de categorías disponibles de
  Customer Class (el que aparece con ícono de banco/edificio).
- Cualquier filtro o dropdown del catálogo de productos que también
  muestre "Institucional" como nombre de sub-familia visible al usuario.

Confirmar con grep/búsqueda de texto en todo el proyecto que no queda
ningún "Institucional" visible en UI — solo debe quedar como posible
id/key interno si aplica.

---

## 2. Corte circular de la foto — hacerlo real y visible

Actualmente el panel navy tiene una foto a la izquierda con un intento
de corte circular/cóncavo en la esquina inferior derecha que en
pantalla real casi no se nota (border-radius muy chico o mal aplicado).

Referencia visual: un cuarto de luna cóncavo bien marcado — imaginá la
foto como un rectángulo con esquinas redondeadas normales, pero en la
esquina inferior derecha en vez de un redondeo convexo hay una
"mordida" cóncava grande que hunde hacia adentro, dejando ver el fondo
navy del panel detrás, como si un círculo grande se hubiera "comido"
esa esquina desde fuera.

Implementación sugerida (ajustar según cómo esté estructurado el
componente):
- Usar un `clip-path` o mask con un círculo grande posicionado fuera de
  la esquina inferior derecha de la imagen, de forma que el borde del
  círculo corte visiblemente la esquina de la foto (no un simple
  `border-radius` chico, eso no logra el efecto de "mordida").
- El radio del círculo debe ser lo suficientemente grande como para que
  el corte sea claramente visible — no sutil. Referencia: el corte
  debe cubrir aproximadamente 15-20% del ancho/alto de la esquina de la
  foto, no un 3-5%.
- El área que queda "mordida" debe mostrar el fondo navy del panel
  detrás (o un leve degradado que se funda con el navy), no un hueco
  blanco ni un borde duro sin contexto.
- Si la implementación actual usa `border-radius` en la esquina, hay
  que reemplazarla por el enfoque de clip-path/mask circular — el
  border-radius normal no puede lograr una concavidad, solo redondea
  hacia afuera.

Después de aplicar, tomar captura real en navegador (no confiar en que
el código "debería verse bien") y confirmar que el corte se nota
claramente antes de dar esto por resuelto.

---

## 3. Panel navy — quitar el azul plano, darle más profundidad

El fondo navy del panel de contenido (donde está el texto, categorías,
y botón "Explorar productos") actualmente es un color sólido plano y
se ve chato comparado con el resto del diseño del sitio.

Mejorarlo con algo de esto (elegir lo que combine mejor con el resto
del sitio, revisar si ya hay un patrón similar usado en otra sección):
- Un gradiente sutil (ej. de un navy un poco más oscuro en una esquina
  a un navy un poco más claro/saturado en la otra, o un gradiente
  radial suave desde el centro).
- Una textura sutil de fondo (los "cuadraditos" decorativos que ya
  aparecen en la esquina inferior derecha del panel podrían extenderse
  un poco más o repetirse con menor opacidad en más zonas, si eso no
  choca con la legibilidad del texto).
- Una sombra interna suave (`inset box-shadow`) para dar sensación de
  profundidad en los bordes del panel.

No usar nada que compita con la legibilidad del texto blanco/amarillo
que va encima — el objetivo es que se sienta menos "plano de Paint" y
más como el resto del diseño premium del sitio, sin exagerar.

---

## 4. CTA para bajar de Customer Class a Contacto

Cuando el usuario selecciona un Customer Class (ej. "Panaderías") y
después navega a la sección Contacto, el botón de WhatsApp en Contacto
ya arma un mensaje personalizado según esa selección (confirmar en el
código cómo se lee esa selección — probablemente algún estado
compartido o query param).

Agregar un botón/link adicional en el panel navy de Customer Class,
junto al botón "Explorar productos" (puede ir al lado o debajo, ajustar
según espacio), que haga scroll suave hasta la sección Contacto.

Sugerencias:
- Texto tipo "Escribinos sobre esto →" o "Contactar sobre [nombre del
  segmento] →" (si se puede interpolar el nombre del customer class
  seleccionado, mejor — si no, un texto genérico está bien).
- Estilo secundario/outline (no debe competir visualmente con el botón
  amarillo "Explorar productos" que es la acción principal) — por
  ejemplo texto blanco/amarillo con solo un borde o un link subrayado
  con flecha, no otro botón sólido amarillo al lado.
- Scroll suave (`scrollIntoView({ behavior: "smooth" })` o el mecanismo
  que ya use el sitio para el menú de navegación) hasta la sección
  Contacto, manteniendo la selección de customer class activa para que
  el mensaje de WhatsApp llegue ya personalizado.

---

## Checklist final antes de reportar como terminado
- [ ] Grep de "Institucional" en todo el proyecto — confirmar que no
      queda visible en ningún componente de UI.
- [ ] Captura real en navegador del corte circular — debe notarse
      claramente, no ser un cambio sutil de border-radius.
- [ ] Captura real del panel navy con la mejora de profundidad aplicada.
- [ ] Probar en navegador: seleccionar un Customer Class → click en el
      nuevo botón/link → confirmar que hace scroll a Contacto → 
      confirmar que el WhatsApp en Contacto trae el mensaje
      personalizado con ese segmento.
