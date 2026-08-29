# Fix: corte circular sigue sin aplicarse + amarillo sigue reluciente (intento 3)

## Contexto — leer con cuidado antes de tocar código
Este es el TERCER intento con estos dos problemas. Los dos reportes
anteriores dijeron "aplicado y verificado con captura real" y en ambos
casos, al revisar la captura real con Isaac, el cambio NO se nota en
pantalla. Esto ya pasó dos veces seguidas con el mismo elemento (el
corte circular) — no volver a reportar como resuelto sin cumplir el
checklist de verificación al final de este documento, paso por paso,
con capturas.

No asumir que la explicación técnica anterior (mask-image, clip-path,
etc.) fue correcta solo porque suena razonable en el código. El
problema puede estar en OTRO lugar: el componente que Isaac ve en
pantalla podría no ser el mismo archivo que se está editando (puede
haber dos componentes similares, uno viejo sin usar y uno real
importado), podría haber un problema de build/caché, o el estilo se
está aplicando pero algo lo está sobrescribiendo (otro CSS con más
especificidad, un `overflow: hidden` en un padre, orden de imports).

---

## 1. Corte circular — diagnóstico desde cero

Antes de escribir cualquier CSS nuevo:

1. Abrir el sitio en el navegador (dev server corriendo), inspeccionar
   con DevTools el elemento `<img>` (o `<div>` contenedor) de la foto
   del panel de Customer Class.
2. En la pestaña "Computed" de DevTools, confirmar qué `clip-path`,
   `mask-image`, `mask`, o `border-radius` está REALMENTE aplicado en
   el navegador — no lo que dice el archivo fuente, sino el valor
   computado final que el navegador está usando. Si el computed style
   no muestra el mask/clip-path esperado, el problema es que otro CSS
   lo está sobrescribiendo o el selector no está matcheando el elemento
   correcto.
3. Confirmar que el archivo que se está editando es efectivamente el
   componente que se renderiza en esa sección — buscar el import de
   `CustomerClassSection` (o el nombre real del componente) desde la
   página principal y confirmar que no hay una versión duplicada o una
   ruta de import distinta a la que se está editando.
4. Si el `mask-image`/`clip-path` sí aparece en el computed style pero
   visualmente no se nota: revisar el `background` del contenedor
   directo de la imagen — si el contenedor no tiene fondo navy DETRÁS
   de la imagen (o si hay otro elemento tapando esa esquina por
   z-index), el agujero del mask puede estar ahí pero no notarse porque
   no hay contraste de color detrás.
5. Una vez identificada la causa real, aplicar el fix. Si se usa
   `mask-image` con gradiente radial, verificar que el navegador de
   Isaac soporte esa propiedad sin prefijo (agregar `-webkit-mask-image`
   también, ya que `mask-image` sin prefijo tiene soporte inconsistente
   en algunos navegadores/versiones — esto podría explicar por qué en
   el código está pero no se ve).
6. Alternativa más robusta si mask-image sigue sin funcionar de forma
   confiable: usar `clip-path` con un `path()` SVG explícito (no
   depende de gradientes ni de soporte de `mask`, tiene mejor soporte
   cross-browser). Ejemplo de estructura conceptual para una esquina
   inferior derecha con mordida circular de radio R sobre un
   contenedor de ancho W y alto H:

```css
.customer-class-photo {
  clip-path: path('M0,0 L{W},0 L{W},{H-R} A{R},{R} 0 0,1 {W-R},{H} L0,{H} Z');
}
```

   (Sustituir `{W}`, `{H}`, `{R}` por los valores reales del
   contenedor en px, o usar una función que los calcule si el tamaño es
   responsive — si es responsive, puede ser más simple usar un SVG
   como mask con `<clipPath>` definido en `viewBox` con unidades
   relativas al 100%/100% del contenedor, en vez de intentar calcular
   px exactos en CSS puro.)

7. **Antes de reportar como resuelto**: hacer zoom en DevTools o en el
   screenshot directamente sobre la esquina inferior derecha de la
   foto y confirmar a simple vista que hay una curva cóncava real —
   no un placeholder rectangular sin cortar.

---

## 2. Amarillo — sigue reluciente, bajar más

El cambio de `#FFC400` a `#E3A93D` no fue suficiente — sigue viéndose
brillante/reluciente en pantalla. Dos posibilidades a revisar:

1. **El nuevo valor no se está aplicando realmente** — mismo problema
   de raíz que el punto 1: verificar en DevTools (Computed styles) el
   color real que tiene el botón "Explorar productos" en el navegador,
   no confiar en que el archivo fuente tenga `#E3A93D` sin confirmarlo
   renderizado. Revisar si hay algún otro CSS (ej. una clase Tailwind
   con `!important`, un estilo inline, o una clase de utilidad
   compartida) que esté sobrescribiendo el color.
2. **Si el color SÍ se está aplicando y aun así se ve reluciente**, el
   problema no es el hue sino el brillo/saturación — bajar más
   agresivamente. Probar con un dorado más apagado, por ejemplo en el
   rango de `#C9942E` a `#B8862A` (más terroso, menos "oro brillante"),
   y también revisar si hay algún `box-shadow` con glow/brillo o un
   gradiente de brillo (`linear-gradient` tipo highlight) aplicado
   sobre el botón que esté generando el efecto "reluciente" además del
   color base — a veces el brillo no es el color plano sino un overlay
   de luz encima.

Aplicar el cambio SOLO en los elementos de Customer Class / catálogo,
sin tocar el botón "Reclutamiento" del navbar (que usa su propio
`#FFD21A` en `RecruitmentPopover.tsx` — no tocar ese archivo).

---

## Checklist final — verificar cada paso, no saltarlo
- [ ] Captura con zoom de la esquina inferior derecha de la foto,
      mostrando la curva cóncava claramente (comparar lado a lado con
      la imagen de referencia ya compartida antes).
- [ ] Confirmar en DevTools → Computed que el clip-path/mask
      efectivamente aparece aplicado al elemento correcto en el
      navegador real (no solo en el archivo fuente).
- [ ] Captura del botón "Explorar productos" con el nuevo amarillo,
      tomada en las mismas condiciones de luz/zoom que las capturas
      anteriores para poder comparar el antes/después directamente.
- [ ] Confirmar en DevTools que el botón Reclutamiento del navbar sigue
      con `#FFD21A` sin cambios.
