import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ValueProp from "@/components/ValueProp";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import AIShowcase from "@/components/AIShowcase";
import StockCoverage from "@/components/StockCoverage";
import SecuritySection from "@/components/SecuritySection";
import WaitlistCTA from "@/components/WaitlistCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero heroVideo="/parakonusur_hero.mp4" />
        <ValueProp />
        <HowItWorks />
        <Features />
        <AIShowcase />
        <StockCoverage />
        <SecuritySection />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
