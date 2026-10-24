# Mercasa Web

Sitio corporativo de **Mercasa** (distribuidora de consumo masivo, Costa
Rica, parte de Grupo Inteca). Next.js + TypeScript + Tailwind CSS.

## Stack

- **Framework**: Next.js 16 (Turbopack)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Animaciones**: Framer Motion, AOS
- **Mapa**: MapLibre GL JS (tiles de OpenFreeMap, estilo "liberty")
- **Catálogo/Revista**: `react-pageflip`
- **Excel**: ExcelJS (reportes de diagnóstico)
- **Deploy**: Vercel

## Requisitos previos

- Node.js (versión compatible con Next.js 16)
- Acceso a la red interna de Mercasa (VPN o similar) para conectar con
  `sjodb01` (SQL Server) si vas a trabajar con fotos de producto en local
- Variables de entorno (ver abajo)

## Instalación

```bash
npm install
npm run dev
```

Sitio disponible en `http://localhost:3000`.

## Variables de entorno (`.env.local`)

```
# Conexión a tabla Arte (fotos de producto)
ARTE_DB_USER=
ARTE_DB_PASSWORD=
ARTE_DB_SERVER=sjodb01
ARTE_DB_DATABASE=GIPLUS

# Microsoft Graph / SharePoint (archivo real de las fotos)
SHAREPOINT_TENANT_ID=
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=
```

> ⚠️ **Seguridad**: la conexión a SQL Server debe usar un usuario de
> **SOLO LECTURA** acotado a la tabla `Arte`. Nunca usar `sa` en
> producción/Vercel — hay un `console.warn` en el código que lo recuerda
> en cada arranque si detecta ese usuario.

> ⚠️ **Bug conocido de entorno (Windows)**: si ves errores de
> autenticación con Microsoft Graph que no coinciden con lo que dice
> `.env.local` (ej. "Application not found in directory X" con un
> tenant distinto al configurado), es probable que una terminal/IDE
> vieja tenga una variable de entorno de Windows heredada en memoria.
> Cerrá **todas** las terminales/VS Code/servidores de dev abiertos y
> reiniciá desde cero (en casos persistentes, reiniciar la PC completa).

## Estructura relevante

```
app/
  api/product-images/[itemId]/route.ts   # Endpoint de fotos de producto (SQL + Graph)
components/
  ProductExplorer.tsx        # Sección "Nuestros Productos" (home) — acordeón sidebar+panel
  ProductCatalogModal.tsx    # Catálogo tipo revista (flipbook)
  ContactSection.tsx         # Sección Contacto + Customer Class
  BusinessSegments.tsx       # Selector de "Customer Class"
lib/
  arte.ts                    # Conexión SQL + Microsoft Graph para fotos
  data.ts                    # businessSegments (Customer Class) — hardcodeado
public/
  Catalogo/
    portada.png               # Portada del catálogo
    indice.png                 # Página "Nuestro Portafolio"
    Alimentos/                # 17 imágenes divisoras de sub-familia
    Bebidas/                  # 3 imágenes
    Cuidado-Hogar/            # 8 imágenes
    Electrodomesticos/        # 3 imágenes (familia Electrónica)
scripts/
  diagnostics/                # Scripts de solo lectura para investigar datos
    output/                    # Reportes generados (CSV, txt)
```

## Catálogo de productos (revista digital)

El catálogo (`ProductCatalogModal.tsx`) es un flipbook interactivo con
tres tipos de página:

1. **Portada** — imagen fija (`public/Catalogo/portada.png`).
2. **Nuestro Portafolio** — imagen fija (`public/Catalogo/indice.png`) +
   listado de las 5 familias.
3. **Divisores de sub-familia** — una imagen por cada sub-familia
   (`public/Catalogo/[Familia]/[sub-familia].png`), generadas con IA
   (estilo fotografía de producto sin marca, ver sección abajo).
4. **Grillas de producto** — nombre + foto real (si existe en `Arte`) o
   ícono de fallback por familia.

### Origen de los datos

- **Estructura del catálogo** (Familia → Sub-familia → Categoría,
  nombres y conteos de producto): MercasaVIP API
  (`HE_GetInventoryItemsFMCM`). Es la fuente de verdad — el sitio
  refleja esta jerarquía tal cual la define el ERP de Mercasa, no la
  reorganiza.
- **Fotos de producto**: tabla `Arte` en SQL Server (`sjodb01/GIPLUS`)
  mapea `ITEMID` → nombre de archivo + variante (s/m/l). Los archivos
  reales viven en SharePoint (tenant `parnersenseitcs`, no confundir con
  `grupointeca.sharepoint.com`, que es el tenant nuevo aún sin usar).
  Cobertura real: **~82-85%** de los productos tienen foto — el resto
  cae al ícono genérico de familia. Esto es esperado, no un bug.

### Imágenes divisoras de sub-familia — estado actual

