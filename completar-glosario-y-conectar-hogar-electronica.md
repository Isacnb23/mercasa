# Completar glosario + conectar imágenes de dos familias

## Parte 1 — Completar el glosario de abreviaturas
Isaac confirmó las siguientes definiciones (agregar al mismo diccionario
usado para U/P, P/C, C/T en `messages/es.json`/`en.json`):

- **U/C** = Unidades por Caja
- **UND/CAJA** = Unidades por Caja (variante de formato de U/C, mismo significado)
- **B/T** = Bultos por Tarima
- **P/B** = Paquetes por Bulto
- **U/B** = Unidades por Bulto
- **R/C** = Rollos por Caja
- **D/C** = Displays por Caja
- **DISPL/CAJA** = Displays por Caja (variante de formato de D/C, mismo significado)

No agregar `UND/CM` todavía — quedó sin confirmar qué significa "CM",
dejarlo pendiente.

Los ~30 patrones restantes con 1-20 apariciones cada uno (variantes de
formato de estos mismos conceptos) NO hace falta agregarlos todos
individualmente al glosario visible — con las variantes principales ya
confirmadas alcanza para que el cliente entienda el patrón general. Si
alguno de esos patrones minoritarios usa una abreviatura distinta a las
ya definidas y aparece con cierta frecuencia (digamos, más de 10 veces),
mencionarlo en la respuesta para revisar aparte — pero no bloquear esta
tarea por eso.

Actualizar el popover del glosario para incluir todas las confirmadas de
forma ordenada y legible (agrupadas si tiene sentido, ej. todo lo que es
"por Caja" junto, todo lo que es "por Bulto/Tarima" junto).

Después de este cambio, si no hay nada más pendiente, hacer commit de
todo lo del glosario (problema 1 truncamiento + problema 2 glosario
completo).

## Parte 2 — Conectar imágenes de Cuidado del Hogar y Electrónica

### Cuidado del Hogar
Las imágenes quedaron en la carpeta `public/Catalogo/Cuidado-Hogar/`
(con guión, no "CuidadoDelHogar" como se había sugerido antes — usar el
nombre de carpeta REAL). Archivos confirmados:

```
accesorios-de-cocina-y-bano.png
cuidado-de-la-ropa.png
desechables.png
ferreteria.png
institucional.png
limpieza-del-hogar.png
papel-y-dispensadores.png
toallas-y-servilletas.png
```

Mapeo sub-familia → archivo:

| Sub-familia (API) | Archivo |
|---|---|
| Desechables | desechables.png |
| Cuidado de la Ropa | cuidado-de-la-ropa.png |
| Ferretería | ferreteria.png |
| Limpieza del hogar | limpieza-del-hogar.png |
| Toallas y servilletas | toallas-y-servilletas.png |
| Institucional | institucional.png |
| Papel y Dispensadores | papel-y-dispensadores.png |
| Accesorios de Cocina y Baño | accesorios-de-cocina-y-bano.png |

Path completo: `/Catalogo/Cuidado-Hogar/[archivo]`

### Electrónica
Carpeta `public/Catalogo/Electronica/`:

```
electrodomesticos.png
linea-blanca.png
televisores.png
```

Mapeo:

| Sub-familia (API) | Archivo |
|---|---|
| Línea Blanca | linea-blanca.png |
| Electrodomésticos | electrodomesticos.png |
| Televisores | televisores.png |

Path completo: `/Catalogo/Electronica/[archivo]`

### Implementación
Agregar estas 11 entradas nuevas al mismo diccionario explícito
sub-familia → imagen que ya se usa para Alimentos y Bebidas (extender el
mismo mapa central, no crear uno nuevo por familia).

## Verificación
- Glosario: abrir el popover, confirmar que todas las abreviaturas
  confirmadas aparecen con su significado correcto.
- Cuidado del Hogar: navegar sus 8 sub-familias, confirmar que cada
  divisor muestra su imagen correspondiente.
- Electrónica: navegar sus 3 sub-familias, confirmar lo mismo.
- Confirmar que Alimentos y Bebidas (ya conectadas antes) siguen
  funcionando sin romperse.
- Solo queda Cuidado Personal sin imágenes todavía — confirmar que sigue
  mostrando el placeholder genérico sin problema.
- Si hay Chrome MCP disponible, verificar visualmente todo lo anterior.

## Commit
Al terminar todo lo de este documento (glosario completo + las dos
familias conectadas), hacer commit y push a ambos remotos (`origin` y
`bitbucket`) si no hay nada roto.
