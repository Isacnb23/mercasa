import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/hero/Hero";
import AboutSection from "@/components/sections/about/AboutSection";
import ProductsSection from "@/components/sections/products/ProductsSection";
import BrandsSection from "@/components/sections/brands/BrandsSection";
import LogisticsTimeline from "@/components/sections/logistics/LogisticsTimeline";
import CollaboratorsSection from "@/components/sections/collaborators/CollaboratorsSection";
import ContactSection from "@/components/sections/contact/ContactSection";
import ContactSectionLoader from "@/components/sections/contact/ContactSectionLoader";
import Footer from "@/components/layout/Footer";
import SectionReveal from "@/components/ui/SectionReveal";

export default function Home() {
  return (
    <>
      {/* <div className="sticky top-0 z-50"> */}
        <Header />
      {/* </div> */}
      <main className="relative" style={{ zIndex: 10 }}>
        <Hero />
        {/* variant="fade" (sin slide-up) en las 6 secciones con id navegable:
            el variant="lift" por defecto anima un `transform: translateY(36px)`
            en el wrapper que envuelve a la sección, y ese transform todavía no
            se resolvió cuando Lenis calcula el destino del scroll en el click
            del navbar (si la sección nunca entró a pantalla). El salto que eso
            genera al terminar el reveal (~37-47px) variaba según el historial
            de scroll del usuario y rompía el scroll-margin-top calibrado — ver
            fix-padding-secciones-raiz.md. Con fade no hay transform de
            posición, así que el punto de scroll calculado por Lenis siempre
            coincide con el punto final de reposo. */}
        <SectionReveal variant="fade" z={20}>
          <AboutSection />
        </SectionReveal>
        <SectionReveal variant="fade" z={30}>
          <LogisticsTimeline />
        </SectionReveal>
        <SectionReveal variant="fade" z={32}>
          <CollaboratorsSection />
        </SectionReveal>
        <SectionReveal variant="fade" z={35}>
          <ProductsSection />
        </SectionReveal>
        <SectionReveal variant="fade" z={40}>
          <BrandsSection />
        </SectionReveal>
        <SectionReveal variant="fade" z={50}>
          {/* Suspense con la propia ContactSection (families=[]) como
              fallback: el resto de la sección (dirección, mapa, WhatsApp)
              no depende de esta data, así que se ve y funciona igual desde
              el primer render — los chips de "categorías que te interesan"
              solo se vuelven clickeables una vez que resuelve el fetch
              (normalmente ya tibio en caché, ver ContactSectionLoader). */}
          <Suspense fallback={<ContactSection />}>
            <ContactSectionLoader />
          </Suspense>
        </SectionReveal>
      </main>
      <SectionReveal variant="fade" z={60}>
        <Footer />
      </SectionReveal>
    </>
  );
}
