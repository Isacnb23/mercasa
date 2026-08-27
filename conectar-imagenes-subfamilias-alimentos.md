# Conectar imágenes divisoras de sub-familia — Familia Alimentos

## Contexto
Ya se agregaron 17 imágenes en `public/Catalogo/Alimentos/`, una por cada
sub-familia de Alimentos, con estos nombres exactos:

```
lacteos-y-sucedaneos.png
confiteria-y-snacks.png
panaderia-reposteria-galletas.png
enlatados.png
pastas-salsas-sopas.png
granos.png
grasas-y-aceites.png
congelados.png
embutidos.png
carnes.png
azucar.png
baking.png
cereales.png
alimentos-infantiles.png
condimentos-y-especias.png
tortillas.png
mermelada-y-spread.png
```

## Objetivo
En `ProductCatalogModal.tsx` (o donde esté la lógica que arma las páginas
divisoras de sub-familia — las páginas tipo "Lácteos y Sucedáneos, 131
productos" que ya vimos en capturas anteriores), reemplazar la imagen de
fondo genérica/placeholder de CADA divisor de sub-familia de Alimentos
por la imagen correspondiente de esta lista, usando el path
`/Catalogo/Alimentos/[nombre-archivo].png`.

## Cómo mapear cada sub-familia a su imagen
El nombre de archivo ya coincide (en formato slug) con el nombre de la
sub-familia tal cual sale de la API:

| Sub-familia (como la trae la API) | Archivo |
|---|---|
| Lácteos y Sucedáneos | lacteos-y-sucedaneos.png |
| Confitería y Snacks | confiteria-y-snacks.png |
| Panadería Repostería y galletas | panaderia-reposteria-galletas.png |
| Enlatados | enlatados.png |
| Pastas Salsas y Sopas | pastas-salsas-sopas.png |
| Granos | granos.png |
| Grasas y Aceites | grasas-y-aceites.png |
| Congelados | congelados.png |
| Embutidos | embutidos.png |
| Carnes | carnes.png |
| Azúcar | azucar.png |
| Baking | baking.png |
| Cereales | cereales.png |
| Alimentos Infantiles | alimentos-infantiles.png |
| Condimentos y especias | condimentos-y-especias.png |
| Tortillas | tortillas.png |
| Mermelada y Spread | mermelada-y-spread.png |

Si el código arma estas páginas dinámicamente iterando sobre las
sub-familias que trae la API (en vez de tenerlas hardcodeadas una por
una), lo ideal es crear una función/mapa de normalización que convierta
el nombre de sub-familia a su slug de archivo (quitar tildes, espacios a
guiones, minúsculas) y así conectar automáticamente cualquier sub-familia
de Alimentos con su imagen — más mantenible que hardcodear 17 casos.

```ts
function subFamilyToImageSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
// "Lácteos y Sucedáneos" -> "lacteos-y-sucedaneos"
// "Panadería Repostería y galletas" -> "panaderia-reposteria-y-galletas" 
//   (OJO: esto da "...-y-galletas" con guión antes de "galletas", pero 
//    el archivo real es "panaderia-reposteria-galletas.png" sin el "y-" 
//    ahí — confirmar este caso puntual y ajustar el mapeo o renombrar 
//    el archivo para que coincida exactamente con el slug generado)
```

Ojo con el caso de "Panadería Repostería y galletas" y "Pastas Salsas y
Sopas" — sus nombres de archivo actuales quitaron la "y" de en medio para
que el slug fuera más corto, así que si programás la conversión
automática de nombre→slug, esos dos van a generar un slug distinto al
nombre del archivo real. Más simple: usar un mapa explícito
(diccionario) de sub-familia → nombre de archivo para estas 17, en vez de
una función de normalización automática — es menos elegante pero evita
este tipo de desajuste.

## Fallback
Para las sub-familias de las OTRAS 4 familias (Cuidado del Hogar,
Bebidas, Cuidado Personal, Electrónica) que todavía no tienen imagen
propia, mantener la imagen genérica/placeholder que se esté usando
actualmente — no romper esas páginas, solo reemplazar las de Alimentos.

## Verificación
- Navegar el catálogo por Alimentos, confirmar visualmente que cada una
  de las 17 páginas divisoras de sub-familia muestra su imagen
  correspondiente (no la genérica, no una de otra sub-familia).
- Confirmar que las demás familias (sin imágenes propias todavía) siguen
  mostrando el placeholder sin romperse.
- Si hay Chrome MCP disponible, recorrer varias páginas divisoras y
  confirmar visualmente antes de dar por terminado.
