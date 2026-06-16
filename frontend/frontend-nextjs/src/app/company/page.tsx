import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { CompanyHero } from '@/components/company/CompanyHero';
import { CompanyContent } from '@/components/company/CompanyContent';
import { CTAFooter } from '@/components/product/CTAFooter';

export const metadata: Metadata = {
  title: 'Company — Aivory',
  description: 'To make AI adoption practical, structured, and accessible for every organization, regardless of size, industry, or technical background.',
};

export default function CompanyPage() {
  return (
    <main className="relative bg-black min-h-screen font-manrope text-white overflow-hidden">
      {/* Sticky navigation bar */}
      <Navbar />

      {/* Hero Header */}
      <CompanyHero />

      {/* Company Content (Mission, Vision, Values) */}
      <CompanyContent />

      {/* Call to Action Conversion Block */}
      <CTAFooter
        title="Work directly with Aivory™"
        primaryCta={{ label: 'Talk to Us', href: '#contact' }}
      />

      {/* Standard Footer */}
      <Footer />
    </main>
  );
}
