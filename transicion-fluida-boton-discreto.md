# Fix: transición fluida Segmento de Mercado → Marcas + botón menos invasivo

## Contexto
Confirmado que `marcas-orden-y-catalogo-general-banner.md` ya se
aplicó (mural de marcas movido, banner de Catálogo general
implementado) — verificado por HTML/typecheck pero NO visualmente en
navegador todavía. Antes de aplicar este nuevo fix, levantar el dev
server y confirmar visualmente cómo quedó lo anterior, ya que este
prompt parte de ese resultado.

## Problema 1 — corte brusco entre "Segmento de Mercado" y el mural de marcas
Al pasar de la sección "Segmento de Mercado" (fondo beige) al mural de
marcas (fondo blanco), se nota un corte de sección visible — no se
siente fluido como otras transiciones del sitio (ej. la curva tipo ola
ya usada en el Hero y en Productos).

## Fix
Elegir el enfoque que mejor combine en la práctica (probar y usar el
que se vea mejor):

- **Opción A — curva/ola de transición**: agregar el mismo recurso de
  curva tipo ola ya usado en otras transiciones del sitio entre el
  final de "Segmento de Mercado" y el inicio del mural de marcas.
- **Opción B — mismo fondo, sin corte**: unificar el color de fondo
  entre ambas secciones (ej. las dos en el mismo beige `#F7F4EE`, o un
  degradado muy sutil de un tono al otro) para que no haya un borde
  duro entre ellas.

Usar criterio de diseño — la curva es más "decorativa/editorial", el
fondo compartido es más "minimalista/continuo". Cualquiera resuelve el
problema; elegir la que se sienta más coherente con el estilo ya
establecido en esa parte del sitio.

## Problema 2 — botón "Ver catálogo completo" muy invasivo
El botón dentro del banner navy de "Catálogo general" es correcto en
color (dorado sobre navy) pero se pidió que sea menos protagónico.

## Fix
- Reducir el tamaño del botón (padding y tipografía más chicos que el
  actual).
- Cambiar de un botón sólido relleno a un estilo más liviano — ej.
  solo texto con flecha y un subrayado o borde sutil, en vez de una
  píldora sólida grande, manteniendo el tono dorado como acento pero
  con menos peso visual.
- El objetivo: que siga siendo claramente clickeable e invite a la
  acción, pero sin competir visualmente con el ícono, el título
  "Catálogo general" y la descripción del banner — el botón es
  secundario, no el foco.

## Verificación
- [ ] Levantar el dev server y confirmar visualmente en Chrome cómo
      quedó el resultado de `marcas-orden-y-catalogo-general-banner.md`
      antes de aplicar este fix.
- [ ] Captura de la transición entre Segmento de Mercado y el mural de
      marcas, mostrando un cambio más fluido que antes.
- [ ] Captura del banner de Catálogo general con el botón en su nueva
      versión menos invasiva.
- [ ] Confirmar que el botón sigue siendo claramente clickeable.
- [ ] Revisar en desktop y mobile.
