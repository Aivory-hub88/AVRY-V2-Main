import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import PricingStepOne from '@/components/home/PricingStepOne';
import PricingStepTwo from '@/components/home/PricingStepTwo';
import PricingClientWrapper from './PricingClientWrapper';

export const metadata: Metadata = {
  title: 'Pricing — Aivory',
  description: 'Simple, transparent pricing. Buy once, own the output.',
};

export default function PricingPage() {
  return (
    <main className="relative bg-[#050505] min-h-screen pt-24 text-white font-manrope">
      <Navbar />
      
      <PricingClientWrapper />

      <Footer />
    </main>
  );
}
