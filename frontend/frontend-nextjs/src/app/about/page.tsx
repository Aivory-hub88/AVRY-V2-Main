import type { Metadata } from "next";
import { HomeNavbar } from "@/components/layout/home-navbar";
import { HomeFooter } from "@/components/layout/home-footer";
import { CompanyHero } from "@/components/layout/company-hero";
import { CompanyContent } from "@/components/layout/company-content";
import { CompanyCTA } from "@/components/layout/company-cta";

export const metadata: Metadata = {
  title: "Company — Aivory",
  description:
    "To make AI adoption practical, structured, and accessible for every organization, regardless of size, industry, or technical background.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#050505" }}>
      <HomeNavbar />
      <main className="flex-1">
        <CompanyHero />
        <CompanyContent />
        <CompanyCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
