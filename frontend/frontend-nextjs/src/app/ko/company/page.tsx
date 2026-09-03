import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentKo } from "@/content/company/ko";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "회사 소개 — Aivory",
  description:
    "Aivory는 야심 찬 팀이 복잡한 운영을 이해하고, 더 명확한 결정을 내리고, 오래 지속되는 시스템을 구축할 수 있도록 돕습니다.",
  alternates: {
    canonical: "/ko/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "회사 소개 — Aivory",
    description: "Aivory는 야심 찬 팀이 복잡한 운영을 이해하고, 더 명확한 결정을 내리고, 오래 지속되는 시스템을 구축할 수 있도록 돕습니다.",
    url: "/ko/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageKorean() {
  return <CompanyPageTemplate content={companyContentKo} />;
}
