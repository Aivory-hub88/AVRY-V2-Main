import { HeroSection } from "@/components/layout/hero-section";
import { InteractiveShowcase } from "@/components/layout/interactive-showcase";
import { StatsSection } from "@/components/layout/stats-section";
import { PricingSection } from "@/components/layout/pricing-section";
import { SubscriptionSection } from "@/components/layout/subscription-section";
import { CreditMarketplaceSection } from "@/components/layout/credit-marketplace-section";
import { PrivacySection } from "@/components/layout/privacy-section";
import { HomeFooter } from "@/components/layout/home-footer";
import { MidtransLoader } from "@/components/payment/midtrans-loader";
import { HomeNavbar } from "@/components/layout/home-navbar";
import { HomePageClient } from "@/components/layout/home-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://aivory.ai"),
  title: "Aivory - AI Readiness Diagnostic",
  description:
    "AI Readiness Diagnostic Platform - Transform your AI strategy with data-driven insights. Create comprehensive AI blueprints for your organization with our advanced diagnostic tools.",
  keywords: [
    "AI",
    "Readiness",
    "Diagnostic",
    "Blueprint",
    "Aivory",
    "AI Strategy",
    "Architecture",
    "Roadmap",
  ],
  authors: [{ name: "Aivory Team" }],
  openGraph: {
    title: "Aivory - AI Readiness Diagnostic",
    description:
      "AI Readiness Diagnostic Platform - Transform your AI strategy with data-driven insights.",
    type: "website",
    locale: "en_US",
    url: "https://aivory.ai",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aivory - AI Readiness Diagnostic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aivory - AI Readiness Diagnostic",
    description:
      "AI Readiness Diagnostic Platform - Transform your AI strategy with data-driven insights.",
    images: ["/images/og-image.png"],
    creator: "@aivory_ai",
  },
  alternates: {
    canonical: "https://aivory.ai",
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Midtrans Snap SDK Loader */}
      <MidtransLoader
        clientKey={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        isProduction={process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"}
      />

      {/* Navbar */}
      <HomeNavbar />

      <main>
        <HeroSection />
        <InteractiveShowcase />
        <StatsSection />
        <PricingSection />
        <SubscriptionSection />
        <CreditMarketplaceSection />
        <PrivacySection />
      </main>

      <HomeFooter />

      {/* Client-side login modal wrapper */}
      <HomePageClient />
    </div>
  );
}
