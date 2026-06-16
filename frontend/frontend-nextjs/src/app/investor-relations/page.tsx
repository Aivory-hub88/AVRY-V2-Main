import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Investor Relations — Aivory',
  description: 'Investor relations and investment information for Aivory.',
};

export default function InvestorRelationsPage() {
  return (
    <main className="relative bg-black min-h-screen font-manrope text-white overflow-hidden">
      {/* Sticky navigation bar */}
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 md:pt-48 pb-12 bg-black overflow-hidden">
        <div className="relative z-10 px-6 max-w-3xl mx-auto flex flex-col items-start w-full">
          {/* Eyebrow Logo */}
          <div className="mb-10">
            <Image
              src="/aivory-logo.svg"
              alt="Aivory Logo"
              width={90}
              height={24}
              className="h-4 w-auto opacity-70"
            />
          </div>
          
          <h1
            className="text-4xl sm:text-5xl md:text-[56px] font-light text-white mb-12 leading-[1.1] tracking-tight w-full"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Investor Relations
          </h1>
          
          {/* Divider Line */}
          <div className="w-full border-b border-white/20"></div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-black pt-24 pb-32 px-6 md:px-16 lg:px-24 font-manrope">
        <div className="max-w-3xl mx-auto space-y-16 text-white/80 font-light leading-relaxed">
          
          <section className="space-y-6">
            <p className="text-xl">
              <strong className="text-white font-medium">Aivory™ is a privately held company.</strong><br/>
              We are not currently seeking public investment, and we have not authorized any third party to offer, sell, or market equity, shares, or any financial instruments on our behalf.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">On unsolicited investment offers</h3>
            <p>
              We have become aware that private technology companies are frequently targeted by bad actors who create fraudulent investment schemes, offering retail investors access to shares that don&apos;t exist, through channels that were never authorized.
            </p>
            <p>
              <strong className="text-white font-medium">To be clear:</strong> any offer to invest in Aivory™ that does not come directly from Aivory™ is not legitimate. We do not offer equity investments, pre-IPO shares, or debt instruments through brokers, agents, or third-party funds. If someone approaches you with an opportunity to invest in Aivory™, exercise caution. It is very likely a scam.
            </p>
            <p>
              If you believe you have been targeted by such an offer, we encourage you to report it to your local financial regulator or law enforcement authority.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">For legitimate investor inquiries</h3>
            <p>
              If you are an institutional investor or fund and wish to open a conversation about Aivory&apos;s future, we are open to hearing from the right partners at the right time.
            </p>
            <p>
              Reach us at <a href="mailto:hello@aivory.uk" className="text-white underline hover:text-white/70 transition-colors">hello@aivory.uk</a> and we&apos;ll take it from there.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
