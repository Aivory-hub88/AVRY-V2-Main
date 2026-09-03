/**
 * Currency + price formatting for the checkout flow.
 *
 * The IDR conversion mirrors the /pricing page exactly (live spot rate from
 * LanguageContext × a 5% margin) so the amount a customer is charged at
 * checkout matches the amount advertised on the pricing cards.
 */

export type CheckoutCurrency = 'IDR' | 'USD';

/** The exact integer amount charged, in the active currency's smallest sensible unit. */
/**
 * FX margin applied to the live market rate when quoting in IDR.
 *
 * MUST match FX_MARGIN_PERCENT on the payments service, which is what the
 * customer is actually charged. It was duplicated as a bare `1.05` here, in
 * LanguageContext and in the service's own config, so changing one silently
 * made the quoted price disagree with the charged one. Keeping the browser's
 * two display sites on this single constant removes that drift inside the
 * frontend; the service remains the authority, and the payment screen shows
 * the amount it returns rather than this estimate.
 */
export const FX_MARGIN_MULTIPLIER = 1.03;

export function checkoutAmount(
  priceUsd: number,
  currency: CheckoutCurrency,
  exchangeRate: number
): number {
  if (currency === 'USD') return priceUsd;
  // Same effective rate the pricing page uses (see PricingStepOne/Two).
  return Math.round(priceUsd * exchangeRate * FX_MARGIN_MULTIPLIER);
}

/** A display string like `IDR 336.000` or `USD 20.00`. */
export function formatCheckoutPrice(
  priceUsd: number,
  currency: CheckoutCurrency,
  exchangeRate: number
): string {
  if (currency === 'USD') {
    return `USD ${priceUsd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `IDR ${checkoutAmount(priceUsd, currency, exchangeRate).toLocaleString('id-ID')}`;
}