| Familia | Sub-familias | Estado |
|---|---|---|
| Alimentos | 17 | ✅ Completo |
| Bebidas | 3 | ✅ Completo |
| Cuidado del Hogar | 8 | ✅ Completo |
| Electrónica | 3 | ✅ Completo |
| Cuidado Personal | 6 | ⏳ Pendiente (usa placeholder genérico) |

Las imágenes se generan con IA (ChatGPT), estilo "fotografía de producto
profesional, surtido genérico sin marca, superficie limpia" — los
prompts usados quedaron documentados en el historial de trabajo del
proyecto (no versionados en el repo).

### Glosario de abreviaturas de empaque

El catálogo incluye un botón de glosario (ícono info, en el header,
persistente en cualquier página) que explica las abreviaturas de empaque
que aparecen en los nombres de producto:

| Abreviatura | Significado |
|---|---|
| U/P | Unidades por Paquete |
| P/C | Paquetes por Caja |
| C/T | Cajas por Tarima |
| U/C, UND/CAJA | Unidades por Caja |
| B/T | Bultos por Tarima |
| P/B | Paquetes por Bulto |
| U/B | Unidades por Bulto |
| R/C | Rollos por Caja |
| D/C, DISPL/CAJA | Displays por Caja |

## ProductExplorer (sección "Nuestros Productos")

Acordeón de una sola pieza (sidebar de familias + panel de
categorías/productos), con **altura fija** (no crece/encoge al expandir,
para no mover el resto de la página) y scroll interno donde haga falta.
Sin buscador. Cada familia tiene un botón "Revista" que abre el catálogo
posicionado directo ahí.

## Customer Class (sección Contacto)

Selector de 7 tipos de negocio (Supermercados, Hotelería, Restaurantes,
Comercio local, Panaderías, Instituciones, Retail) — **100% hardcodeado**
en `lib/data.ts` (`businessSegments`), no viene de base de datos. Cada
segmento muestra "categorías que te interesan" como chips clickeables
que enlazan directo al catálogo, ya sea a nivel de Familia (Alimentos,
Bebidas) o Sub-familia específica (Cuidado del Bebé, Higiene Personal,
Limpieza del hogar, Institucional).

## Checkout: crear el pedido

Flujo de 4 pasos (carrito → entrega → pago → resumen) detrás de `NEXT_PUBLIC_ENABLE_ORDERING` (apagada por defecto: el botón final es la cotización
por WhatsApp). Los precios, totales e impuestos que muestra la pantalla vienen de `Order/Validate` (servidor); **la web nunca los envía** al crear el pedido
ni envía la cuenta (sale del JWT en el servidor).

```
CartDrawer ─► lib/order-submit.ts ─► POST /api/checkout/order ─► lib/checkout-proxy.ts (proxyOrderCreate, 60 s) ─► mercasa-api POST /api/customer/order
                (requestId, cuerpo)        (cuerpo estricto, sesión)          lib/order-create-upstream.ts (mapeo)         ─► homex-api Order/Create
```

- **Cuerpo** (`lib/order-create.ts`): `{ requestId, addressId, deliveryDate, paymentMethod, items: [{ itemId, unitId?, quantity }], notes? }`. La ruta lo valida
  de forma **estricta**: cualquier campo desconocido (precios, totales, impuestos, cuenta...) da 400; `requestId` debe ser GUID, la fecha `yyyy-MM-dd`, el método
  `sinpe`/`transfer`, las notas hasta 250 caracteres (se limpian los caracteres de control). Con retiro en tienda en el carrito viaja el grupo `pickup` y el servidor
  responde que todavía no está disponible.
- **`requestId`**: nuevo al abrir la pantalla de pago (de "entrega" a "pago"), el mismo en los reintentos de esa confirmación (timeout o red) mientras el contenido
  no cambie, y descartado tras un 201/202. Así un doble clic o un reintento no duplica el pedido (mientras `homex-api` no se reinicie). El botón se deshabilita
  mientras la petición está en curso y un `ref` evita dos envíos simultáneos.
- **Tiempo de espera**: el proxy espera 60 s **solo para el pedido** (`ORDER_PROXY_TIMEOUT_MS`); `mercasa-api` espera hasta 45 s y `homex-api` hasta ~24 s. Los demás
  endpoints conservan los suyos (15 s los GET; 25 s los POST de validar y de precios). El navegador espera 70 s.

### Estados y textos (`messages/*.json`, `Cart.order.*`)

