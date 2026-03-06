import CTABand from "@/components/Ctaband";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Modules from "@/components/Modules";
import Navbar from "@/components/Navbar";
import Roles from "@/components/Roles";
import Security from "@/components/Security";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Modules />
        <Roles />
        <Security />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
