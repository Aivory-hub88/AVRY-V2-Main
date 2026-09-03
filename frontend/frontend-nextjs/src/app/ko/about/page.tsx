import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentKo } from "@/content/about/ko";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Aivory 소개 및 창업자 Irfan Reichmann",
  description:
    "Aivory와 창업자 Irfan Reichmann, 그리고 거버넌스가 적용된 AI 비즈니스 전환을 뒷받침하는 운영 기반 접근 방식에 대해 알아보세요.",
  alternates: {
    canonical: "/ko/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "Aivory 소개 및 창업자 Irfan Reichmann",
    description: "실용적인 AI 도입은 운영의 명확함, 거버넌스가 적용된 시스템, 그리고 조직에 대한 솔직한 이해에서 시작됩니다.",
    url: "/ko/about",
  },
};

export default function AboutPageKorean() {
  return <AboutPageTemplate content={aboutContentKo} />;
}
