import { headers } from "next/headers";
import { LocaleSuggestionBannerClient } from "./LocaleSuggestionBannerClient";

export type LocalePath = "about" | "company";
export type SiteLocale = "en" | "ar" | "ja" | "ko" | "zh" | "de" | "nl" | "es" | "pt" | "fr";
export type SuggestableLocale = Exclude<SiteLocale, "en">;

/**
 * Countries mapped to a locale we actually have content for. Deliberately
 * NOT the geo-IP hard-redirect from the old worker (see cf. code review
 * history) -- this only ever informs a dismissible suggestion, never an
 * automatic redirect, per Google's own guidance on language/region targeting.
 */
const GCC_ARABIC_COUNTRIES = new Set(["AE", "SA", "QA", "BH", "OM"]);
const COUNTRY_TO_LOCALE: Record<string, SuggestableLocale> = {
  JP: "ja",
  KR: "ko",
  CN: "zh",
  DE: "de",
  NL: "nl",
  ES: "es",
  PT: "pt",
  FR: "fr",
};

function suggestLocaleForCountry(country: string | null): SuggestableLocale | null {
  if (!country) return null;
  if (GCC_ARABIC_COUNTRIES.has(country)) return "ar";
  return COUNTRY_TO_LOCALE[country] ?? null;
}

/**
 * Server component: reads the visitor's country from the `cf-ipcountry`
 * header (set by Cloudflare, forwarded through aivory-uk-reverse-proxy to
 * the origin) and decides whether a locale suggestion is worth showing.
 * Rendering/dismiss-state is delegated to the client component since that
 * needs localStorage.
 */
export async function LocaleSuggestionBanner({
  currentLocale,
  path,
}: {
  currentLocale: SiteLocale;
  path: LocalePath;
}) {
  // Only ever suggested on the English page -- the always-visible
  // LocaleSwitcher already covers "get back to English" from a localized
  // page, so there's no separate back-to-English variant here anymore.
  if (currentLocale !== "en") return null;

  const headerList = await headers();
  const country = headerList.get("cf-ipcountry");
  const suggested = suggestLocaleForCountry(country);
  if (!suggested) return null;
  return <LocaleSuggestionBannerClient target={suggested} path={path} />;
}
