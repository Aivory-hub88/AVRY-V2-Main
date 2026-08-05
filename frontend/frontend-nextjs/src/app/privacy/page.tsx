import type { Metadata } from "next"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { JsonLd, createBreadcrumbList, absoluteUrl, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy and data usage guidelines for Aivory platform.",
  alternates: {
    canonical: "/privacy",
    languages: { en: "/privacy", id: "/privacy" },
  },
  openGraph: {
    title: "Privacy Policy | Aivory",
    description: "How Aivory collects, uses, and protects your data.",
    url: "/privacy",
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[22px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f]">
      {children}
    </h3>
  )
}

export default function PrivacyPage() {
  const leadClass = "text-black/70 leading-relaxed text-[16px] font-light"
  const strongClass = "text-[#11110f] font-medium"

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <Navbar />
      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <JsonLd
          data={createBreadcrumbList([
            { name: "Home", item: absoluteUrl("/") },
            { name: "Privacy Policy", item: absoluteUrl("/privacy") },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Policy
          </p>
          <h1 className="mt-5 text-[52px] font-light leading-[0.95] tracking-[-0.055em] md:text-[82px] lg:text-[104px]">
            Privacy Policy
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="max-w-3xl space-y-14">
            <section className="space-y-5">
              <SectionTitle>The short version</SectionTitle>
              <p className={leadClass}>
                We collect only what we need to run the platform. We don&apos;t sell your
                data. We don&apos;t use your data to train AI. We keep it secure. And you
                can ask us to delete it anytime.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>1. What we collect — and why</SectionTitle>
              <p className={leadClass}>
                <strong className={strongClass}>Account information</strong>
                <br />
                Your name, email, and password when you sign up. We need this to create
                and manage your account.
              </p>
              <p className={leadClass}>
                <strong className={strongClass}>Usage data</strong>
                <br />
                How you use Aivory — which features you use, how often, where you click.
                We use this to improve the platform and fix what&apos;s broken.
              </p>
              <p className={leadClass}>
                <strong className={strongClass}>Content you create</strong>
                <br />
                Your assessments, blueprints, workflows, and agent configurations. We
                store this so you can access and use it. It stays yours.
              </p>
              <p className={leadClass}>
                <strong className={strongClass}>Payment information</strong>
                <br />
                Processed securely through our payment provider. We never see or store
                your full card details.
              </p>
              <p className={leadClass}>
                <strong className={strongClass}>Communications</strong>
                <br />
                If you contact us by email or chat, we keep a record to help us respond
                and improve our support.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>2. What we don&apos;t do with your data</SectionTitle>
              <p className={leadClass}>
                We don&apos;t sell it. Ever.
                <br />
                We don&apos;t share it with advertisers.
                <br />
                We don&apos;t use it to train AI models — ours or anyone else&apos;s.
                <br />
                We don&apos;t hand it to governments unless legally required, and
                we&apos;ll tell you when that happens if we legally can.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>3. Who we share data with</SectionTitle>
              <p className={leadClass}>
                We work with a small number of trusted service providers to run Aivory —
                cloud infrastructure, payment processing, email delivery, analytics. They
                only get what they need to do their job, and they&apos;re bound by the same
                data protection standards we are.
              </p>
              <p className={leadClass}>
                We don&apos;t share your data with anyone else without your explicit consent.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>4. How we keep your data safe</SectionTitle>
              <p className={leadClass}>
                Encryption in transit and at rest. Access controls so only the right
                people inside Aivory can see what they need to. Regular security reviews.
                And a clear process for responding if something goes wrong.
              </p>
              <p className={leadClass}>
                If there&apos;s ever a data breach that affects you, we&apos;ll notify you within
                72 hours.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>5. How long we keep your data</SectionTitle>
              <p className={leadClass}>
                As long as your account is active. After you cancel, we keep your data
                for 30 days so you can export anything you need — then it&apos;s permanently
                deleted.
              </p>
              <p className={leadClass}>
                Some data — like payment records — we&apos;re legally required to keep longer.
                We&apos;ll hold the minimum necessary and no more.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>6. Your rights</SectionTitle>
              <p className={leadClass}>
                Regardless of where you&apos;re based, we believe everyone deserves the same
                basic rights over their personal data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-black/70 leading-relaxed text-[16px] font-light">
                <li>See what data we hold about you</li>
                <li>Correct anything that&apos;s wrong</li>
                <li>Export your data in a readable format</li>
                <li>Delete your account and all associated data</li>
                <li>Withdraw consent for data processing at any time</li>
                <li>Opt out of non-essential communications anytime</li>
              </ul>
              <p className={`${leadClass} mt-4`}>
                To exercise any of these, email us at hello@aivory.uk. We&apos;ll respond
                within 7 days.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>7. Cookies</SectionTitle>
              <p className={leadClass}>
                We use cookies to keep you logged in, remember your preferences, and
                understand how people use Aivory. We don&apos;t use cookies to track you
                across other websites.
              </p>
              <p className={leadClass}>
                You can control cookies through your browser settings. Turning off certain
                cookies may affect how some features work.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>8. Children</SectionTitle>
              <p className={leadClass}>
                Aivory is not designed for or directed at anyone under 18. If we become
                aware that we&apos;ve collected data from a minor, we&apos;ll delete it
                immediately.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>9. Changes to this policy</SectionTitle>
              <p className={leadClass}>
                If we make meaningful changes, we&apos;ll notify you by email before they
                take effect. The &quot;last updated&quot; date at the top of this page always
                reflects the current version.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>10. Questions?</SectionTitle>
              <p className={leadClass}>
                We&apos;re real people and we&apos;re happy to talk.
                <br />
                Email: hello@aivory.uk
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}