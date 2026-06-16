import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import AIReadySection from '@/components/home/AIReadySection';
import FeatureCards from '@/components/home/FeatureCards';
import StatsSection from '@/components/home/StatsSection';
import PricingClientWrapper from '@/app/pricing/PricingClientWrapper';
import PrivacySection from '@/components/home/PrivacySection';
import PreFooterCTA from '@/components/home/PreFooterCTA';
import Footer from '@/components/Footer';
import ScrollRevealProvider from '@/components/home/ScrollRevealProvider';

export default function HomePage() {
  return (
    <main className="relative">
      <ScrollRevealProvider />
      <section style={{ padding: 0 }} className="relative z-[1]">
        <Navbar />
        <HeroSection />
        
        {/* Unscaled content (100% scale to match product page) */}
        <div>
          <AIReadySection />
          <FeatureCards />
        </div>

        {/* Scaled down content (85%) */}
        <div style={{ zoom: 0.85 }}>
          <StatsSection />
        </div>

        <PricingClientWrapper />

        <div style={{ zoom: 0.85 }}>
          <PrivacySection />
          <PreFooterCTA />
        </div>
        
        <Footer />
      </section>
    </main>
  );
}
