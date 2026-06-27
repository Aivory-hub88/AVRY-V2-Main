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
import { HalftoneWaveWrapper } from '@/components/ui/HalftoneWaveWrapper';

export default function HomePage() {
  return (
    <main className="relative">
      <ScrollRevealProvider />
      <section style={{ padding: 0 }} className="relative z-[1]">
        <Navbar />
        <HeroSection />
        
        {/* Unscaled content (100% scale to match product page) */}
        <div className="relative bg-black">
          {/* Global seamless background for all these sections */}
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ clipPath: 'inset(0 0 0 0)' }}>
            <div className="sticky top-0 w-full h-screen">
              <HalftoneWaveWrapper />
            </div>
          </div>
          <div className="relative z-10">
            <AIReadySection />
            <FeatureCards />
            
            {/* Scaled down content (85%) */}
            <div style={{ zoom: 0.85, marginTop: '-150px' }}>
              <StatsSection />
            </div>

            {/* Pricing Section (unscaled, has its own black background that covers the clouds) */}
            <div style={{ zoom: 1 }}>
              <PricingClientWrapper />
            </div>

            {/* Scaled down content (85%) */}
            <div style={{ zoom: 0.85 }}>
              <PrivacySection />
              <PreFooterCTA />
            </div>
          </div>
        </div>
        
        <Footer />
      </section>
    </main>
  );
}
