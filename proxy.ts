import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renombró middleware.ts -> proxy.ts (el mecanismo es el mismo,
// solo cambió el nombre de archivo/convención). Esto es lo que decide, por
// request, si servir /es (sin prefijo) o /en, detectando Accept-Language del
// navegador con fallback a español (routing.defaultLocale) cuando no matchea
// ningún locale soportado.
export default createMiddleware(routing);

export const config = {
  // Corre en todas las rutas EXCEPTO /api (careers/contact no dependen de
  // locale), los internals de Next (_next, _vercel) y archivos estáticos con
  // extensión (favicon.ico, imágenes, etc.).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
