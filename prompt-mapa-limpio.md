El mapa de la sección de contacto (CEDI - El Guarco) necesita limpieza. 
Actualmente tiene varios problemas visuales:

1. La línea naranja de "acceso principal" quedó como un stub cortito que sale 
   del pin y muere en la nada — no se lee como una ruta, parece un error de 
   render o una flecha rota.
2. El popup "CEDI - El Guarco" está muy cerca del pin, apelotonando ese 
   cuadrante con dos elementos azules fuertes (el botón sólido del popup y 
   el pin).
3. El zoom está muy alejado: se ven demasiadas calles con etiquetas (Avenida 
   48, 50, 52, 54A, Calle 58, etc.) que solo generan ruido y hacen que el 
   CEDI se pierda.

Aplicar estos cambios:

## 1. Quitar la ruta y su leyenda
- Eliminar por completo la capa de línea naranja del "acceso principal" 
  (la source/layer geojson de MapLibre que la dibuja).
- Eliminar la leyenda de la esquina inferior izquierda ("— Acceso principal"), 
  ya que no tiene nada que explicar una vez quitada la línea.

## 2. Acercar el zoom
- Aumentar el zoom inicial del mapa para que el CEDI sea claramente el 
  protagonista y no se pierda entre calles secundarias. Ajustar hasta que se 
  vea el contexto inmediato (la vía principal de acceso y las cuadras 
  circundantes) sin tanto ruido de etiquetas de calles lejanas.
- Si el estilo del mapa lo permite, reducir la densidad de labels de calles 
  menores para que se vea más limpio (ocultar o atenuar labels de calles 
  residenciales, dejando visibles solo las vías principales).

## 3. Reubicar el popup
- Mover el popup/card "CEDI - El Guarco" (con el botón "Cómo llegar") a una 
  esquina donde no compita visualmente con el pin — por ejemplo la esquina 
  inferior izquierda, o la superior derecha si los controles de zoom se 
  mueven. El objetivo es que el pin tenga aire alrededor y el popup no 
  quede pegado a él.
- Mantener el estilo del popup igual (fondo blanco, sombra suave, botón azul).

## 4. Mantener
- El marcador personalizado con la "M" de Mercasa se mantiene tal cual, 
  se ve bien.
- El estilo de mapa claro se mantiene.
- Los controles de zoom (+/-) se mantienen en estilo claro.

Resultado: un mapa limpio donde el pin del CEDI es claramente el foco, sin 
elementos gráficos rotos ni ruido de etiquetas innecesarias.
