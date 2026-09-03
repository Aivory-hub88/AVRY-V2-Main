import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import AIReadySection from '@/components/home/AIReadySection';
import FeatureCards from '@/components/home/FeatureCards';
import StatsSection from '@/components/home/StatsSection';
import VideoDemoSection from '@/components/home/VideoDemoSection';
import EnterpriseComparisonSection from '@/components/home/EnterpriseComparisonSection';
import PricingClientWrapper from '@/app/pricing/PricingClientWrapper';
import PrivacySection from '@/components/home/PrivacySection';
import PreFooterCTA from '@/components/home/PreFooterCTA';
import Footer from '@/components/Footer';
import ScrollRevealProvider from '@/components/home/ScrollRevealProvider';
import { HalftoneWaveWrapper } from '@/components/ui/HalftoneWaveWrapper';
import { DarkSectionSpotlight } from '@/components/ui/DarkSectionSpotlight';
import { JsonLd, buildHomePageGraph, siteUrlFromHeaders } from '@/lib/seo';

export default function HomePage() {
  const siteUrl = siteUrlFromHeaders();

  return (
    <main className="relative">
      <JsonLd data={buildHomePageGraph(siteUrl)} />
      <ScrollRevealProvider />
      <section style={{ padding: 0 }} className="relative z-[1] bg-background">
        {/* Halftone flower — no separate gradient wash underneath it, so the
            page still reads as pitch black wherever the flower's own
            opacity crossfades to 0. */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="w-full h-full">
            <HalftoneWaveWrapper />
          </div>
        </div>

        <Navbar />
        <HeroSection />

        {/* Unscaled content (100% scale to match product page) */}
        <DarkSectionSpotlight className="relative bg-transparent">
          <div className="relative z-10">
            <AIReadySection />

            <VideoDemoSection />

            <div className="w-full pt-4 md:pt-8 pb-2 md:pb-4 px-6 flex flex-col items-center justify-center text-center">
              <h2
                className="text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light tracking-tight text-[#B3B3B3] leading-[1.35] max-w-3xl"
                style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
              >
                Beyond AI chat<br />
                <span className="text-white font-light">Understand how business really works</span>
              </h2>
            </div>

            <FeatureCards />

            <div>
              <StatsSection />
            </div>

            <EnterpriseComparisonSection />

            <div>
              <PricingClientWrapper withBackground />
            </div>

            <div>
              <PrivacySection />
              <PreFooterCTA />
            </div>
          </div>
        </DarkSectionSpotlight>

        <Footer />
      </section>
    </main>
  );
}
