import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact — Aivory",
  description:
    "Get in touch with Aivory. Contact the team about AI readiness, transformation blueprints, platform enquiries, or partnership opportunities.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    type: "website",
    title: "Contact — Aivory",
    description:
      "Get in touch with Aivory. Contact the team about AI readiness, transformation blueprints, platform enquiries, or partnership opportunities.",
    url: "/contact",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — Aivory",
    description:
      "Get in touch with Aivory. Contact the team about AI readiness, transformation blueprints, platform enquiries, or partnership opportunities.",
    images: ["/hero-video-poster.jpg"],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}