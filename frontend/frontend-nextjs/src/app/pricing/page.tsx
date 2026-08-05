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
      <main
        className="relative min-h-screen font-manrope"
        style={{
          background:
            'linear-gradient(to bottom, #050505 0, #050505 64px, #dfe4e5 64px, #dfe4e5 100%)',
        }}
      >
        <Navbar />
        <PricingClientWrapper />
        <Footer />
      </main>
    </>
  );
}
