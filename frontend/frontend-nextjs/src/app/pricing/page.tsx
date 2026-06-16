import type { Metadata } from 'next';
import { HomeNavbar } from "@/components/layout/home-navbar";
import { HomeFooter } from "@/components/layout/home-footer";
import { PricingSection } from "@/components/layout/pricing-section";

export const metadata: Metadata = {
  title: 'Pricing — Aivory',
  description: 'Simple, transparent pricing. Buy once, own the output.',
};

export default function PricingPage() {
  return (
    <main className="relative bg-[#050505] min-h-screen text-white font-manrope">
      <HomeNavbar />
      
      <div className="pt-24 pb-12 bg-white text-black">
         <PricingSection />
      </div>

      <HomeFooter />
    </main>
  );
}
