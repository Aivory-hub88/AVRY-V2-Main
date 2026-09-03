import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { CompanyHeroAr } from "@/components/company/ar/CompanyHero";
import { CompanyContentAr } from "@/components/company/ar/CompanyContent";
import { LocaleSuggestionBanner } from "@/components/locale/LocaleSuggestionBanner";
import { LocaleSwitcher } from "@/components/locale/LocaleSwitcher";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "الشركة — Aivory",
  description:
    "تساعد Aivory الفرق الطموحة على فهم العمليات المعقدة، واتخاذ قرارات أوضح، وبناء أنظمة تدوم.",
  alternates: {
    canonical: "/ar/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "الشركة — Aivory",
    description:
      "تساعد Aivory الفرق الطموحة على فهم العمليات المعقدة، واتخاذ قرارات أوضح، وبناء أنظمة تدوم.",
    url: "/ar/company",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "الشركة — Aivory",
    description:
      "تساعد Aivory الفرق الطموحة على فهم العمليات المعقدة، واتخاذ قرارات أوضح، وبناء أنظمة تدوم.",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageArabic() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <LocaleSwitcher currentLocale="ar" path="company" />
      <LocaleSuggestionBanner currentLocale="ar" path="company" />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <CompanyHeroAr />
        <CompanyContentAr />
      </main>

      <Footer />
    </div>
  );
}
