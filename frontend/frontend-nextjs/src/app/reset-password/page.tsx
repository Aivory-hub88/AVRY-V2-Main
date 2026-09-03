import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Choose a New Password — Aivory",
  description: "Set a new password for your Aivory account.",
  alternates: {
    canonical: "/reset-password",
  },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
