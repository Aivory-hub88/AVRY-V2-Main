import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — Aivory',
  description: 'Privacy Policy and data usage guidelines for Aivory platform.',
};

export default function PrivacyPage() {
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
            Privacy Policy
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
              We collect only what we need to run the platform. We don&apos;t sell your data. We don&apos;t use your data to train AI. We keep it secure. And you can ask us to delete it anytime.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">1. What we collect — and why</h3>
            <p>
              <strong className="text-white">Account information</strong><br/>
              Your name, email, and password when you sign up. We need this to create and manage your account.
            </p>
            <p>
              <strong className="text-white">Usage data</strong><br/>
              How you use Aivory — which features you use, how often, where you click. We use this to improve the platform and fix what&apos;s broken.
            </p>
            <p>
              <strong className="text-white">Content you create</strong><br/>
              Your assessments, blueprints, workflows, and agent configurations. We store this so you can access and use it. It stays yours.
            </p>
            <p>
              <strong className="text-white">Payment information</strong><br/>
              Processed securely through our payment provider. We never see or store your full card details.
            </p>
            <p>
              <strong className="text-white">Communications</strong><br/>
              If you contact us by email or chat, we keep a record to help us respond and improve our support.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">2. What we don&apos;t do with your data</h3>
            <p>
              We don&apos;t sell it. Ever.<br/>
              We don&apos;t share it with advertisers.<br/>
              We don&apos;t use it to train AI models — ours or anyone else&apos;s.<br/>
              We don&apos;t hand it to governments unless legally required, and we&apos;ll tell you when that happens if we legally can.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">3. Who we share data with</h3>
            <p>
              We work with a small number of trusted service providers to run Aivory — cloud infrastructure, payment processing, email delivery, analytics. They only get what they need to do their job, and they&apos;re bound by the same data protection standards we are.
            </p>
            <p>
              We don&apos;t share your data with anyone else without your explicit consent.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">4. How we keep your data safe</h3>
            <p>
              Encryption in transit and at rest. Access controls so only the right people inside Aivory can see what they need to. Regular security reviews. And a clear process for responding if something goes wrong.
            </p>
            <p>
              If there&apos;s ever a data breach that affects you, we&apos;ll notify you within 72 hours.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">5. How long we keep your data</h3>
            <p>
              As long as your account is active. After you cancel, we keep your data for 30 days so you can export anything you need — then it&apos;s permanently deleted.
            </p>
            <p>
              Some data — like payment records — we&apos;re legally required to keep longer. We&apos;ll hold the minimum necessary and no more.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">6. Your rights</h3>
            <p>
              Regardless of where you&apos;re based, we believe everyone deserves the same basic rights over their personal data:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>See what data we hold about you</li>
              <li>Correct anything that&apos;s wrong</li>
              <li>Export your data in a readable format</li>
              <li>Delete your account and all associated data</li>
              <li>Withdraw consent for data processing at any time</li>
              <li>Opt out of non-essential communications anytime</li>
            </ul>
            <p className="mt-4">
              To exercise any of these, email us at hello@aivory.uk. We&apos;ll respond within 7 days.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">7. Cookies</h3>
            <p>
              We use cookies to keep you logged in, remember your preferences, and understand how people use Aivory. We don&apos;t use cookies to track you across other websites.
            </p>
            <p>
              You can control cookies through your browser settings. Turning off certain cookies may affect how some features work.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">8. Children</h3>
            <p>
              Aivory is not designed for or directed at anyone under 18. If we become aware that we&apos;ve collected data from a minor, we&apos;ll delete it immediately.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">9. Changes to this policy</h3>
            <p>
              If we make meaningful changes, we&apos;ll notify you by email before they take effect. The &quot;last updated&quot; date at the top of this page always reflects the current version.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">10. Questions?</h3>
            <p>
              We&apos;re real people and we&apos;re happy to talk.<br/>
              Email: hello@aivory.uk
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
