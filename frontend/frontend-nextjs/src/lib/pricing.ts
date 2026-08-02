/**
 * Pricing Configuration — Single Source of Truth
 *
 * Defines every Aivory product (one-time, subscription, and Intelligence Credit
 * packs) with a unique product ID, a canonical name, and a price. The homepage,
 * the payment modal, and the authenticated hand-off all consume this module so
 * that prices and names never diverge between the UI, the backend catalog, and
 * the Midtrans item definitions.
 *
 * Conventions:
 * - Every price is a positive amount denominated in a single shared currency.
 * - Subscription prices are applied per month (`interval: "month"`).
 * - One-time products and credit packs are charged once (`interval: "one-time"`).
 */

// ============================================================================
// CURRENCY
// ============================================================================

/** The single shared currency for every product price. */
export const PRICING_CURRENCY = 'USD' as const;
export type PricingCurrency = typeof PRICING_CURRENCY;

// ============================================================================
// TYPES
// ============================================================================

/** How often a product price is applied. */
export type BillingInterval = 'one-time' | 'month';

/** Discriminates the kind of product in the catalog. */
export type ProductKind = 'one-time' | 'subscription' | 'credit-pack';

/** Fields shared by every product in the pricing catalog. */
interface BaseProduct {
  /** Unique, stable product identifier (matches backend + Midtrans item id). */
  id: string;
  /** Canonical, customer-facing product name. */
  name: string;
  /** Positive price amount denominated in {@link PRICING_CURRENCY}. */
  price: number;
  /** The currency the price is denominated in. */
  currency: PricingCurrency;
  /** Product kind discriminator. */
  kind: ProductKind;
  /** How often the price applies. */
  interval: BillingInterval;
}

/** A one-time product charged a single time. */
export interface OneTimeProduct extends BaseProduct {
  kind: 'one-time';
  interval: 'one-time';
}

/** A subscription product charged per month. */
export interface SubscriptionProduct extends BaseProduct {
  kind: 'subscription';
  interval: 'month';
}

/** An Intelligence Credit pack charged a single time. */
export interface CreditPackProduct extends BaseProduct {
  kind: 'credit-pack';
  interval: 'one-time';
  /** Number of Intelligence Credits granted by the pack. */
  credits: number;
}

/** Any product defined in the pricing catalog. */
export type Product = OneTimeProduct | SubscriptionProduct | CreditPackProduct;

// ============================================================================
// PRODUCT IDS
// ============================================================================

/** Canonical product IDs for non-credit products. */
export const PRODUCT_IDS = {
  DEEP_DIAGNOSTIC: 'ai_snapshot',
  BLUEPRINT: 'ai_blueprint',
  FULL_STACK: 'full_stack',
  FOUNDATION: 'foundation',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

/**
 * Build the canonical product id for an Intelligence Credit pack.
 * @param credits - Number of credits in the pack
 * @returns The credit pack product id (e.g. `credits_500`)
 */
export function creditPackId(credits: number): string {
  return `credits_${credits}`;
}

// ============================================================================
// ONE-TIME PRODUCTS
// ============================================================================

export const ONE_TIME_PRODUCTS: OneTimeProduct[] = [
  {
    id: PRODUCT_IDS.DEEP_DIAGNOSTIC,
    name: 'Business Operations Assessment',
    price: 79,
    currency: PRICING_CURRENCY,
    kind: 'one-time',
    interval: 'one-time',
  },
  {
    id: PRODUCT_IDS.BLUEPRINT,
    name: 'Transformation Blueprint',
    price: 249,
    currency: PRICING_CURRENCY,
    kind: 'one-time',
    interval: 'one-time',
  },
  {
    id: PRODUCT_IDS.FULL_STACK,
    name: 'Complete Transformation Package',
    price: 299,
    currency: PRICING_CURRENCY,
    kind: 'one-time',
    interval: 'one-time',
  },
];

// ============================================================================
// SUBSCRIPTION PRODUCTS (per month)
// ============================================================================

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: PRODUCT_IDS.FOUNDATION,
    name: 'Operational Licence',
    price: 39,
    currency: PRICING_CURRENCY,
    kind: 'subscription',
    interval: 'month',
  },
  {
    id: PRODUCT_IDS.PRO,
    name: 'Business Licence',
    price: 99,
    currency: PRICING_CURRENCY,
    kind: 'subscription',
    interval: 'month',
  },
  {
    id: PRODUCT_IDS.ENTERPRISE,
    name: 'Enterprise Licence',
    price: 499,
    currency: PRICING_CURRENCY,
    kind: 'subscription',
    interval: 'month',
  },
];

