# Ajuste: contenido cortado en bordes al scrollear + botón Revista en el sidebar

## 1. El contenido se corta arriba y abajo del cuadro al scrollear
Al scrollear el panel de categorías, el contenido queda pegado/cortado
justo en el borde superior e inferior del cuadro (se ve en la captura:
el header "Alimentos +410 productos" queda a mitad cortado arriba, y la
última categoría visible queda cortada abajo, sin aire antes del borde
del cuadro).

Agregar padding vertical arriba y abajo del contenido scrolleable del
panel de categorías (no solo el padding lateral que ya se agregó en el
fix anterior):

```css
.category-panel-inner {
  padding: 20px 28px; /* antes solo tenía padding lateral, agregar vertical */
}
```

Si el padding vertical ya existe pero es insuficiente, aumentarlo. La
idea es que al hacer scroll hasta arriba del todo, el primer elemento
(header de familia) tenga aire arriba antes del borde del cuadro — y al
scrollear hasta el final, el último elemento tenga aire abajo antes del
borde inferior del cuadro. Ahora mismo se ve como que el contenido
"empieza"/"termina" exactamente en el borde, sin margen de respiro.

## 2. Botón "Revista" también en el sidebar de familias
Ahora mismo el botón "Revista" solo aparece en el header del panel de
categorías (columna derecha), junto al nombre de la familia activa.
Isaac quiere que TAMBIÉN aparezca junto a cada familia en el sidebar
(columna izquierda), no solo arriba del panel derecho — así se puede
abrir la revista de una familia directamente desde el sidebar, sin
necesidad de tenerla seleccionada/activa primero.

### Implementación
- Cada fila de familia en el sidebar (ícono + nombre + conteo) debe tener
  también un botón/ícono de "Revista" (puede ser un ícono más compacto
  que el botón completo del panel derecho, dado que el sidebar es angosto
  — considerar un ícono de libro solo, con tooltip "Ver revista", si el
  botón completo con texto no cabe bien en el ancho del sidebar).
- Ese botón debe funcionar independientemente de si la familia está
  seleccionada/activa o no — un click ahí abre `ProductCatalogModal`
  directo en esa familia (reusar `initialCategoryId` con la primera
  categoría de esa familia, igual que ya se usa en el botón del panel
  derecho), SIN necesidad de que el usuario primero seleccione la familia
  en el sidebar.
- Cuidado con que el click en el botón de Revista no dispare también la
  selección de la familia en el sidebar (si el botón está dentro del área
  clickeable de la fila completa) — usar `event.stopPropagation()` en el
  click del botón de Revista para que sean dos acciones independientes:
  click en la fila = seleccionar familia (cambia el panel derecho), click
  en el botón Revista = abre el modal directo, sin cambiar la selección
  necesariamente (aunque tampoco es grave si además selecciona la
  familia, lo importante es que abra la revista correctamente).
- Mantener el botón "Revista" que ya existe en el header del panel
  derecho también — no se elimina, se agrega el del sidebar como acceso
  adicional.

## Verificación
- Scrollear el panel de categorías de arriba a abajo — confirmar que ni
  el primer ni el último elemento quedan pegados/cortados en los bordes
  del cuadro.
- Click en el botón Revista de una familia en el sidebar SIN haberla
  seleccionado antes — confirmar que abre el modal en la familia
  correcta.
- Confirmar que el sidebar se sigue viendo ordenado con el botón agregado
  (no se rompe el layout angosto de esa columna) — en mobile especialmente,
  si el sidebar se apila diferente, confirmar que el botón de Revista
  sigue siendo usable ahí también.
