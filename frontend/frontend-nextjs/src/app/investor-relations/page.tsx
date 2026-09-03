import type { Metadata } from "next"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { JsonLd, createBreadcrumbList, absoluteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Investor Relations",
  description: "Investor relations and investment information for Aivory.",
  alternates: {
    canonical: "/investor-relations",
  },
  openGraph: {
    title: "Investor Relations | Aivory",
    description: "Information about investing in Aivory.",
    url: "/investor-relations",
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[22px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f]">
      {children}
    </h3>
  )
}

export default function InvestorRelationsPage() {
  const leadClass = "text-black/70 leading-relaxed text-[16px] font-light"
  const strongClass = "text-[#11110f] font-medium"
  const linkClass = "text-[#11110f] underline underline-offset-2 hover:opacity-60 transition-opacity"

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <Navbar />
      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <JsonLd
          data={createBreadcrumbList([
            { name: "Home", item: absoluteUrl("/") },
            { name: "Investor Relations", item: absoluteUrl("/investor-relations") },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Investors
          </p>
          <h1 className="mt-5 text-[44px] font-light leading-[1.15] tracking-[-0.02em] md:text-[64px] lg:text-[80px]">
            Investor Relations
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          <div className="max-w-3xl space-y-14">
            <section className="space-y-5">
              <p className={`${leadClass} text-[17px] leading-[1.7]`}>
                <strong className={strongClass}>Aivory™ is a privately held company.</strong>
                <br />
                We are not currently seeking public investment, and we have not
                authorized any third party to offer, sell, or market equity, shares, or
                any financial instruments on our behalf.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>On unsolicited investment offers</SectionTitle>
              <p className={leadClass}>
                We have become aware that private technology companies are frequently
                targeted by bad actors who create fraudulent investment schemes, offering
                retail investors access to shares that don&apos;t exist, through channels
                that were never authorized.
              </p>
              <p className={leadClass}>
                <strong className={strongClass}>To be clear:</strong> any offer to invest
                in Aivory™ that does not come directly from Aivory™ is not legitimate. We
                do not offer equity investments, pre-IPO shares, or debt instruments
                through brokers, agents, or third-party funds. If someone approaches you
                with an opportunity to invest in Aivory™, exercise caution. It is very
                likely a scam.
              </p>
              <p className={leadClass}>
                If you believe you have been targeted by such an offer, we encourage you
                to report it to your local financial regulator or law enforcement
                authority.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>For legitimate investor inquiries</SectionTitle>
              <p className={leadClass}>
                If you are an institutional investor or fund and wish to open a
                conversation about Aivory&apos;s future, we are open to hearing from the
                right partners at the right time.
              </p>
              <p className={leadClass}>
                Reach us at{" "}
                <a href="mailto:investors@aivory.uk" className={linkClass}>
                  investors@aivory.uk
                </a>{" "}
                and we&apos;ll take it from there.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}