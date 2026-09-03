import type { Metadata } from "next";
import PaymentClient from "./PaymentClient";

export const metadata: Metadata = {
  title: "Choose Your Product — Aivory",
  description:
    "Select from our range of AI services and subscription plans. Secure payment powered by Midtrans.",
  alternates: {
    canonical: "/payment",
  },
  robots: { index: false, follow: false },
};

export default function PaymentPage() {
  return <PaymentClient />;
}