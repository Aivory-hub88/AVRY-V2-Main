import type { Metadata } from "next";
import FreeDiagnosticClient from "./FreeDiagnosticClient";

export const metadata: Metadata = {
  title: "Free Business Operations Diagnostic — Aivory",
  description:
    "Take Aivory's free Business Operations Assessment. Twelve questions score your process, data, strategy, governance, and people maturity, and produce a downloadable report card.",
  alternates: {
    canonical: "/free-diagnostic",
    languages: { en: "/free-diagnostic", id: "/free-diagnostic" },
  },
  openGraph: {
    type: "website",
    title: "Free Business Operations Diagnostic — Aivory",
    description:
      "Take Aivory's free Business Operations Assessment. Twelve questions score your process, data, strategy, governance, and people maturity, and produce a downloadable report card.",
    url: "/free-diagnostic",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Business Operations Diagnostic — Aivory",
    description:
      "Take Aivory's free Business Operations Assessment. Twelve questions score your process, data, strategy, governance, and people maturity, and produce a downloadable report card.",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function FreeDiagnosticPage() {
  return <FreeDiagnosticClient />;
}