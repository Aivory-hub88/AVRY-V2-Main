import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentFr } from "@/content/company/fr";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Entreprise — Aivory",
  description: "Aivory aide les équipes ambitieuses à comprendre des opérations complexes, à prendre des décisions plus claires et à construire des systèmes durables.",
  alternates: {
    canonical: "/fr/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "Entreprise — Aivory",
    description: "Aivory aide les équipes ambitieuses à comprendre des opérations complexes, à prendre des décisions plus claires et à construire des systèmes durables.",
    url: "/fr/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageFrench() {
  return <CompanyPageTemplate content={companyContentFr} />;
}
