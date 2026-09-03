import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentDe } from "@/content/company/de";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Unternehmen — Aivory",
  description: "Aivory hilft ambitionierten Teams, komplexe Abläufe zu verstehen, klarere Entscheidungen zu treffen und dauerhafte Systeme aufzubauen.",
  alternates: {
    canonical: "/de/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "Unternehmen — Aivory",
    description: "Aivory hilft ambitionierten Teams, komplexe Abläufe zu verstehen, klarere Entscheidungen zu treffen und dauerhafte Systeme aufzubauen.",
    url: "/de/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageGerman() {
  return <CompanyPageTemplate content={companyContentDe} />;
}
