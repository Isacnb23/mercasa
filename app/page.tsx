import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import BrandsSection from "@/components/BrandsSection";
import LogisticsTimeline from "@/components/LogisticsTimeline";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import SectionReveal from "@/components/SectionReveal";

export default function Home() {
  return (
    <>
      <div className="sticky top-0 z-50">
        <Header />
      </div>
      <main className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <SectionReveal z={20}>
          <AboutSection />
        </SectionReveal>
        <SectionReveal z={30}>
          <LogisticsTimeline />
        </SectionReveal>
        <SectionReveal z={40}>
          <BrandsSection />
        </SectionReveal>
        <SectionReveal z={50}>
          <ContactSection />
        </SectionReveal>
      </main>
      <SectionReveal variant="fade" z={60}>
        <Footer />
      </SectionReveal>
    </>
  );
}
