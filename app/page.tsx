import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ValueProp from "@/components/ValueProp";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import DeneSection from "@/components/DeneSection";
import StockCoverage from "@/components/StockCoverage";
import KayitCTA from "@/components/KayitCTA";
import Footer from "@/components/Footer";
import { LandingHareket, OrtamCanvas } from "@/components/landing/parcalar";

export default function Home() {
  return (
    <div style={{ position: "relative", background: "var(--bg-primary)", overflow: "hidden" }}>
      {/* Sayfa geneli isik katmani — tum bolumler z-index:1 ile bunun ustunde. */}
      <OrtamCanvas />
      <LandingHareket />
      <Navbar />
      <main>
        <Hero />
        <ValueProp />
        <HowItWorks />
        <Features />
        <DeneSection />
        <StockCoverage />
        <KayitCTA />
      </main>
      <Footer />
    </div>
  );
}
