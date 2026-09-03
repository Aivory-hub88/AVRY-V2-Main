import type { Metadata } from "next";
import { CompanyPageTemplate } from "@/components/company/CompanyPageTemplate";
import { companyContentZh } from "@/content/company/zh";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "公司 — Aivory",
  description: "Aivory 帮助有远大目标的团队理解复杂的运营，做出更清晰的决策，并构建持久的系统。",
  alternates: {
    canonical: "/zh/company",
    languages: buildLanguageAlternates("company"),
  },
  openGraph: {
    type: "website",
    title: "公司 — Aivory",
    description: "Aivory 帮助有远大目标的团队理解复杂的运营，做出更清晰的决策，并构建持久的系统。",
    url: "/zh/company",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function CompanyPageChinese() {
  return <CompanyPageTemplate content={companyContentZh} />;
}
