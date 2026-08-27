# Diagnóstico: jerarquía real de categorías — ¿existe "Embutidos"?

## Pregunta a responder
En el catálogo, dentro de la familia "Alimentos", aparecen "Salchichas" y
"Tocinetas" como categorías separadas al mismo nivel que otras (Helados,
Yogurt, etc.), en vez de aparecer agrupadas bajo una categoría padre tipo
"Embutidos". Isaac espera que deberían estar bajo "Embutidos".

Necesitamos confirmar: ¿existe "Embutidos" como categoría/sub-categoría
en la jerarquía que devuelve la MercasaVIP API (`HE_GetInventoryItemsFMCM`
o el endpoint que se esté usando para traer la estructura)? Y si existe,
¿por qué "Salchichas"/"Tocinetas" no quedaron anidados ahí?

## Esto es un diagnóstico de DATOS, no un bug de código a priori
El sitio simplemente refleja la jerarquía tal cual la entrega la API — no
hay lógica propia de agrupamiento en el código que pueda estar "rompiendo"
la jerarquía. Antes de tocar nada, confirmar qué trae la fuente real.

## Pasos

1. Escribir un script puntual (o usar uno de los ya existentes en
   `scripts/diagnostics/` como referencia) que llame a la MercasaVIP API
   y traiga la jerarquía COMPLETA de la familia "Alimentos" — todos los
   niveles: Familia → Sub-familia → Categoría → Sub-categoría (si aplica
   un cuarto nivel).

2. Buscar en esa respuesta si existe algo llamado "Embutidos" en
   cualquier nivel (Sub-familia o Categoría).

3. Buscar específicamente los productos que hoy aparecen bajo "Salchichas"
   y "Tocinetas" (ej. "LA GRANJA SALCHICHA HOT DOG 325G", "LA GRANJA
   TOCINETA AHUMADA 250G") y confirmar exactamente qué valores trae la
   API para su Familia/Sub-familia/Categoría/Sub-categoría — tal cual,
   sin interpretar.

4. Con esos datos, reportar:
   - Si "Embutidos" SÍ existe en la jerarquía de la API pero como una
     categoría distinta que no incluye estos productos → es una decisión
     de cómo está catalogado en el ERP, hay que preguntarle a
     Luis/Mercasa si eso está bien así o si es un error de catalogación
     de esos productos específicos en el sistema de origen.
   - Si "Embutidos" NO existe en absoluto en la jerarquía de la API →
     confirma que "Salchichas" y "Tocinetas" son categorías de primer
     nivel tal cual las definió Mercasa en su sistema, no hay nada que
     "arreglar" del lado del sitio — el sitio está reflejando la data
     correctamente, aunque no coincida con la intuición de cómo debería
     agruparse.

## No aplicar ningún cambio de código
Este documento es solo para traer la evidencia de qué dice la fuente de
datos real. Una vez que se sepa si el problema está en el ERP/catalogación
de Mercasa (fuera del alcance del sitio web) o si hay algo raro en cómo el
sitio está leyendo/mapeando la jerarquía, se decide el siguiente paso.
