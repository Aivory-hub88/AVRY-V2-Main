import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentFr } from "@/content/about/fr";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "À propos d'Aivory et du fondateur Irfan Reichmann",
  description:
    "Découvrez Aivory, le fondateur Irfan Reichmann, et l'approche fondée sur l'opérationnel qui sous-tend la transformation d'entreprise par l'IA gouvernée.",
  alternates: {
    canonical: "/fr/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "À propos d'Aivory et du fondateur Irfan Reichmann",
    description: "L'adoption pratique de l'IA commence par la clarté opérationnelle, des systèmes gouvernés et une compréhension honnête du fonctionnement des organisations.",
    url: "/fr/about",
  },
};

export default function AboutPageFrench() {
  return <AboutPageTemplate content={aboutContentFr} />;
}
