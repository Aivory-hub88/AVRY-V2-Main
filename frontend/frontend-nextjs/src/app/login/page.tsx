import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In — Aivory",
  description: "Sign in to your Aivory workspace.",
  alternates: {
    canonical: "/login",
  },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}