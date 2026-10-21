# Mis pedidos (web)

Historial y estado de los pedidos del cliente, solo lectura. Entrada: **Perfil → Mis pedidos** y el botón **Ver Mis pedidos** de la confirmación del checkout.

## Cómo está armado

`OrdersPanel` (`components/profile/OrdersPanel.tsx`) → `GET /api/customer/orders` y `/api/customer/orders/{id}` (`lib/orders-proxy.ts`, con `sessionGate`/`withSessionRetry`: si el JWT venció se renueva en silencio y se repite, ver `docs/sesion.md`) → `mercasa-api` `/api/customer/orders` → `homex-api` `Order/List` y `Order/{id}`.

- **La cuenta sale siempre del JWT** en `homex-api`; ninguna ruta ni el panel mandan cuenta, cédula ni id de cliente. Un pedido ajeno y uno inexistente responden el mismo 404.
- La lista es paginada (`page` 1..50, `pageSize` 1..20, por defecto 10), del más reciente al más antiguo.
- Estados de carga (esqueleto), vacío ("Todavía no tenés pedidos"), error con "Reintentar", "Ver más pedidos" y **Actualizar** (recarga manual de la lista o del detalle; si falla se conserva lo que ya se veía y se avisa). **No hay refresco automático** (ni temporizadores ni sondeo).
- Nada se registra en el log (ni números de pedido, ni cuentas, ni cuerpos).

## Estados y su texto

| Estado | Etiqueta | Texto |
|---|---|---|
| `received` | Recibido | Recibimos tu pedido. Lo estamos procesando. |
| `pending_payment_verification` | Verificando pago | Estamos verificando tu pago. |
| `confirmed` | Confirmado | Pedido confirmado. |
| `review` | En revisión | Estamos revisando tu pedido; te contactamos si hace falta. |
| `processing` (también el valor seguro de cualquier estado desconocido) | En proceso | Estamos procesando tu pedido. |
| `postponed`, `cancelled`, `approved`, `invoiced`, `on_route`, `delivered`, `partial`, `returned`, `later` | Postergado, Cancelado, Aprobado, Facturado, En ruta, Entregado, Entrega parcial, Devuelto, Entrega posterior | (solo la etiqueta) |

Un pedido recién hecho puede seguir "recibido" un rato (en AX la mayoría pasa de `PSMAINXML` a `SalesTable` en 12 a 206 s, con mediana cerca de 50 s, y unos pocos tardan horas): el texto es tranquilo y no es un aviso de error. `mercasa-api` normaliza el estado (nunca llega a la web un texto interno de AX) y la web vuelve a normalizarlo por si acaso.

## Interruptores

- El checkout (y su botón hacia Mis pedidos) sigue detrás de `NEXT_PUBLIC_ENABLE_ORDERING` (apagado por defecto).
- La entrada en el Perfil se oculta si `homex-api` responde `history_disabled` (su interruptor del historial, apagado por defecto). No se cambió ninguno.

## Pendiente

| Qué | Responsable |
|---|---|
| Confirmar con el código de `homex-api` que `Order/List` y `Order/{id}` devuelven `pending_payment_verification`, `confirmed` y `review` en `status` (esta tarea no pudo leer `homex-api`: su carpeta no estaba en el disco). Si usa otros nombres, se ajusta `OrderStatusMapper` en `mercasa-api` | Isaac / Luis |
| La consulta de lista optimizada de `homex-api` sigue apagada (`IntermediateListQueryEnabled=false`): necesita el índice en `PSORDHEADER (CSTMRACCNT, CREATEDDATETIME)` | Luis / Fabián |
| Prueba visual con el interruptor de pedidos encendido solo en local: vacío, detalle y un estado de cada tipo | Isaac |
