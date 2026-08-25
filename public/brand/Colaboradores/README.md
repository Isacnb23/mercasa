# Fotos de "Nuestros Colaboradores"

Poné acá las 8 fotos reales de stock con estos nombres exactos (el mosaico
en `components/CollaboratorsSection.tsx` ya apunta a estas rutas, vía el
array `collaboratorPhotos` en `lib/data.ts`):

- foto-01.jpg
- foto-02.jpg
- foto-03.jpg
- foto-04.jpg
- foto-05.jpg
- foto-06.jpg
- foto-07.jpg
- foto-08.jpg

Mientras estos archivos no existan, cada celda del mosaico muestra un
ícono genérico sobre fondo gris claro — no rompe la página.

Si cambiás la cantidad de fotos o los nombres, actualizá el array
`collaboratorPhotos` en `lib/data.ts` (cada foto tiene un `size`:
`"large" | "wide" | "tall" | "normal"`, que controla cuánto espacio ocupa
en el grid mosaico).
