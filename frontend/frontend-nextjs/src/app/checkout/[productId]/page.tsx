import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — Aivory",
  description: "Complete your Aivory product purchase.",
  alternates: {
    canonical: "/checkout/:productId",
    languages: { en: "/checkout/:productId", id: "/checkout/:productId" },
  },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}