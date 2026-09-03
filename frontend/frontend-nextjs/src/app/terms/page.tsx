import type { Metadata } from "next"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { JsonLd, createBreadcrumbList, absoluteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service and usage guidelines for Aivory platform.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Aivory",
    description: "The terms that govern your use of the Aivory platform.",
    url: "/terms",
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[22px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f]">
      {children}
    </h3>
  )
}

export default function TermsPage() {
  const leadClass = "text-black/70 leading-relaxed text-[16px] font-light"
  const strongClass = "text-[#11110f] font-medium"

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
            { name: "Terms of Service", item: absoluteUrl("/terms") },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Legal
          </p>
          <h1 className="mt-5 text-[44px] font-light leading-[1.15] tracking-[-0.02em] md:text-[64px] lg:text-[80px]">
            Terms of Service
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          <div className="max-w-3xl space-y-14">
            <section className="space-y-5">
              <SectionTitle>The short version</SectionTitle>
              <p className={leadClass}>
                We built Aivory to help you transform your business operations, not to
                bury you in legal language. Here&apos;s what this document says in plain
                terms: use Aivory fairly, don&apos;t do anything harmful with it, and
                we&apos;ll keep building something you can trust. The full details are below.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>1. Who we are</SectionTitle>
              <p className={leadClass}>
                Aivory is a business operations transformation platform built to help
                organisations assess, plan, and deploy AI. When you use Aivory, you&apos;re
                agreeing to these terms. If you&apos;re using Aivory on behalf of an
                organisation, you&apos;re agreeing on their behalf too.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>2. Your account</SectionTitle>
              <p className={leadClass}>
                You&apos;re responsible for keeping your account secure. Use a strong
                password. Don&apos;t share your login. If something looks wrong — tell us
                immediately at hello@aivory.uk.
              </p>
              <p className={leadClass}>
                We reserve the right to suspend accounts that violate these terms.
                We&apos;ll always try to give you notice first, unless the situation is
                urgent.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>3. What you can do with Aivory</SectionTitle>
              <p className={leadClass}>
                Use it to assess your operations, build your blueprint, deploy your
                workflows, and run your AI operations. That&apos;s what we built it for.
              </p>
              <p className={leadClass}>
                What you can&apos;t do: use Aivory to build anything harmful, illegal, or
                designed to deceive others. Don&apos;t reverse-engineer the platform, resell
                access without permission, or use it in ways that damage other users or
                Aivory itself.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>4. Your content</SectionTitle>
              <p className={leadClass}>
                Anything you create inside Aivory — your assessments, blueprints,
                workflows, agent configurations — belongs to you. We don&apos;t claim
                ownership of your work.
              </p>
              <p className={leadClass}>
                We need limited access to your content to operate the platform — for
                example, to run your workflows or display your data in the console.
                That&apos;s it. We don&apos;t use your content to train our AI models.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>5. Our content</SectionTitle>
              <p className={leadClass}>
                Everything we built — the platform, the interface, the template library,
                the underlying systems — belongs to Aivory. You get a license to use it
                while you&apos;re a customer. That license ends when your account does.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>6. Payments and refunds</SectionTitle>
              <p className={leadClass}>
                Subscription plans are billed monthly or annually. One-time products like
                the Deep Assessment and Blueprint are charged at purchase.
              </p>
              <p className={leadClass}>
                If something doesn&apos;t work the way we said it would, contact us within 7
                days at hello@aivory.uk and we&apos;ll make it right — either with a fix or a
                refund. We don&apos;t offer refunds for change of mind on one-time purchases,
                but we&apos;re reasonable people. Talk to us.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>7. Downtime and reliability</SectionTitle>
              <p className={leadClass}>
                We work hard to keep Aivory running. But no platform is perfect. We
                don&apos;t guarantee 100% uptime, and we&apos;re not liable for losses caused by
                downtime, bugs, or things outside our control.
              </p>
              <p className={leadClass}>
                If something breaks on our end, we&apos;ll fix it as fast as we can and be
                transparent about what happened.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>8. Ending the relationship</SectionTitle>
              <p className={leadClass}>
                You can cancel your account anytime. Your data will be available for 30
                days after cancellation, then permanently deleted.
              </p>
              <p className={leadClass}>
                We can terminate accounts that violate these terms. In most cases,
                we&apos;ll warn you first. In serious cases — fraud, illegal activity,
                security threats — we may act immediately.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>9. Changes to these terms</SectionTitle>
              <p className={leadClass}>
                If we make significant changes, we&apos;ll notify you by email at least 14
                days before they take effect. Continuing to use Aivory after that means
                you accept the new terms.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>10. The legal stuff we have to say</SectionTitle>
              <p className={leadClass}>
                Aivory is provided &quot;as is.&quot; We&apos;re not liable for indirect,
                incidental, or consequential damages. Our total liability to you won&apos;t
                exceed what you paid us in the last 12 months.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}