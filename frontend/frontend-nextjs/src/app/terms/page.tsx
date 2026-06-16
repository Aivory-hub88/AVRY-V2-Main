import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service — Aivory',
  description: 'Terms of Service and usage guidelines for Aivory platform.',
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          
          {/* Divider Line */}
          <div className="w-full border-b border-white/20"></div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-black pt-24 pb-32 px-6 md:px-16 lg:px-24 font-manrope">
        <div className="max-w-3xl mx-auto space-y-16 text-white/80 font-light leading-relaxed">
          
          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">The short version</h3>
            <p>
              We built Aivory to help you adopt AI, not to bury you in legal language. Here&apos;s what this document says in plain terms: use Aivory fairly, don&apos;t do anything harmful with it, and we&apos;ll keep building something you can trust. The full details are below.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">1. Who we are</h3>
            <p>
              Aivory is an AI adoption platform built to help organizations assess, plan, and deploy AI. When you use Aivory, you&apos;re agreeing to these terms. If you&apos;re using Aivory on behalf of an organization, you&apos;re agreeing on their behalf too.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">2. Your account</h3>
            <p>
              You&apos;re responsible for keeping your account secure. Use a strong password. Don&apos;t share your login. If something looks wrong — tell us immediately at hello@aivory.uk.
            </p>
            <p>
              We reserve the right to suspend accounts that violate these terms. We&apos;ll always try to give you notice first, unless the situation is urgent.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">3. What you can do with Aivory</h3>
            <p>
              Use it to assess your AI readiness, build your blueprint, deploy your workflows, and run your AI operations. That&apos;s what we built it for.
            </p>
            <p>
              What you can&apos;t do: use Aivory to build anything harmful, illegal, or designed to deceive others. Don&apos;t reverse-engineer the platform, resell access without permission, or use it in ways that damage other users or Aivory itself.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">4. Your content</h3>
            <p>
              Anything you create inside Aivory — your assessments, blueprints, workflows, agent configurations — belongs to you. We don&apos;t claim ownership of your work.
            </p>
            <p>
              We need limited access to your content to operate the platform — for example, to run your workflows or display your data in the console. That&apos;s it. We don&apos;t use your content to train our AI models.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">5. Our content</h3>
            <p>
              Everything we built — the platform, the interface, the template library, the underlying systems — belongs to Aivory. You get a license to use it while you&apos;re a customer. That license ends when your account does.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">6. Payments and refunds</h3>
            <p>
              Subscription plans are billed monthly or annually. One-time products like the Deep Diagnostic and Blueprint are charged at purchase.
            </p>
            <p>
              If something doesn&apos;t work the way we said it would, contact us within 7 days at hello@aivory.uk and we&apos;ll make it right — either with a fix or a refund. We don&apos;t offer refunds for change of mind on one-time purchases, but we&apos;re reasonable people. Talk to us.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">7. Downtime and reliability</h3>
            <p>
              We work hard to keep Aivory running. But no platform is perfect. We don&apos;t guarantee 100% uptime, and we&apos;re not liable for losses caused by downtime, bugs, or things outside our control.
            </p>
            <p>
              If something breaks on our end, we&apos;ll fix it as fast as we can and be transparent about what happened.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">8. Ending the relationship</h3>
            <p>
              You can cancel your account anytime. Your data will be available for 30 days after cancellation, then permanently deleted.
            </p>
            <p>
              We can terminate accounts that violate these terms. In most cases, we&apos;ll warn you first. In serious cases — fraud, illegal activity, security threats — we may act immediately.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">9. Changes to these terms</h3>
            <p>
              If we make significant changes, we&apos;ll notify you by email at least 14 days before they take effect. Continuing to use Aivory after that means you accept the new terms.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">10. The legal stuff we have to say</h3>
            <p>
              Aivory is provided &quot;as is.&quot; We&apos;re not liable for indirect, incidental, or consequential damages. Our total liability to you won&apos;t exceed what you paid us in the last 12 months.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
