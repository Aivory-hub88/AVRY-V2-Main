import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { HeroSection } from '@/components/product/HeroSection';
import { InteractiveGridShowcase } from '@/components/product/InteractiveGridShowcase';
import { InteractiveGrid } from '@/components/product/InteractiveGrid';
import { TechLabSection } from '@/components/product/TechLabSection';
import { CTAFooter } from '@/components/product/CTAFooter';
import { DarkSectionSpotlight } from '@/components/ui/DarkSectionSpotlight';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Discover AI-powered tools for business transformation: diagnostics, blueprints, workflow automation, and intelligent agents.',
  alternates: {
    canonical: '/product',
    languages: { en: '/product', id: '/product' },
  },
  openGraph: {
    type: 'website',
    title: 'Products — Aivory',
    description:
      'Discover AI-powered tools for business transformation: diagnostics, blueprints, workflow automation, and intelligent agents.',
    url: '/product',
    images: ['/hero-video-poster.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Products — Aivory',
    description:
      'Discover AI-powered tools for business transformation: diagnostics, blueprints, workflow automation, and intelligent agents.',
    images: ['/hero-video-poster.jpg'],
  },
};

export default function ProductPage() {
  return (
    <DarkSectionSpotlight className="relative bg-black min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col relative z-10 w-full h-full">
      {/* Sticky navigation bar */}
      <Navbar />

      {/* Hero Header */}
      <HeroSection
        title="AI-Powered Business Transformation"
        subtitle="From diagnostic to deployment — everything you need to integrate AI into your business operations."
      />

      {/* Sticky Operational Framework showcase */}
      <InteractiveGridShowcase />

      {/* Spotlight Hover Utility Grid (Agents, Templates, Connectors, Telemetry) */}
      <InteractiveGrid />

      {/* Aivory Tech Lab Section */}
      <TechLabSection />

      {/* Call to Action Conversion Block */}
      <CTAFooter
        title="Work directly with Aivory™"
        primaryCta={{ label: 'Talk to Us', href: '#contact' }}
      />

      {/* Standard Footer */}
      <Footer />
      </main>
    </DarkSectionSpotlight>
  );
}
