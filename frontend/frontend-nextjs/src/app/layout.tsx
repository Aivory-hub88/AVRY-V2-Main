import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/contexts/TranslationContext";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Aivory - AI Readiness Diagnostic",
  description: "AI Readiness Diagnostic Platform",
  keywords: ["AI", "Readiness", "Diagnostic", "Blueprint", "Aivory"],
  authors: [{ name: "Aivory Team" }],
  openGraph: {
    title: "Aivory - AI Readiness Diagnostic",
    description: "AI Readiness Diagnostic Platform",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aivory - AI Readiness Diagnostic",
    description: "AI Readiness Diagnostic Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetBrainsMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Manrope:wght@200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
          async
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"
          async
        />
        <script src="https://stag.aivory.id/led-hero-background.js" async />
      </head>

      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <TranslationProvider>{children}</TranslationProvider>
      </body>
    </html>
  );
}
