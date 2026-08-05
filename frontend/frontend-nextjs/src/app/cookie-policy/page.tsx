import type { Metadata } from "next"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { JsonLd, createBreadcrumbList, absoluteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Cookie Policy for Aivory platform.",
  alternates: {
    canonical: "/cookie-policy",
    languages: { en: "/cookie-policy", id: "/cookie-policy" },
  },
  openGraph: {
    title: "Cookie Policy | Aivory",
    description: "How Aivory uses cookies and how you can control them.",
    url: "/cookie-policy",
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[22px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f]">
      {children}
    </h3>
  )
}

export default function CookiePolicyPage() {
  const leadClass = "text-black/70 leading-relaxed text-[16px] font-light"
  const strongClass = "text-[#11110f] font-medium"
  const linkClass = "text-[#11110f] underline underline-offset-2 hover:opacity-60 transition-opacity"

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
            { name: "Cookie Policy", item: absoluteUrl("/cookie-policy") },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Policy
          </p>
          <h1 className="mt-5 text-[52px] font-light leading-[0.95] tracking-[-0.055em] md:text-[82px] lg:text-[104px]">
            Cookie Policy
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="max-w-3xl space-y-14">
            <section className="space-y-5">
              <p className={leadClass}>
                We use cookies to keep Aivory™ working properly, understand how people
                use it, and make it better over time. We don&apos;t use cookies to track
                you across other websites or sell your data to anyone. You&apos;re in
                control and you can manage your preferences anytime.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>1. What are cookies?</SectionTitle>
              <p className={leadClass}>
                Cookies are small text files stored on your device when you visit a
                website. They help websites remember who you are, what you&apos;ve done,
                and what you prefer, so you don&apos;t have to start from scratch every time
                you come back.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>2. The cookies we use</SectionTitle>
              <div className="space-y-5">
                <div>
                  <strong className={`${strongClass} block mb-2`}>Essential cookies</strong>
                  <p className={leadClass}>
                    These keep Aivory™ running. They handle things like keeping you
                    logged in, remembering your session, and making sure the platform
                    works the way it should. You can&apos;t turn these off because without
                    them, Aivory™ simply doesn&apos;t function.
                  </p>
                </div>
                <div>
                  <strong className={`${strongClass} block mb-2`}>Preference cookies</strong>
                  <p className={leadClass}>
                    These remember your settings, like your language preference or how
                    you&apos;ve configured your workspace. They make your experience feel
                    consistent every time you return.
                  </p>
                </div>
                <div>
                  <strong className={`${strongClass} block mb-2`}>Analytics cookies</strong>
                  <p className={leadClass}>
                    These help us understand how people use Aivory™, which features get
                    used, where people get stuck, and what we should fix or improve. All
                    data is aggregated and anonymous. We use this to make better product
                    decisions, not to profile you as an individual.
                  </p>
                </div>
                <div>
                  <strong className={`${strongClass} block mb-2`}>No advertising cookies</strong>
                  <p className={leadClass}>
                    We don&apos;t run ads. We don&apos;t use ad networks. We don&apos;t place
                    cookies that track you across other websites. If you see a cookie
                    from a third party in your browser while using Aivory™, it is only
                    from a service provider that helps us operate the platform, not an
                    advertiser.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <SectionTitle>3. Third-party cookies</SectionTitle>
              <p className={leadClass}>
                We work with a small number of trusted service providers who may set
                their own cookies on your device. This includes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-black/70 leading-relaxed text-[16px] font-light">
                <li>Cloud infrastructure providers that help deliver Aivory™ reliably</li>
                <li>Analytics tools that help us understand platform usage</li>
                <li>Payment processors that handle transactions securely</li>
              </ul>
              <p className={leadClass}>
                These providers only use cookies for the purpose we&apos;ve engaged them
                for. They are not permitted to use your data for their own marketing.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>4. Your choices</SectionTitle>
              <p className={leadClass}>You are in control of your cookies. Here is what you can do:</p>
              <div className="space-y-5">
                <div>
                  <strong className={`${strongClass} block mb-2`}>Cookie preferences panel</strong>
                  <p className={leadClass}>
                    When you first visit Aivory™, you&apos;ll be asked to accept or decline
                    non-essential cookies. You can change your preferences anytime by
                    visiting the cookie settings in your account or clicking &quot;Cookie
                    Preferences&quot; in the footer.
                  </p>
                </div>
                <div>
                  <strong className={`${strongClass} block mb-2`}>Browser settings</strong>
                  <p className={leadClass}>
                    You can also control cookies through your browser. Most browsers let
                    you block, delete, or get notified about cookies. Keep in mind that
                    turning off essential cookies will affect how Aivory™ works.
                  </p>
                </div>
                <div>
                  <strong className={`${strongClass} block mb-2`}>Opt out of analytics</strong>
                  <p className={leadClass}>
                    If you&apos;d prefer we don&apos;t collect anonymous usage data about your
                    sessions, you can opt out in your account settings under Privacy.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <SectionTitle>5. Your rights under GDPR and UK GDPR</SectionTitle>
              <p className={leadClass}>
                If you&apos;re based in the EU or UK, you have specific rights around how we
                use cookies and the data they collect:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-black/70 leading-relaxed text-[16px] font-light">
                <li>The right to be informed about what cookies Aivory™ uses and why</li>
                <li>The right to withdraw consent at any time, without affecting anything that happened before you withdrew it</li>
                <li>The right to access, correct, or delete personal data collected via cookies</li>
                <li>The right to object to processing based on legitimate interests</li>
              </ul>
              <p className={leadClass}>
                To exercise any of these rights, email us at{" "}
                <a href="mailto:hello@aivory.uk" className={linkClass}>hello@aivory.uk</a>
                . We&apos;ll respond within 7 days.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>6. Changes to this policy</SectionTitle>
              <p className={leadClass}>
                If we make meaningful changes to how Aivory™ uses cookies, we&apos;ll update
                this page and notify you where required. The &quot;last updated&quot; date at
                the top always reflects the current version.
              </p>
            </section>

            <section className="space-y-5">
              <SectionTitle>7. Questions?</SectionTitle>
              <p className={leadClass}>
                Email:{" "}
                <a href="mailto:hello@aivory.uk" className={linkClass}>hello@aivory.uk</a>
                <br />
                Website:{" "}
                <a href="https://aivory.uk/contact" className={linkClass}>aivory.uk/contact</a>
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}