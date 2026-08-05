import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import PricingStepOne from '@/components/home/PricingStepOne';
import PricingStepTwo from '@/components/home/PricingStepTwo';
import PricingClientWrapper from './PricingClientWrapper';
import {
  JsonLd,
  buildPricingPageGraph,
  createBreadcrumbList,
  AIVORY_UK_URL,
  absoluteUrl,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing. Buy once, own the output.',
  alternates: {
    canonical: '/pricing',
    languages: { en: '/pricing', id: '/pricing' },
  },
  openGraph: {
    title: 'Pricing | Aivory',
    description: 'Simple, transparent pricing for AI-powered business transformation.',
    url: '/pricing',
  },
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={buildPricingPageGraph(AIVORY_UK_URL)} />
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', item: absoluteUrl('/') },
          { name: 'Pricing', item: absoluteUrl('/pricing') },
        ])}
      />
      <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
        <Navbar />
        <main
          className="flex-1 bg-[#efeee8] text-[#11110f]"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            background:
              'linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)',
          }}
        >
          <PricingClientWrapper />
        </main>

        <Footer />
      </div>
    </>
  );
}
