import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { CompanyHeroJa } from "@/components/company/ja/CompanyHero";
import { CompanyContentJa } from "@/components/company/ja/CompanyContent";
import { LocaleSuggestionBanner } from "@/components/locale/LocaleSuggestionBanner";
import { LocaleSwitcher } from "@/components/locale/LocaleSwitcher";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "会社概要 — Aivory",
  description:
    "Aivoryは、野心的なチームが複雑な業務を理解し、より明確な意思決定を行い、長く機能するシステムを構築できるよう支援します。",
  alternates: {
    canonical: "/ja/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "会社概要 — Aivory",
    description:
      "Aivoryは、野心的なチームが複雑な業務を理解し、より明確な意思決定を行い、長く機能するシステムを構築できるよう支援します。",
    url: "/ja/company",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "会社概要 — Aivory",
    description:
      "Aivoryは、野心的なチームが複雑な業務を理解し、より明確な意思決定を行い、長く機能するシステムを構築できるよう支援します。",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageJapanese() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <LocaleSwitcher currentLocale="ja" path="company" />
      <LocaleSuggestionBanner currentLocale="ja" path="company" />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <CompanyHeroJa />
        <CompanyContentJa />
      </main>

      <Footer />
    </div>
  );
}
