import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentNl } from "@/content/about/nl";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Over Aivory en oprichter Irfan Reichmann",
  description:
    "Kom meer te weten over Aivory, oprichter Irfan Reichmann, en de operationeel gefundeerde aanpak achter governance-gestuurde AI-bedrijfstransformatie.",
  alternates: {
    canonical: "/nl/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "Over Aivory en oprichter Irfan Reichmann",
    description: "Praktische AI-adoptie begint met operationele duidelijkheid, governance-gestuurde systemen en een eerlijk begrip van hoe organisaties werken.",
    url: "/nl/about",
  },
};

export default function AboutPageDutch() {
  return <AboutPageTemplate content={aboutContentNl} />;
}
