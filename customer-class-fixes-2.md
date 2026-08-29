# Fix: corte circular sigue sin verse + amarillo muy chillón

## Contexto
Del prompt anterior (`customer-class-fixes.md`), 3 de los 4 puntos
quedaron bien (renombrado a Sector Público, azul con profundidad, CTA
de scroll a Contacto). El corte circular de la foto en el panel de
Customer Class se reportó como "verificado en navegador" pero en la
captura real la esquina inferior derecha de la foto se ve exactamente
igual que antes — un redondeo normal chico, sin ninguna mordida cóncava
visible. Este es el mismo problema que ya había pasado una vez antes
con este mismo elemento.

NO reportar esto como resuelto solo porque el valor en el código diga
"160px" o similar — hay que confirmar que el efecto realmente se
renderiza distinto a un `border-radius` normal.

---

## 1. Corte circular de la foto — diagnóstico y fix real

Pasos a seguir, en orden:

1. Localizar el componente exacto donde se renderiza la foto del panel
   de Customer Class (la imagen a la izquierda, ej.
   `panaderías.png`, `comercio-local-pulperías.png`, etc.) y revisar
   el CSS/clases que se le están aplicando actualmente para el corte de
   esquina.
2. Confirmar si se está usando `clip-path` (ej. con un `circle()` o
   `path()`) o si en realidad se quedó solo con `border-radius`. Si es
   `border-radius`, ESE es el bug: un `border-radius`, sin importar el
   valor en px, solo puede redondear la esquina hacia afuera (convexo),
   nunca puede generar una mordida cóncava. Hace falta sí o sí un
   `clip-path` (o SVG mask) para lograr el efecto de "cuarto de luna".
3. Si ya hay un `clip-path` con un valor de círculo pero no se nota:
   revisar que el círculo esté posicionado realmente sobre la esquina
   visible de la imagen y no fuera del viewport/contenedor por un
   problema de unidades (%, px) o de `overflow: hidden` en un
   contenedor padre que esté recortando el efecto antes de que se vea.
4. Implementación recomendada con `clip-path` (ejemplo de referencia,
   ajustar selectores/tamaños al componente real):

```css
.customer-class-photo {
  /* Esquina inferior derecha con mordida circular cóncava */
  clip-path: path('M 0,0 H calc(100% - 0px) V calc(100% - 100px)
    A 100px 100px 0 0 1 calc(100% - 100px) 100%
    ... (ajustar según dimensiones reales del contenedor) H 0 Z');
}
```

   Si el componente ya usa un enfoque con SVG (mask con un `<circle>`
   restado del rectángulo vía `mask-type: alpha` o similar), verificar
   que el `<circle>` esté efectivamente sustraído (operación de resta,
   no de unión) y que su radio sea grande — el problema puede ser que
   el círculo sea muy chico o esté mal posicionado, no que falte el
   mecanismo.
5. El radio debe ser grande — visualmente debe notarse una mordida de
   al menos 15-20% del ancho/alto de la esquina de la foto (no 3-5%).
   Referencia visual: imaginar que un círculo grande, centrado fuera de
   la esquina inferior derecha de la imagen, se superpone y "come" esa
   esquina — el área mordida debe dejar ver el fondo navy del panel
   detrás.
6. Después de aplicar el fix: tomar captura real en navegador (no dar
   por bueno el código solo porque compile o porque el valor en px
   parezca razonable), comparar contra la imagen de referencia que ya
   se compartió antes, y confirmar que el cambio es CLARAMENTE visible
   a simple vista antes de reportarlo como resuelto.

---

## 2. Amarillo muy chillón — bajar intensidad

El amarillo usado en el botón "Explorar productos" (y cualquier otro
lugar donde se use ese mismo tono, EXCEPTO el botón "Reclutamiento" del
navbar — ese se queda exactamente como está, no tocarlo) se ve muy
saturado/chillón.

- Localizar la variable de color o clase Tailwind que define ese
  amarillo específico usado en "Explorar productos" y en los demás
  usos relacionados a Customer Class / catálogo (revisar si es la
  misma variable que usa el navbar de Reclutamiento — si es la MISMA
  variable compartida, hay que crear una variante nueva y separada para
  no afectar el botón de Reclutamiento).
- Bajarle saturación y/o oscurecer levemente el tono (ej. de un amarillo
  puro/vibrante a un dorado/mostaza más suave, manteniendo buen
  contraste con el texto navy que lleva encima).
- Aplicar el nuevo tono solo a los elementos amarillos de la sección
  Customer Class y catálogo (botón "Explorar productos", labels tipo
  "PANADERÍAS"/"COMERCIO LOCAL / PULPERÍAS", "CATEGORÍAS DISPONIBLES",
  etc. si comparten la misma variable).
- Confirmar con captura que el botón "Reclutamiento" del navbar quedó
  exactamente igual (no se movió/cambió sin querer por compartir
  variable).

---

## Checklist final
- [ ] Captura real mostrando la mordida circular claramente visible en
      la foto del panel de Customer Class (comparar contra la
      referencia ya compartida).
- [ ] Captura real del nuevo tono de amarillo en "Explorar productos" y
      demás elementos relacionados.
- [ ] Captura confirmando que el botón "Reclutamiento" del navbar NO
      cambió.
