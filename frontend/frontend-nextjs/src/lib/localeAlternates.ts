const LOCALE_PREFIXES = ["ar", "ja", "ko", "zh", "de", "nl", "es", "pt", "fr"] as const;

/**
 * Every language variant of a given English page ("about" | "company"),
 * for the Next.js Metadata `alternates.languages` map. English has no
 * prefix (it's the canonical/original path); every other locale lives
 * under /{locale}/{path}. Kept as one source of truth so hreflang stays
 * consistent as languages get added -- 10 hand-typed maps drift eventually.
 */
export function buildLanguageAlternates(path: "about" | "company"): Record<string, string> {
  const languages: Record<string, string> = {
    en: `/${path}`,
    "x-default": `/${path}`,
  };
  for (const locale of LOCALE_PREFIXES) {
    languages[locale] = `/${locale}/${path}`;
  }
  return languages;
}

/** All languages a page has a real variant for, English first. */
export const ALL_LOCALES = ["en", ...LOCALE_PREFIXES] as const;

/** Native-language display names for the language switcher. */
export const LOCALE_LABELS: Record<(typeof ALL_LOCALES)[number], string> = {
  en: "English",
  ar: "العربية",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  de: "Deutsch",
  nl: "Nederlands",
  es: "Español",
  pt: "Português",
  fr: "Français",
};

/** URL for a given locale's variant of a page -- English has no prefix. */
export function localeHref(locale: string, path: "about" | "company"): string {
  return locale === "en" ? `/${path}` : `/${locale}/${path}`;
}
