# Fix confirmado: portada duplicada + apertura en página incorrecta

## Evidencia (con capturas de Isaac, reproducible siempre)
Al abrir el catálogo con "Ir a categoría: Helados" (o con el botón
"Revista" de una familia — pasa en ambos casos, "en todos" según Isaac):

1. El libro NO abre directo en la categoría/portada esperada.
2. En la "Página 4 de 116" se ve un spread raro: el lado izquierdo muestra
   el divisor de sub-familia "Lácteos y Sucedáneos" (con foto, "131
   productos"), y el lado derecho YA muestra la grilla de productos de
   "Helados" (1/6) — es decir, dos páginas de contenido distinto
   conviviendo en el mismo spread de forma que no tiene sentido en la
   secuencia esperada del libro.
3. Avanzando a "Página 5 de 116", aparece la PORTADA (logo Mercasa, foto
   de warehouse, título "Catálogo de Productos", tabs de familias) pero
   mal renderizada — ocupando las DOS mitades del spread como una sola
   pieza estirada, en vez de ser una página única de portada al principio
   del libro. La portada NO debería aparecer de nuevo en la página 5 — 
   solo debería existir UNA VEZ, en la página 1.

Esto confirma que sí hay un bug real (el diagnóstico anterior no logró
reproducirlo, pero con estos pasos exactos sí se reproduce).

## Hipótesis a investigar
1. **La portada está duplicada en el array de páginas** (`bookPages` o
   como se llame la estructura que arma las páginas del `HTMLFlipBook`).
   Revisar el código que construye ese array — es posible que el
   componente de portada se esté agregando más de una vez (ej. una vez al
   inicio fijo, y otra vez accidentalmente dentro de un `.map()` que
   itera familias/categorías y por error reinyecta el componente de
   portada en vez del componente de divisor correspondiente).

2. **El cálculo de índice de página para `initialCategoryId` está mal**
   (esto se agregó en un fix anterior para que "Ir a categoría" y
   "Revista" salten directo a la página correcta). Revisar la función que
   traduce categoría → índice de página — puede estar sin contar bien
   cuántas páginas ocupan la portada + los divisores antes de llegar a
   las categorías, dando un índice desfasado que cae en medio de
   contenido que no corresponde.

3. Estas dos cosas pueden estar relacionadas: si el array de páginas
   tiene la portada duplicada de verdad, CUALQUIER cálculo de índice que
   asuma un array "limpio" va a estar corrido/desfasado a partir de donde
   está la duplicación — arreglar el problema 1 puede resolver el 2
   automáticamente, o revelar que el 2 es un bug aparte.

## Pasos de diagnóstico y fix
1. Loguear (temporalmente, con `console.log`) la longitud total del array
   de páginas y los primeros 10 elementos (su tipo/nombre identificable —
   "portada", "divisor-lacteos", "categoria-helados", etc.) para ver el
   orden real tal cual se está construyendo.
2. Confirmar visualmente/en el log si la portada aparece más de una vez
   en ese array.
3. Si está duplicada, encontrar dónde se agrega de más y corregir la
   lógica de construcción para que la portada exista UNA sola vez, al
   índice 0.
4. Una vez que el array esté limpio (sin duplicados), volver a probar el
   cálculo de `initialCategoryId` → índice de página, y confirmar que
   ahora sí aterriza en la página correcta.
5. Quitar los `console.log` de diagnóstico antes de terminar.

## Verificación OBLIGATORIA — reproducir EXACTAMENTE los pasos de Isaac
1. Abrir el catálogo con el selector "Ir a categoría" eligiendo "Helados"
   (desde fuera del modal, o desde el dropdown ya adentro — probar ambos
   puntos de entrada si aplica).
2. Confirmar que abre DIRECTO en la página de la categoría "Helados", sin
   pasar por ningún divisor ni mostrar la portada de nuevo.
3. Cerrar, y probar con el botón "Revista" de la familia "Alimentos" —
   confirmar que abre en la página correcta para esa familia (la portada
   o el primer divisor, según corresponda), sin duplicados.
4. Navegar manualmente por varias páginas del libro completo (usando las
   flechas) y confirmar que la portada aparece UNA SOLA VEZ, en la
   página 1, en todo el recorrido de las 116 páginas.
5. Si hay Chrome MCP disponible, hacerlo interactuando de verdad en el
   navegador — este bug ya se había reportado como "no reproducible" una
   vez, así que hay que seguir los pasos exactos de arriba, no una
   variante genérica.