| Respuesta | Qué ve el cliente |
|---|---|
| 201 `created` / 202 `received` | "¡Pedido recibido!", el número si viene, **"Pedido recibido; pendiente de verificación de pago"**, que el personal de Mercasa verifica el pago antes de confirmarlo (puede tardar), "Normalmente entra en nuestro sistema en segundos o en unos pocos minutos; a veces puede tardar horas" y que lo verá en Mis pedidos cuando ya esté registrado. Nunca "confirmado" |
| 202 `processing` | "Estamos procesando tu pedido…" (no hace falta enviarlo de nuevo) |
| 400 `min_total_not_met` | monto mínimo para pedir en línea no alcanzado |
| 400 `payment_method_not_allowed` | método de pago no disponible |
| 400 `pickup_not_supported` | el retiro en tienda todavía no está disponible para pedidos en línea |
| 400 `delivery_coordination_not_supported` (también se detecta antes de enviar) | la zona se coordina con servicio al cliente (WhatsApp) |
| 400 `delivery_route_missing` | la dirección no tiene ruta de entrega |
| 400 `order_invalid` + `errors` | "Revisá tu pedido" + un texto por cada error de línea (sin existencia, no disponible, presentación...) |
| 400 `invalid_request` / otros | "No pudimos enviar tu pedido. Revisá los datos…" |
| 401 / 404 / 429 | sesión vencida / dirección no encontrada / "varios intentos seguidos, esperá un minuto" |
| 503 `order_busy` | "Estamos procesando otro pedido, intentá de nuevo en un momento" |
| 503 `ordering_disabled` / `ordering_not_available` | "Los pedidos en línea todavía no están habilitados" + cotización por WhatsApp (el carrito no se pierde) |
| 503 `service_unavailable` y demás | "El servicio no está disponible. Intentá de nuevo en unos minutos" |
| 504 `order_timeout` (o el navegador vence) | **"Estamos verificando tu pedido. Revisalo en Mis pedidos o contactanos antes de volver a enviarlo"** con "Ver Mis pedidos" y WhatsApp; **no** invita a reintentar a ciegas (si el cliente reintenta, viaja el mismo `requestId`) |

Nunca se muestran códigos crudos ni mensajes internos. **El carrito solo se vacía al pulsar "Listo" tras un 201/202; ante cualquier error se conserva.**

El pago por Sinpe o transferencia no cambia: en la confirmación se muestran los datos de `Cart.order.sinpeInstructions` / `transferInstructions` si tienen texto;
si están vacíos (hoy lo están), un texto neutro ("Te enviaremos los datos de pago y cómo mandar tu comprobante"). **No hay números de cuenta ni de Sinpe inventados.**

### "Mis pedidos"

No cambió. Muestra el pedido **solo cuando la orden ya existe en AX** (`SalesTable`, normalmente entre unos segundos y unos 3-4 minutos; a veces horas): mientras
el pedido solo está en las tablas intermedias no aparece, y por eso la confirmación y el aviso de tiempo de espera lo explican.

### Pendiente

- **Herson**: textos y datos de Sinpe y transferencia (números de cuenta, a quién y cómo enviar el comprobante: `sinpeInstructions` / `transferInstructions` en es/en), monto
  mínimo de la web (`Orders:MinTotal`), métodos de pago permitidos y su texto, quién convierte los pedidos a Contrato.
- **Luis**: encender `Orders:Provisioning:Mode` en `homex-api` (hoy `Disabled`: la web recibe `503 ordering_disabled`), escritura real en `PSMAINXML`, estilo de fecha, precio con/sin IVA.
- **Encender la web**: `NEXT_PUBLIC_ENABLE_ORDERING=true` (se incorpora al compilar; reiniciar o recompilar) solo cuando `homex-api` tenga el pedido encendido.
- "Mis pedidos" con el estado de las tablas intermedias (`received`) antes de que exista la orden; retiro en tienda; promociones y flete (no están en el pedido todavía).
- Zonas "a coordinar" (sin fecha) y pedidos mixtos (domicilio + retiro) todavía no se pueden pedir en línea.

## Repos remotos

El proyecto está conectado a **dos** remotos de git:

```bash
git remote -v
# origin      https://github.com/Isacnb23/mercasa.git
# bitbucket   https://bitbucket.org/grupointeca/mercasa-web.git
```

No hay push automático a ambos — hacerlo explícito:

```bash
git push origin main
git push bitbucket main
```

## Scripts de diagnóstico

`scripts/diagnostics/` contiene scripts de solo lectura para investigar
datos (cobertura de fotos, jerarquía de categorías, listado de
sub-familias, etc.) — no forman parte del build, se corren manualmente
con `node scripts/diagnostics/[script].mjs`. Salidas en
`scripts/diagnostics/output/`.

## Deploy

Vercel. Confirmar que las variables de entorno de producción usan el
usuario de SQL de solo lectura (no `sa`) antes de cada deploy que toque
la conexión a `Arte`.
## Sesión del cliente

El JWT de `homex-api` dura 5 minutos y se renueva solo en el servidor con un refresh token (cookies httpOnly separadas, sin tokens en el navegador). Flujo, cookies, qué pasa al expirar y pendientes: [`docs/sesion.md`](docs/sesion.md).
