"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ALL_LOCALES } from "@/lib/localeAlternates";

/**
 * The root layout can only render one <html> for the whole app, hardcoded
 * to lang="en" -- Next.js has no per-route way to vary it, short of
 * reading headers() in the root layout, which would force every page in
 * the app into dynamic rendering just to fix this one attribute (see
 * lib/seo.ts's own note on why that trade was rejected for siteUrl
 * resolution). This syncs <html lang>/<html dir> client-side instead:
 * zero rendering-strategy cost, at the price of only taking effect after
 * hydration rather than being present in the raw HTML Googlebot fetches.
 * The hreflang tags each locale page already emits are the real signal
 * Google uses for language targeting; this fixes the secondary one.
 */
export function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const first = pathname.split("/")[1];
    const locale = (ALL_LOCALES as readonly string[]).includes(first) ? first : "en";
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [pathname]);

  return null;
}
