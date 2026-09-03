/**
 * Card brand detection for the checkout card field.
 *
 * Two layers, deliberately kept separate:
 *
 * 1. `detectCardBrand` — a local IIN/BIN prefix check. Instant, offline, free,
 *    and not rate-limited, so it can run on every keystroke. This is what
 *    drives the brand icon in the field.
 *
 * 2. `lookupBin` — Midtrans' BIN API, which additionally knows the issuing
 *    bank and whether the card is credit or debit. It costs a network round
 *    trip and is rate-limited (100 req/min, 409 past that), so it runs once
 *    per BIN, debounced, never per keystroke.
 *
 * Midtrans' own guidance is that BIN data is "informational and advisory" and
 * must not be used for validation — values can change or come back empty. So
 * nothing here gates payment on the result; it only enriches what is shown.
 */

export type CardBrand = 'visa' | 'mastercard' | 'jcb' | 'amex';

/** Brands we have a logo for. Others detect fine but render no icon. */
export const BRAND_ICONS: Partial<Record<CardBrand, string>> = {
  visa: '/payments/visa.svg',
  mastercard: '/payments/mastercard.svg',
};

export const BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  jcb: 'JCB',
  amex: 'American Express',
};

/**
 * Identify the card network from the leading digits.
 *
 * Ranges are the published IIN assignments. Mastercard has two: the classic
 * 51-55 block and the 2221-2720 block added in 2017 — miss the second and a
 * chunk of newer Mastercards show up as unknown.
 */
export function detectCardBrand(cardNumber: string): CardBrand | null {
  const d = cardNumber.replace(/\D/g, '');
  if (!d) return null;

  if (d[0] === '4') return 'visa';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^35/.test(d)) return 'jcb';

  const two = Number(d.slice(0, 2));
  if (d.length >= 2 && two >= 51 && two <= 55) return 'mastercard';

  // The 2-series needs four digits before it can be judged; treat a shorter
  // prefix as "not yet known" rather than "not Mastercard".
  if (d.length >= 4) {
    const four = Number(d.slice(0, 4));
    if (four >= 2221 && four <= 2720) return 'mastercard';
  }

  return null;
}

export interface BinInfo {
  /** Network as Midtrans reports it, e.g. `visa`. May be absent. */
  brand?: string;
  /** `credit` or `debit`. May be absent. */
  binType?: string;
  /** Issuing bank name, e.g. `bank central asia`. May be absent. */
  bank?: string;
  countryCode?: string;
}

/** Digits Midtrans expects for a BIN lookup. */
export const BIN_LENGTH = 8;

/**
 * Look up BIN metadata via Midtrans.
 *
 * Authorised with the *client* key — Midtrans recommends that for calls made
 * from a browser, and it is the key we already hold client-side. Returns null
 * on anything unexpected (including the 409 rate-limit response); the caller
 * simply shows less.
 */
export async function lookupBin(
  cardNumber: string,
  clientKey: string,
  isProduction: boolean,
  signal?: AbortSignal,
): Promise<BinInfo | null> {
  const bin = cardNumber.replace(/\D/g, '').slice(0, BIN_LENGTH);
  if (bin.length < BIN_LENGTH || !clientKey) return null;

  const base = isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';

  try {
    const response = await fetch(`${base}/v1/bins/${bin}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${clientKey}:`)}`,
      },
      signal,
    });
    if (!response.ok) return null;

    const body = await response.json();
    const data = body?.data;
    if (!data) return null;

    return {
      brand: clean(data.brand),
      binType: clean(data.bin_type),
      bank: clean(data.bank),
      countryCode: clean(data.country_code),
    };
  } catch {
    return null;
  }
}

/**
 * Normalise one BIN field.
 *
 * Two things the docs do not mention but the live API does: values come back
 * UPPERCASE (the doc sample is lower-cased), and a missing value is the string
 * `"N"` rather than null or an empty string. Verified against production on
 * 2026-08-29 — e.g. BIN 55033400 returns `bank: "N"`, `bin_type: "N"`. Without
 * this the field would render a literal "N · N".
 */
function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.toUpperCase() === 'N') return undefined;
  return v.toLowerCase();
}

/** Title-case a normalised bank name ("bank central asia" -> "Bank Central Asia"). */
export function formatBankName(bank: string): string {
  return bank
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

/** "credit" -> "Credit". */
export function formatBinType(binType: string): string {
  const v = binType.toLowerCase();
  return v[0].toUpperCase() + v.slice(1);
}
