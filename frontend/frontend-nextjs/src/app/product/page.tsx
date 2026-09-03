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
  title: 'AI Operations Platform — Autonomous AI Agents for Business',
  description:
    'The agentic AI operations platform: diagnostics, blueprints, no-code automation and governed AI agents for your business.',
  alternates: {
    canonical: '/product',
  },
  openGraph: {
    type: 'website',
    title: 'AI Operations Platform — Autonomous AI Agents for Business | Aivory',
    description:
      'Aivory is the agentic AI operations platform for business transformation: diagnostics, blueprints, no-code workflow automation, and autonomous AI agents deployed to Slack, HubSpot, and your CRM.',
    url: '/product',
    images: ['/hero-video-poster.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Operations Platform — Autonomous AI Agents for Business | Aivory',
    description:
      'Aivory is the agentic AI operations platform for business transformation: diagnostics, blueprints, no-code workflow automation, and autonomous AI agents deployed to Slack, HubSpot, and your CRM.',
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
        title="AI Operations & Automation Platform"
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
