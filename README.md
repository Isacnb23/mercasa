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