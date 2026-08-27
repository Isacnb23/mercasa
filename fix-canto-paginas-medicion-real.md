# Fix: franjas de canto pegadas al contenedor, no al libro real

## Problema (visto en captura, con animación de flip en curso)
Las franjas de `.page-stack` están pegadas al borde de `.flipbook-container`,
pero ese contenedor tiene espacio extra (padding, centrado responsive, o
márgenes automáticos) que hace que el libro RENDERIZADO sea más angosto
que el contenedor. Resultado: las franjas quedan separadas del libro real
por una franja de espacio en blanco invisible — se ven "flotando lejos"
en el borde de la pantalla en vez de pegadas a las hojas.

## Causa raíz a confirmar
`react-pageflip` renderiza el `HTMLFlipBook` con un tamaño específico
(según las props `width`/`height`/`size`), pero el `<div>` que lo
contiene (`.flipbook-container`) puede ser más ancho — por ejemplo si
tiene `width: 100%` y el libro adentro está centrado con
`margin: 0 auto` o `justify-content: center`, dejando espacio visible a
los lados que hoy es invisible (blanco sobre blanco) pero que empuja la
franja lejos del borde real del libro.

## Objetivo
En vez de asumir que el borde del contenedor coincide con el borde del
libro, medir el ancho REAL del elemento renderizado por `HTMLFlipBook` y
pegar las franjas exactamente ahí — o, más simple y robusto, eliminar
cualquier padding/centrado extra en `.flipbook-container` para que su
borde SÍ coincida con el borde del libro (esta opción es preferible si es
viable, porque evita tener que medir dinámicamente).

### Opción A (preferida si es simple): eliminar el espacio invisible
1. Inspeccionar `.flipbook-container` en el navegador con DevTools —
   comparar el ancho del contenedor vs. el ancho real del elemento que
   pinta `react-pageflip` (suele ser un `<div>` con clase `stf__parentWrapper`
   o similar, propia de la librería).
2. Si hay `padding`, `margin: 0 auto` con un `max-width` menor al 100%
   del contenedor, o `justify-content: center` en un flex más ancho que
   el libro, quitar ese espacio extra — que `.flipbook-container` tenga
   EXACTAMENTE el ancho del libro, ni un pixel más.
3. Con eso, el fix anterior (franjas como hermanas de `.flipbook-container`,
   pegadas sin gap) debería funcionar sin necesitar medición dinámica.

### Opción B (si A no es viable por cómo está armado el layout): medir y posicionar dinámicamente
Si el libro necesita centrarse dentro de un contenedor más ancho (por
responsive, por ejemplo), entonces:

1. Usar un `ref` sobre el elemento raíz que pinta `react-pageflip`
   (buscar la clase que usa la librería para su wrapper, algo como
   `.stf__parentWrapper` o el nodo que retorna el `HTMLFlipBook`).
2. Con `useEffect` + `ResizeObserver` (para que se recalcule si cambia el
   tamaño de ventana), medir `getBoundingClientRect()` de ese elemento y
   guardar su `left`/`right`/`width` real en estado.
3. Posicionar `.page-stack-left` y `.page-stack-right` con `position:
   absolute` (dentro de un `.catalog-shell` con `position: relative`),
   usando esos valores medidos en vez de depender del flujo normal de
   flexbox — así quedan pegadas al libro real sin importar cuánto espacio
   extra tenga el contenedor alrededor.

```tsx
const bookRef = useRef<HTMLDivElement>(null);
const [bookRect, setBookRect] = useState<{ left: number; right: number } | null>(null);

useEffect(() => {
  if (!bookRef.current) return;
  const observer = new ResizeObserver(() => {
    const rect = bookRef.current!.getBoundingClientRect();
    const parentRect = bookRef.current!.parentElement!.getBoundingClientRect();
    setBookRect({
      left: rect.left - parentRect.left,
      right: parentRect.right - rect.right,
    });
  });
  observer.observe(bookRef.current);
  return () => observer.disconnect();
}, []);
```

Preferir Opción A si el layout lo permite — es más simple y no depende de
mediciones en tiempo real que puedan parpadear durante resize.

## Nota sobre la animación de flip
En la captura que mandó Isaac se ve el libro a mitad de una animación de
doblez de página (la esquina curvándose) — eso es normal, es la animación
de `react-pageflip` funcionando, no está relacionado al bug de las
franjas. Ignorar el estado de curva/doblez al hacer este fix; las franjas
deben quedar ancladas al ancho ESTÁTICO del libro (el spread completo de
dos páginas), no seguir el doblez de la animación.

## Verificación OBLIGATORIA con Chrome MCP (ya está conectado, úsalo)
1. Levantar `npm run dev`, abrir el catálogo en una categoría con varias
   páginas.
2. Screenshot en la portada (página 1) — confirmar que las franjas tocan
   el borde real del libro, sin espacio blanco entre ellas y las hojas.
3. Screenshot a mitad de un flip (página en movimiento, como en la
   captura de Isaac) — confirmar que las franjas NO se mueven con la
   animación (deben quedarse fijas al ancho del spread completo, no
   seguir la hoja que se dobla).
4. Zoom/crop en ambos bordes para confirmar pixel a pixel que no hay gap,
   igual que se hizo en la verificación anterior.
5. Redimensionar la ventana del navegador (si es posible con la
   herramienta) para confirmar que el ajuste se sostiene en distintos
   anchos, no solo en el tamaño de prueba actual.

## No tocar
- Header, footer, backdrop, cálculo de `leftStackWidth`/`rightStackWidth`
  (esos valores están bien, el problema es la POSICIÓN, no el ancho),
  animación de apertura, ni la lógica del flipbook.
