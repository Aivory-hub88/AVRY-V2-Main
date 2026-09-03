import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentZh } from "@/content/about/zh";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "关于 Aivory 与创始人 Irfan Reichmann",
  description:
    "了解 Aivory、创始人 Irfan Reichmann，以及支撑受治理 AI 业务转型背后、以运营为根基的方法。",
  alternates: {
    canonical: "/zh/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "关于 Aivory 与创始人 Irfan Reichmann",
    description: "务实的 AI 落地始于运营上的清晰、具备治理能力的系统，以及对企业运作方式的真实理解。",
    url: "/zh/about",
  },
};

export default function AboutPageChinese() {
  return <AboutPageTemplate content={aboutContentZh} />;
}
