import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import BastionVisualHero from '@/components/bastion/BastionVisualHero';
import BastionHero from '@/components/bastion/BastionHero';
import BastionOverview from '@/components/bastion/BastionOverview';
import BastionMetrics from '@/components/bastion/BastionMetrics';
import BastionDeployment from '@/components/bastion/BastionDeployment';
import BastionEnterpriseTrust from '@/components/bastion/BastionEnterpriseTrust';
import BastionHowItWorks from '@/components/bastion/BastionHowItWorks';
import BastionPerformance from '@/components/bastion/BastionPerformance';
import BastionClosing from '@/components/bastion/BastionClosing';
import BastionContact from '@/components/bastion/BastionContact';
import Footer from '@/components/Footer';
import BastionBackground from '@/components/bastion/BastionBackground';
import { JsonLd, buildBastionGraph, siteUrlFromHeaders } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Bastion | Autonomous Infrastructure Defence',
  description: 'Bastion is an AI-native security layer that observes infrastructure behavior and autonomously coordinates defensive actions.',
  alternates: { canonical: '/bastion' },
  openGraph: {
    title: 'Bastion | Autonomous Infrastructure Defence',
    description: 'Adaptive defence for modern enterprises through AI-powered detection, continuous monitoring, and coordinated response.',
    url: '/bastion',
  },
};

export default function BastionPage() {
  const siteUrl = siteUrlFromHeaders();

  return (
    <main className="relative bg-black min-h-screen text-white font-manrope selection:bg-[#165444] selection:text-white">
      <JsonLd data={buildBastionGraph(siteUrl)} />

      {/* Global Ambient Background Gradient Wash (Fixed across ENTIRE page in #165444 emerald teal) */}
      <BastionBackground mode="gradient-only" className="fixed inset-0 z-0 pointer-events-none overflow-hidden" />

      {/* 1. Hero Section (Video Background) */}
      <div className="relative overflow-hidden min-h-screen z-10">
        <div className="relative z-10">
          <Navbar />
          <BastionVisualHero />
          <BastionHero />
        </div>
      </div>

      {/* 2. Middle & Footer Sections (Gradient Wash Only, NO Flower Animation) */}
      <div className="relative z-10">
        <BastionOverview />
        <BastionMetrics />
        <BastionHowItWorks />
        <BastionPerformance />
        <BastionDeployment />
        <BastionEnterpriseTrust />
        <BastionClosing />
        <BastionContact />
        <Footer />
      </div>
    </main>
  );
}
