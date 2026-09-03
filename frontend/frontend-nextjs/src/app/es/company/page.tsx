import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentEs } from "@/content/company/es";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Empresa — Aivory",
  description: "Aivory ayuda a equipos ambiciosos a entender operaciones complejas, tomar decisiones más claras y construir sistemas duraderos.",
  alternates: {
    canonical: "/es/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "Empresa — Aivory",
    description: "Aivory ayuda a equipos ambiciosos a entender operaciones complejas, tomar decisiones más claras y construir sistemas duraderos.",
    url: "/es/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageSpanish() {
  return <CompanyPageTemplate content={companyContentEs} />;
}
