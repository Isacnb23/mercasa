import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/hero/Hero";
import AboutSection from "@/components/sections/about/AboutSection";
import LogisticsTimeline from "@/components/sections/logistics/LogisticsTimeline";
import CollaboratorsSection from "@/components/sections/collaborators/CollaboratorsSection";
import ContactSection from "@/components/sections/contact/ContactSection";
import MarketSegmentSection from "@/components/sections/customer-class/MarketSegmentSection";
import MarketSegmentSectionLoader from "@/components/sections/customer-class/MarketSegmentSectionLoader";
import { ActiveSegmentProvider } from "@/components/sections/customer-class/ActiveSegmentContext";
import Footer from "@/components/layout/Footer";
import SectionReveal from "@/components/ui/SectionReveal";

export default function Home() {
  return (
    <>
      {/* <div className="sticky top-0 z-50"> */}
        <Header />
      {/* </div> */}
      <main className="relative" style={{ zIndex: 10 }}>
        {/* ActiveSegmentProvider envuelve desde acá hasta ContactSection (ver
            reestructuracion-orden-secciones.md): "Segmento de Mercado" pasó
            de vivir pegada a "Hablemos de negocios" (dentro del mismo
            ContactSection.tsx, compartiendo un simple useState) a ser la
            primera sección después del Hero — pedido del equipo, que sentía
            que quedaba "muy abajo" en la página. El WhatsApp de cierre del
            formulario de contacto sigue necesitando saber qué segmento
            eligió el usuario arriba, así que ese único dato pasó a un
            Context (no todo el estado del catálogo/modal, que se quedó
            local a MarketSegmentSection — ver ActiveSegmentContext.tsx).
            Nosotros/Logística/Colaboradores no leen este contexto, solo
            quedan de paso en el árbol. */}
        <ActiveSegmentProvider>
          <Hero />
          {/* variant="fade" (sin slide-up) en las secciones con id navegable:
              el variant="lift" por defecto anima un `transform: translateY(36px)`
              en el wrapper que envuelve a la sección, y ese transform todavía no
              se resolvió cuando Lenis calcula el destino del scroll en el click
              del navbar (si la sección nunca entró a pantalla). El salto que eso
              genera al terminar el reveal (~37-47px) variaba según el historial
              de scroll del usuario y rompía el scroll-margin-top calibrado — ver
              fix-padding-secciones-raiz.md. Con fade no hay transform de
              posición, así que el punto de scroll calculado por Lenis siempre
              coincide con el punto final de reposo. */}
          <SectionReveal variant="fade" z={10}>
            {/* Suspense con la propia MarketSegmentSection (families=[]) como
                fallback: la grilla de familias/segmentos se ve y funciona
                igual desde el primer render — los chips de "categorías que
                te interesan" solo se vuelven clickeables una vez que
                resuelve el fetch (normalmente ya tibio en caché, ver
                MarketSegmentSectionLoader). */}
            <Suspense fallback={<MarketSegmentSection />}>
              <MarketSegmentSectionLoader />
            </Suspense>
          </SectionReveal>
          <SectionReveal variant="fade" z={20}>
            <AboutSection />
          </SectionReveal>
          <SectionReveal variant="fade" z={30}>
            <LogisticsTimeline />
          </SectionReveal>
          <SectionReveal variant="fade" z={32}>
            <CollaboratorsSection />
          </SectionReveal>
          <SectionReveal variant="fade" z={50}>
            <ContactSection />
          </SectionReveal>
        </ActiveSegmentProvider>
      </main>
      <SectionReveal variant="fade" z={60}>
        <Footer />
      </SectionReveal>
    </>
  );
}
