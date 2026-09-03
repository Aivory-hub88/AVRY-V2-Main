import Link from "next/link";
import { ALL_LOCALES, LOCALE_LABELS, localeHref } from "@/lib/localeAlternates";
import type { LocalePath, SiteLocale } from "./LocaleSuggestionBanner";

/**
 * Always-visible language picker for the About/Company pages. Deliberately
 * NOT added to Navbar.tsx -- that file has pending uncommitted changes on
 * the VPS unrelated to this work, and touching it risked colliding with
 * that. Native <details>/<summary> needs no client JS: selecting a link
 * just navigates, closing the panel for free.
 *
 * Navbar itself is `position:absolute` (out of document flow, see its own
 * file header) over a 64px dark band each page paints as its own hero
 * background before turning ivory. A normal-flow element placed after
 * <Navbar/> doesn't sit "below" it -- it pushes that hero background down
 * and collides with Navbar's own absolutely-positioned content instead.
 * This has to be `absolute` too, pinned below that same 64px band, so it
 * floats over the ivory area without disturbing the layout at all.
 */
export function LocaleSwitcher({
  currentLocale,
  path,
}: {
  currentLocale: SiteLocale;
  path: LocalePath;
}) {
  return (
    <div className="absolute right-4 top-[76px] z-40 rtl:right-auto rtl:left-4 sm:right-6 sm:top-20 rtl:sm:right-auto rtl:sm:left-6">
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-black/60 transition-colors hover:text-black [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-[10px]">🌐</span>
          {LOCALE_LABELS[currentLocale]}
          <span aria-hidden="true" className="text-[16px] leading-none transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-40 overflow-y-auto rounded-sm border border-black/10 bg-white py-1 shadow-lg rtl:right-auto rtl:left-0">
          {ALL_LOCALES.map((locale) => (
            <Link
              key={locale}
              href={localeHref(locale, path)}
              className={`block px-3 py-1.5 text-[13px] transition-colors ${
                locale === currentLocale
                  ? "bg-black/5 text-black"
                  : "text-black/60 hover:bg-black/5 hover:text-black"
              }`}
            >
              {LOCALE_LABELS[locale]}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
