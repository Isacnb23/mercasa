# Fix: salto automático al abrir (initialCategoryId) tiene la misma condición de carrera

## Contexto
El fix anterior (`fix-portada-duplicada-confirmado.md`) encontró y
corrigió correctamente la causa raíz: `react-pageflip` tarda en montar
todas las páginas, y cualquier llamada a `.flip()` antes de que
`pageFlip()` exista se pierde en silencio. Se agregó `isBookReady`
(enganchado al evento `onInit`) y se deshabilitaron el `<select>` "Ir a
categoría" y las flechas hasta que el libro está listo.

PERO: el mismo problema sigue pasando al ABRIR el modal directamente con
una categoría/familia específica (vía `initialCategoryId`, usado por el
botón "Revista" de cada familia y por "Explorá el catálogo completo").
Isaac confirma: "tiene el mismo bug, entro al catálogo, la portada se ve
extendida y luego solo se pone en la página 5, y así en todos" — pasa
siempre, en cada apertura.

## Causa (misma raíz, disparador distinto)
El salto automático a la página correspondiente a `initialCategoryId`
probablemente se dispara en un `useEffect` que corre apenas el componente
se monta (o apenas cambia `initialCategoryId`/`isOpen`), llamando a
`bookRef.current.pageFlip().flip(targetIndex)` — pero en ESE momento
`react-pageflip` todavía no terminó de montar las 116 páginas, entonces
esa llamada también se pierde en silencio (o se ejecuta a medias,
produciendo el efecto visual raro de "portada extendida" que describe
Isaac — probablemente un flip a medio animar que queda en un estado
intermedio inconsistente).

## Fix
El `useEffect` que dispara el salto automático a `initialCategoryId` debe
esperar la MISMA señal `isBookReady` (del evento `onInit`) que ya se usa
para habilitar el dropdown y las flechas — no debe intentar hacer
`.flip()` hasta que `isBookReady === true`.

### Implementación sugerida
```tsx
useEffect(() => {
  if (!isBookReady) return; // esperar a que react-pageflip termine de montar
  if (initialCategoryId == null) return; // no hay categoría específica, se queda en portada

  const targetIndex = calcularIndicePagina(initialCategoryId); // la función que ya existe
  bookRef.current?.pageFlip().flip(targetIndex);
}, [isBookReady, initialCategoryId]);
```

Puntos importantes:
- El efecto debe depender de `isBookReady` en su array de dependencias,
  para que se vuelva a evaluar/ejecutar en el momento exacto en que
  `isBookReady` pasa a `true` (no alcanza con solo chequear la condición
  una vez al montar, si en ese momento `isBookReady` todavía era `false`).
- Si `initialCategoryId` puede llegar como `null`/`undefined` (apertura
  general, "Explorá el catálogo completo" → debe quedarse en portada, NO
  saltar a ningún lado), confirmar que el efecto no intente hacer flip
  en ese caso — la portada por defecto (página 1) ya es donde arranca
  `react-pageflip` de por sí, no hace falta forzar nada si no hay
  categoría específica.

## Verificación — reproducir EXACTAMENTE lo que reportó Isaac
1. Desde la home, click en "Revista" de la familia Alimentos (o cualquier
   botón que abra con `initialCategoryId`).
2. Confirmar que el modal abre y, SIN mostrar ningún parpadeo de portada
   extendida ni aterrizar en una página rara, va directo a la página
   correcta de esa categoría/familia.
3. Repetir con "Explorá el catálogo completo" — debe abrir en portada
   (página 1) limpiamente, sin el glitch visual.
4. Repetir varias veces seguidas (abrir, cerrar, abrir de nuevo) para
   confirmar que es consistente, no intermitente.
5. Confirmar que el fix anterior (dropdown/flechas deshabilitadas hasta
   `isBookReady`) sigue funcionando igual — no se debe romper por este
   cambio.
6. Si hay Chrome MCP disponible, verificar interactuando de verdad varias
   veces seguidas — el bug es descrito como que pasa "en todos", así que
   una sola prueba exitosa no alcanza para confirmar el fix, probar al
   menos 3-4 aperturas distintas.
