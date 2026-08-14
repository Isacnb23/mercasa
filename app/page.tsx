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
      <main>
        <Hero />
        <SectionReveal>
          <AboutSection />
        </SectionReveal>
        <SectionReveal>
          <LogisticsTimeline />
        </SectionReveal>
        <SectionReveal>
          <BrandsSection />
        </SectionReveal>
        <SectionReveal>
          <ContactSection />
        </SectionReveal>
      </main>
      <SectionReveal variant="fade">
        <Footer />
      </SectionReveal>
    </>
  );
}
