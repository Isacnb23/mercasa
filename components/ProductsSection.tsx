import { Suspense } from "react";
import Container from "./Container";
import SoftCurve from "./SoftCurve";
import ProductsHeader from "./ProductsHeader";
import ProductsExplorerLoader from "./ProductsExplorerLoader";
import ProductsSkeleton from "./ProductsSkeleton";

// Server Component: el fetch real (getProductHierarchy, cacheado 15 min)
// ocurre dentro de ProductsExplorerLoader, detrás de este <Suspense> — así el
// título y los pilares (ProductsHeader) aparecen de inmediato y solo el
// explorador de familias espera a MercasaVIP. NO hay fetch client-side acá:
// el árbol se arma server-side y se pasa ya listo al client component
// (ProductExplorer) que maneja la interacción.
export default function ProductsSection() {
  return (
    // pb achicado (ver ajuste-encaje-laptop.md): en laptops de poco alto el
    // conjunto título+pilares+cuadro no entraba sin scrollear la página
    // entera. pt subido a propósito (112/120px, ver fix-padding-secciones-raiz.md):
    // con scroll-mt-[-8px] la sección aterriza con su borde superior A RAS
    // del header (~86-96px reales), así que el propio padding de la sección
    // es lo único que evita que el título quede tapado. Medido en vivo
    // (post-click): pt-98/108 alcanzaba, pero con solo ~4px de margen — se
    // subió un poco más para no depender de ese margen tan ajustado.
    <section
      id="productos"
      className="relative flex min-h-dvh scroll-mt-[-8px] flex-col justify-center overflow-hidden pb-[36px] pt-[112px] sm:pb-[48px] sm:pt-[120px]"
      style={{ background: "#F7F3EB" }}
    >
      {/* Entrada (Colaboradores → Productos) ya la marca la curva inferior
          de Colaboradores. Acá se agrega la salida hacia Marcas (mural). */}
      <SoftCurve position="bottom" flip />

      <Container className="relative">
        <ProductsHeader />
        <Suspense fallback={<ProductsSkeleton />}>
          <ProductsExplorerLoader />
        </Suspense>
      </Container>
    </section>
  );
}
