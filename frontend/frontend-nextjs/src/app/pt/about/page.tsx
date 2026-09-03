import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentPt } from "@/content/about/pt";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Sobre a Aivory e o fundador Irfan Reichmann",
  description:
    "Conheça a Aivory, o fundador Irfan Reichmann, e a abordagem operacionalmente fundamentada por trás da transformação empresarial de IA com governação.",
  alternates: {
    canonical: "/pt/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "Sobre a Aivory e o fundador Irfan Reichmann",
    description: "A adoção prática de IA começa com clareza operacional, sistemas com governação e uma compreensão honesta de como as organizações funcionam.",
    url: "/pt/about",
  },
};

export default function AboutPagePortuguese() {
  return <AboutPageTemplate content={aboutContentPt} />;
}
