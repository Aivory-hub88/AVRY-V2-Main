import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentPt } from "@/content/company/pt";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Empresa — Aivory",
  description: "A Aivory ajuda equipas ambiciosas a compreender operações complexas, tomar decisões mais claras e construir sistemas duradouros.",
  alternates: {
    canonical: "/pt/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "Empresa — Aivory",
    description: "A Aivory ajuda equipas ambiciosas a compreender operações complexas, tomar decisões mais claras e construir sistemas duradouros.",
    url: "/pt/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPagePortuguese() {
  return <CompanyPageTemplate content={companyContentPt} />;
}
