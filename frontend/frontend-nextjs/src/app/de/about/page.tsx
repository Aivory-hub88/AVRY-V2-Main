import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentDe } from "@/content/about/de";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Über Aivory und Gründer Irfan Reichmann",
  description:
    "Erfahren Sie mehr über Aivory, Gründer Irfan Reichmann, und den operativ fundierten Ansatz hinter governter KI-Unternehmenstransformation.",
  alternates: {
    canonical: "/de/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "Über Aivory und Gründer Irfan Reichmann",
    description: "Praktische KI-Einführung beginnt mit operativer Klarheit, governten Systemen und einem ehrlichen Verständnis dafür, wie Organisationen funktionieren.",
    url: "/de/about",
  },
};

export default function AboutPageGerman() {
  return <AboutPageTemplate content={aboutContentDe} />;
}
