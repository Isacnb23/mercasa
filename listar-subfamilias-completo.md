# Extraer lista completa de Familia → Sub-familia (con conteos)

## Objetivo
Necesitamos la lista COMPLETA y exacta de todas las sub-familias que
existen dentro de cada una de las 5 familias (Alimentos, Cuidado del
Hogar, Bebidas, Cuidado Personal, Electrónica), tal cual las devuelve la
MercasaVIP API — para planificar cuántas imágenes divisoras hay que
generar y con qué nombre exacto de sub-familia en cada una.

## Pasos
1. Reusar la lógica/conexión que ya se usa en otros scripts de
   diagnóstico (`scripts/diagnostics/`) para traer la jerarquía completa
   de productos desde la MercasaVIP API.
2. Agrupar por Familia → Sub-familia, contando cuántos productos distintos
   tiene cada sub-familia.
3. Generar una salida simple y fácil de leer/copiar — puede ser:
   - Un archivo `.md` o `.txt` en `scripts/diagnostics/output/` con una
     lista tipo:
     ```
     ALIMENTOS (410 productos)
       - Lácteos y Sucedáneos (131)
       - Confitería y Snacks (70)
       - Panadería Repostería y galletas (50)
       - Enlatados (45)
       - Embutidos (35)
       - ...
     
     CUIDADO DEL HOGAR (240 productos)
       - ...
     ```
   - O simplemente imprimirlo bien formateado en la consola si es más
     rápido que generar un archivo — lo que sea más práctico.
4. No hace falta CSV ni Excel esta vez, es solo para leer y decidir, así
   que texto plano legible alcanza.

## Resultado esperado
Reportame en el chat la lista completa (las 5 familias con TODAS sus
sub-familias y conteos) — empezando idealmente por Alimentos, que es la
que se va a trabajar primero para las imágenes.

## No tocar
- Ningún archivo de código de producción — esto es solo un script de
  consulta/reporte, igual que los diagnósticos anteriores.
