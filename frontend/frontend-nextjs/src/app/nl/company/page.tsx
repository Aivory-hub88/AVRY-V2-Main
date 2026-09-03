import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentNl } from "@/content/company/nl";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Bedrijf — Aivory",
  description: "Aivory helpt ambitieuze teams complexe operaties te begrijpen, duidelijkere beslissingen te nemen en systemen te bouwen die standhouden.",
  alternates: {
    canonical: "/nl/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "Bedrijf — Aivory",
    description: "Aivory helpt ambitieuze teams complexe operaties te begrijpen, duidelijkere beslissingen te nemen en systemen te bouwen die standhouden.",
    url: "/nl/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageDutch() {
  return <CompanyPageTemplate content={companyContentNl} />;
}
