import type { Metadata } from "next";
import { AboutPageTemplate } from "@/components/about/AboutPageTemplate";
import { aboutContentEs } from "@/content/about/es";
import { buildLanguageAlternates } from "@/lib/localeAlternates";

export const metadata: Metadata = {
  title: "Sobre Aivory y el fundador Irfan Reichmann",
  description:
    "Conozca Aivory, al fundador Irfan Reichmann, y el enfoque basado en la operativa detrás de la transformación empresarial de IA con gobernanza.",
  alternates: {
    canonical: "/es/about",
    languages: buildLanguageAlternates("about"),
  },
  openGraph: {
    title: "Sobre Aivory y el fundador Irfan Reichmann",
    description: "La adopción práctica de la IA comienza con claridad operativa, sistemas con gobernanza y una comprensión honesta de cómo funcionan las organizaciones.",
    url: "/es/about",
  },
};

export default function AboutPageSpanish() {
  return <AboutPageTemplate content={aboutContentEs} />;
}
