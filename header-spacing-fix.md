# Fix: espacio entre header/navbar y contenido de cada sección

## Contexto
El header es sticky/flotante sobre todas las secciones. En varias
secciones el contenido (título, texto) arranca demasiado pegado al
navbar cuando se navega directo a esa sección o al hacer scroll —
se ve apretado, sin aire. Ejemplo visible ahora mismo: la sección de
Productos ("Todo lo que tu negocio necesita"), el título arranca casi
tocando el navbar.

El proyecto ya tiene un sistema de `scroll-margin-top` y `padding-top`
por sección (ver historial: se ajustó antes para que el header no tape
el título al navegar por el menú, y para que no se vea la sección
anterior asomando detrás). Este fix es sobre el ESPACIO VISUAL/AIRE
entre el navbar y el contenido, no sobre el bug de que el header tape
el título — son cosas relacionadas pero distintas. Puede que haya que
tocar ambos valores (`scroll-margin-top` y el `padding-top`/margin
superior real del contenido) para lograr el resultado correcto.

Es aceptable que las secciones se hagan más largas/altas si hace falta
para lograr un espaciado que se vea bien — no hay que comprimir el
contenido existente para compensar.

---

## Alcance — revisar y ajustar en TODAS las secciones
- `AboutSection`
- `BrandsSection`
- `CollaboratorsSection`
- `ContactSection`
- `LogisticsTimeline`
- `ProductsSection` (la de la captura, título pegado al navbar)
- `CustomerClassSection` (la sección nueva)
- Cualquier otra sección visible en el home que tenga el mismo problema

Para cada una:
1. Ir a esa sección directo (click en el menú de navegación, no solo
   scroll manual) y revisar en navegador cuánto aire queda entre el
   borde inferior del navbar y el primer elemento de contenido
   (eyebrow/título).
2. Aumentar el `padding-top` (o `margin-top` según cómo esté
   estructurado cada componente) del contenido interno de la sección
   para dar más aire — no un espacio exagerado, pero sí que el título
   no se sienta pegado al navbar. Buscar consistencia: todas las
   secciones deberían tener una sensación de espaciado similar entre
   sí, no que unas queden con mucho aire y otras casi nada.
3. Si se aumenta el padding/margin superior, revisar que el
   `scroll-margin-top` de esa sección siga siendo coherente (que al
   hacer click en el menú, el scroll pare en un punto donde el título
   ya se vea completo y con buen aire, ni tapado por el navbar ni con
   espacio de más raro antes del título).
4. Confirmar que `min-height: 100dvh` (o el valor que tenga cada
   sección) sigue siendo suficiente para que no se vea la sección
   siguiente asomando abajo — si el padding-top nuevo empuja el
   contenido y la sección queda muy justa de alto, ajustar el
   min-height también.

---

## Verificación
Probar navegando por el menú a cada una de las secciones listadas
(no solo scrolleando con el mouse) y tomar captura de cada una
confirmando:
- [ ] Buen aire entre navbar y título/contenido — ni pegado, ni
      exagerado.
- [ ] El header nunca tapa el título.
- [ ] No se asoma la sección anterior detrás del header.
- [ ] Espaciado consistente entre las distintas secciones (no que una
      quede con mucho más aire que otra sin razón).
