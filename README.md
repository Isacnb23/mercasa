# Mercasa — Sitio institucional

Sitio one-page para Distribuidora Mercasa (Grupo Inteca), construido con Next.js 16, TypeScript, Tailwind CSS 4, Framer Motion, GSAP/ScrollTrigger y Lenis (smooth scroll).

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build de producción
npm run start   # sirve el build de producción
npm run lint    # eslint
```

## Estructura

- `app/page.tsx` — ensambla todas las secciones del one-page.
- `app/layout.tsx` — fuentes (Inter + Spectral, autohospedadas vía `@fontsource`), metadata SEO/OG, proveedor de scroll suave.
- `components/` — un componente por sección (`Hero`, `StatsCounter`, `AboutSection`, `BrandsSection`, `LogisticsTimeline`, `ContactSection`, `Header`, `Footer`, `PageLoader`) más utilidades de animación (`Reveal.tsx`).
- `lib/data.ts` — **todo el contenido editable vive aquí** (cifras, textos, contactos, dirección). Para actualizar datos del negocio no hace falta tocar los componentes.
- `app/api/contact` — recibe el formulario de contacto del sitio.

## Contenido pendiente de reemplazar

- **Logo real de Mercasa**: hoy el header/footer usan un ícono de camión como marcador de posición.
- **Fotos reales** (bodegas, CEDIs, camiones, equipo, productos Clinx/Girol): el sitio hoy es 100% tipografía/color/ilustración vectorial, sin fotografía, para no bloquear el desarrollo mientras llegan los activos reales.
- Verificar que dirección, teléfonos y correos en `lib/data.ts` coincidan exactamente antes de publicar.

## Formularios y correo

El formulario de Contacto llama a `/api/contact`, que intenta enviar el correo vía [Resend](https://resend.com). **Sin configurar `RESEND_API_KEY`, el sitio sigue funcionando** (la persona ve el mensaje de éxito) pero el contenido solo queda en los logs del servidor — nada se pierde, pero tampoco llega a un correo real. Para activarlo:

1. Copia `.env.example` a `.env.local`.
2. Crea una cuenta en Resend y verifica un dominio de envío (idealmente un subdominio de `grupointeca.com`).
3. Completa `RESEND_API_KEY` y `RESEND_FROM`.

Si se prefiere otro proveedor (SMTP propio, SendGrid, etc.), solo hay que editar `lib/mailer.ts` — el resto del sitio no cambia.

## Mapa

El mapa de la sección de Contacto usa un iframe público de Google Maps (sin API key) apuntando a la dirección en `lib/data.ts` (`site.address.mapQuery`). No renderiza en entornos sin salida a internet (como el sandbox donde se construyó este sitio), pero funciona normalmente en cualquier navegador con conexión.

## Animaciones

- **Framer Motion**: reveals al hacer scroll, transiciones de header/menú, contadores animados, hover de tarjetas.
- **GSAP + ScrollTrigger**: la sección "Logística y Cobertura" usa scroll pineado (solo en pantallas ≥768px; en mobile se muestra una versión apilada simple para evitar jank).
- **Lenis**: scroll suave global, sincronizado con ScrollTrigger.
- Todas las animaciones respetan `prefers-reduced-motion`.

## Deploy

Cualquier plataforma compatible con Next.js App Router (Vercel, Netlify, un VPS con `next start`, etc.). No requiere base de datos. Si se activa el envío de correo, recordar configurar las variables de entorno en la plataforma de destino.
