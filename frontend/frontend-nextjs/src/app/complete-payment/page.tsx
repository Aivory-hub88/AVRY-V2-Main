import type { Metadata } from "next";
import { Suspense } from "react";
import CompletePaymentClient from "./CompletePaymentClient";

export const metadata: Metadata = {
  title: "Complete your purchase — Aivory",
  description: "Finish checkout to keep your Aivory account.",
  alternates: {
    canonical: "/complete-payment",
  },
  robots: { index: false, follow: false },
};

export default function CompletePaymentPage() {
  // useSearchParams() in CompletePaymentClient requires a Suspense boundary,
  // or the build fails prerendering this page.
  return (
    <Suspense fallback={null}>
      <CompletePaymentClient />
    </Suspense>
  );
}
