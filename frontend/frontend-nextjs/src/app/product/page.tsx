import type { Metadata } from "next";
import { HomeNavbar } from "@/components/layout/home-navbar";
import { HomeFooter } from "@/components/layout/home-footer";
import { ProductHero } from "@/components/layout/product-hero";
import { InteractiveGridShowcase } from "@/components/product/InteractiveGridShowcase";
import { InteractiveGrid } from "@/components/product/InteractiveGrid";
import { ProductCTA } from "@/components/layout/product-cta";

export const metadata: Metadata = {
  title: "Products — Aivory",
  description:
    "Discover AI-powered tools for business transformation: diagnostics, blueprints, workflow automation, and intelligent agents.",
};

export default function ProductPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#000" }}>
      <HomeNavbar />
      <main className="flex-1">
        <ProductHero />
        <InteractiveGridShowcase />
        <InteractiveGrid />
        <ProductCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