// ============================================================================
// INTELLIGENCE CREDIT PACKS (one-time)
// ============================================================================

/** Credit-pack definitions as `[credits, price]` pairs, in published order. */
const CREDIT_PACK_DEFINITIONS: ReadonlyArray<readonly [credits: number, price: number]> = [
  [50, 5],
  [100, 9],
  [250, 20],
  [500, 38],
  [1000, 70],
  [2500, 165],
  [5000, 300],
  [10000, 550],
];

export const CREDIT_PACKS: CreditPackProduct[] = CREDIT_PACK_DEFINITIONS.map(
  ([credits, price]) => ({
    id: creditPackId(credits),
    name: `${credits.toLocaleString('en-US')} Intelligence Credits`,
    price,
    currency: PRICING_CURRENCY,
    kind: 'credit-pack',
    interval: 'one-time',
    credits,
  })
);

// ============================================================================
// AGGREGATE CATALOG + LOOKUPS
// ============================================================================

/** Every product defined in the pricing catalog. */
export const ALL_PRODUCTS: Product[] = [
  ...ONE_TIME_PRODUCTS,
  ...SUBSCRIPTION_PRODUCTS,
  ...CREDIT_PACKS,
];

/** Map of product id → product for O(1) lookups. */
export const PRODUCTS_BY_ID: Readonly<Record<string, Product>> = Object.freeze(
  ALL_PRODUCTS.reduce<Record<string, Product>>((map, product) => {
    map[product.id] = product;
    return map;
  }, {})
);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a price amount as a USD display string.
 *
 * Renders a whole-number amount as `"$" + amount` with no decimal places,
 * matching the legacy homepage's price display (e.g. `29` → `"$29"`). This is
 * the single display formatter the marketing sections use so every shown price
 * is derived from {@link getProductPrice} / {@link CREDIT_PACKS} rather than a
 * hardcoded literal.
 *
 * @param amount - The price amount (a non-negative whole number of dollars)
 * @returns The formatted display string, e.g. `"$29"`
 */
export function formatUsd(amount: number): string {
  return `$${amount}`;
}

/**
 * Look up a product by its unique id.
 * @param id - The product id (e.g. `ai_snapshot`, `pro`, `credits_500`)
 * @returns The product, or `undefined` when no product matches
 */
export function getProductById(id: string): Product | undefined {
  return PRODUCTS_BY_ID[id];
}

/**
 * Get the price for a product by id.
 * @param id - The product id
 * @returns The positive price, or `undefined` when no product matches
 */
export function getProductPrice(id: string): number | undefined {
  return PRODUCTS_BY_ID[id]?.price;
}

/**
 * Get the canonical name for a product by id.
 * @param id - The product id
 * @returns The canonical name, or `undefined` when no product matches
 */
export function getProductName(id: string): string | undefined {
  return PRODUCTS_BY_ID[id]?.name;
}

/**
 * Look up an Intelligence Credit pack by its credit amount.
 * @param credits - Number of credits in the pack
 * @returns The matching credit pack, or `undefined` when none matches
 */
export function getCreditPackByCredits(credits: number): CreditPackProduct | undefined {
  return CREDIT_PACKS.find((pack) => pack.credits === credits);
}

/** Type guard: is the product a per-month subscription? */
export function isSubscription(product: Product): product is SubscriptionProduct {
  return product.kind === 'subscription';
}

/** Type guard: is the product an Intelligence Credit pack? */
export function isCreditPack(product: Product): product is CreditPackProduct {
  return product.kind === 'credit-pack';
}
