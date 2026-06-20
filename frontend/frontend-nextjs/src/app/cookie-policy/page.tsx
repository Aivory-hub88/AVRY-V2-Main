import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy — Aivory',
  description: 'Cookie Policy for Aivory platform.',
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          
          {/* Divider Line */}
          <div className="w-full border-b border-white/20"></div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-black pt-24 pb-32 px-6 md:px-16 lg:px-24 font-manrope">
        <div className="max-w-3xl mx-auto space-y-16 text-white/80 font-light leading-relaxed">
          
          <section className="space-y-6">
            <p>
              We use cookies to keep Aivory™ working properly, understand how people use it, and make it better over time. We don&apos;t use cookies to track you across other websites or sell your data to anyone. You&apos;re in control and you can manage your preferences anytime.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">1. What are cookies?</h3>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help websites remember who you are, what you&apos;ve done, and what you prefer, so you don&apos;t have to start from scratch every time you come back.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">2. The cookies we use</h3>
            <div className="space-y-4">
              <div>
                <strong className="text-white font-medium block mb-1">Essential cookies</strong>
                <p>These keep Aivory™ running. They handle things like keeping you logged in, remembering your session, and making sure the platform works the way it should. You can&apos;t turn these off because without them, Aivory™ simply doesn&apos;t function.</p>
              </div>
              <div>
                <strong className="text-white font-medium block mb-1">Preference cookies</strong>
                <p>These remember your settings, like your language preference or how you&apos;ve configured your workspace. They make your experience feel consistent every time you return.</p>
              </div>
              <div>
                <strong className="text-white font-medium block mb-1">Analytics cookies</strong>
                <p>These help us understand how people use Aivory™, which features get used, where people get stuck, and what we should fix or improve. All data is aggregated and anonymous. We use this to make better product decisions, not to profile you as an individual.</p>
              </div>
              <div>
                <strong className="text-white font-medium block mb-1">No advertising cookies</strong>
                <p>We don&apos;t run ads. We don&apos;t use ad networks. We don&apos;t place cookies that track you across other websites. If you see a cookie from a third party in your browser while using Aivory™, it is only from a service provider that helps us operate the platform, not an advertiser.</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">3. Third-party cookies</h3>
            <p>
              We work with a small number of trusted service providers who may set their own cookies on your device. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cloud infrastructure providers that help deliver Aivory™ reliably</li>
              <li>Analytics tools that help us understand platform usage</li>
              <li>Payment processors that handle transactions securely</li>
            </ul>
            <p>
              These providers only use cookies for the purpose we&apos;ve engaged them for. They are not permitted to use your data for their own marketing.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">4. Your choices</h3>
            <p>You are in control of your cookies. Here is what you can do:</p>
            <div className="space-y-4">
              <div>
                <strong className="text-white font-medium block mb-1">Cookie preferences panel</strong>
                <p>When you first visit Aivory™, you&apos;ll be asked to accept or decline non-essential cookies. You can change your preferences anytime by visiting the cookie settings in your account or clicking &quot;Cookie Preferences&quot; in the footer.</p>
              </div>
              <div>
                <strong className="text-white font-medium block mb-1">Browser settings</strong>
                <p>You can also control cookies through your browser. Most browsers let you block, delete, or get notified about cookies. Keep in mind that turning off essential cookies will affect how Aivory™ works.</p>
              </div>
              <div>
                <strong className="text-white font-medium block mb-1">Opt out of analytics</strong>
                <p>If you&apos;d prefer we don&apos;t collect anonymous usage data about your sessions, you can opt out in your account settings under Privacy.</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">5. Your rights under GDPR and UK GDPR</h3>
            <p>
              If you&apos;re based in the EU or UK, you have specific rights around how we use cookies and the data they collect:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The right to be informed about what cookies Aivory™ uses and why</li>
              <li>The right to withdraw consent at any time, without affecting anything that happened before you withdrew it</li>
              <li>The right to access, correct, or delete personal data collected via cookies</li>
              <li>The right to object to processing based on legitimate interests</li>
            </ul>
            <p>
              To exercise any of these rights, email us at <a href="mailto:hello@aivory.uk" className="text-white hover:underline transition-all">hello@aivory.uk</a>. We&apos;ll respond within 7 days.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">6. Changes to this policy</h3>
            <p>
              If we make meaningful changes to how Aivory™ uses cookies, we&apos;ll update this page and notify you where required. The &quot;last updated&quot; date at the top always reflects the current version.
            </p>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-medium text-white">7. Questions?</h3>
            <p>
              Email: <a href="mailto:hello@aivory.uk" className="text-white hover:underline transition-all">hello@aivory.uk</a><br />
              Website: <a href="https://aivory.uk/contact" className="text-white hover:underline transition-all">aivory.uk/contact</a>
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
