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
    // entera. pt se deja igual que antes a propósito — el header flotante
    // (components/Header.tsx, fixed, ~96px de alto real medido) se solapa
    // con el título si se achica: probado con pt-[28px] y el título queda
    // tapado detrás de la barra de navegación.
    <section
      id="productos"
      className="relative overflow-hidden scroll-mt-20 pb-[36px] pt-[40px] sm:pb-[48px] sm:pt-[56px]"
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
