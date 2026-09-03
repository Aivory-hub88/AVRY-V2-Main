/**
 * Midtrans Snap SDK Integration
 * Provides functions to interact with the Midtrans payment gateway
 */

import { getToken, getUser, isAuthenticated, login } from './auth';
import type { PaymentConfig, PaymentResult, PaymentTransactionResult, PaymentMethod } from '@/types/payment';
import {
  ALL_PRODUCTS,
  CREDIT_PACKS,
  PRODUCT_IDS,
  getProductById,
  getProductPrice,
} from './pricing';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { PaymentConfig, PaymentResult, PaymentTransactionResult, PaymentMethod } from '@/types/payment';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Resolve a product price from the pricing config (single source of truth).
 * Throws if the id is unknown so that a missing/renamed product is caught at
 * module-load time rather than silently producing `undefined` prices.
 * @param id - The pricing-config product id
 * @returns The authoritative price from `pricing.ts`
 */
function requirePrice(id: string): number {
  const price = getProductPrice(id);
  if (price === undefined) {
    throw new Error(
      `payment.ts: no price found in pricing.ts for product id "${id}". ` +
        `The payment module must stay reconciled with the pricing single source of truth.`
    );
  }
  return price;
}

/**
 * Payment configuration.
 *
 * Every price and product id is sourced from the pricing single source of
 * truth (`pricing.ts`) rather than hard-coded here, so the payment module can
 * never silently diverge from the published homepage prices. The corrected
 * subscription prices (Operational $39, Business $99) and the Full Stack
 * product all flow in from `pricing.ts`. Enterprise is sales-assisted and has
 * no self-serve price, so it is not part of this config.
 */
export const PAYMENT_CONFIG: PaymentConfig = {
  // One-time product prices (USD) — sourced from pricing.ts
  snapshotPrice: requirePrice(PRODUCT_IDS.DEEP_DIAGNOSTIC),
  blueprintPrice: requirePrice(PRODUCT_IDS.BLUEPRINT),
  fullStackPrice: requirePrice(PRODUCT_IDS.FULL_STACK),
  // Subscription prices — sourced from pricing.ts
  operationalPrice: requirePrice(PRODUCT_IDS.OPERATIONAL),
  businessPrice: requirePrice(PRODUCT_IDS.BUSINESS),
  // Credit prices — derived from the pricing.ts credit packs
  creditPrices: CREDIT_PACKS.reduce<Record<number, number>>((map, pack) => {
    map[pack.credits] = pack.price;
    return map;
  }, {}),

  // Product IDs — aligned with pricing.ts PRODUCT_IDS
  products: {
    SNAPSHOT: PRODUCT_IDS.DEEP_DIAGNOSTIC,
    BLUEPRINT: PRODUCT_IDS.BLUEPRINT,
    FULL_STACK: PRODUCT_IDS.FULL_STACK,
    OPERATIONAL: PRODUCT_IDS.OPERATIONAL,
    BUSINESS: PRODUCT_IDS.BUSINESS,
  },

  // Credit products — derived from the pricing.ts credit packs
  credits: CREDIT_PACKS.map((pack) => pack.credits),

  // Payment methods
  paymentMethods: {
    MIDTRANS: 'midtrans',
    MANUAL: 'manual',
  },
};

// ============================================================================
// PRICING RECONCILIATION (pricing.ts is authoritative)
// ============================================================================

/** A single divergence between a downstream catalog and the pricing config. */
export interface ReconciliationDiscrepancy {
  /** The product id under comparison. */
  productId: string;
  /** Which catalog the divergence was found in. */
  source: 'payment' | 'backend' | 'midtrans';
  /** The field that differs. */
  field: 'name' | 'price' | 'id';
  /** The value found in the downstream catalog. */
  found: string | number | undefined;
  /** The authoritative value from pricing.ts (retained as published). */
  expected: string | number | undefined;
}

/** The result of reconciling a downstream catalog against pricing.ts. */
export interface ReconciliationResult {
  /** True when no divergence was found. */
  reconciled: boolean;
  /** Every divergent field discovered, identified by product id. */
  discrepancies: ReconciliationDiscrepancy[];
}

/**
 * A minimal product definition as published by a downstream catalog
 * (the payment module, the backend product catalog, or the Midtrans item
 * definitions). Only the reconciled fields are required.
 */
export interface CatalogProductDefinition {
  id: string;
  name?: string;
  price?: number;
}

/**
 * Reconcile a downstream product catalog against the pricing single source of
 * truth (`pricing.ts`).
 *
 * For every product id in `pricing.ts`, the matching downstream definition is
 * compared on `name` and `price`; any divergence is reported (by product id,
 * with the differing field). Any downstream product whose id is absent from
 * `pricing.ts` is also reported as an `id` divergence. The authoritative
 * pricing-config value is always RETAINED as the published price — this check
 * only surfaces divergence, it never mutates pricing.
 *
 * @param definitions - The downstream product definitions to check
 * @param source - Which catalog the definitions came from
 * @returns The reconciliation result with any discrepancies found
 */
export function reconcileCatalog(
  definitions: CatalogProductDefinition[],
  source: ReconciliationDiscrepancy['source']
): ReconciliationResult {
  const discrepancies: ReconciliationDiscrepancy[] = [];
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  // 1. Every pricing.ts product must match the downstream definition.
  for (const product of ALL_PRODUCTS) {
    const definition = byId.get(product.id);
    if (!definition) {
      // Absent downstream — surface as a missing product (id divergence).
      discrepancies.push({
        productId: product.id,
        source,
        field: 'id',
        found: undefined,
        expected: product.id,
      });
      continue;
    }
    if (definition.name !== undefined && definition.name !== product.name) {
      discrepancies.push({
        productId: product.id,
        source,
        field: 'name',
        found: definition.name,
        expected: product.name,
      });
    }
    if (definition.price !== undefined && definition.price !== product.price) {
      discrepancies.push({
        productId: product.id,
        source,
        field: 'price',
        found: definition.price,
        expected: product.price,
      });
    }
  }

  // 2. No downstream product may exist that pricing.ts does not define.
  for (const definition of definitions) {
    if (!getProductById(definition.id)) {
      discrepancies.push({
        productId: definition.id,
        source,
        field: 'id',
        found: definition.id,
        expected: undefined,
      });
    }
  }

  return { reconciled: discrepancies.length === 0, discrepancies };
}

/**
 * Build the payment module's own product definitions (derived from
 * {@link PAYMENT_CONFIG}) for self-reconciliation against pricing.ts.
 * @returns The payment module's published product definitions
 */
function getPaymentCatalogDefinitions(): CatalogProductDefinition[] {
  const definitions: CatalogProductDefinition[] = [
    { id: PAYMENT_CONFIG.products.SNAPSHOT, price: PAYMENT_CONFIG.snapshotPrice },
    { id: PAYMENT_CONFIG.products.BLUEPRINT, price: PAYMENT_CONFIG.blueprintPrice },
    { id: PAYMENT_CONFIG.products.FULL_STACK, price: PAYMENT_CONFIG.fullStackPrice },
    { id: PAYMENT_CONFIG.products.OPERATIONAL, price: PAYMENT_CONFIG.operationalPrice },
    { id: PAYMENT_CONFIG.products.BUSINESS, price: PAYMENT_CONFIG.businessPrice },
  ];
  for (const [credits, price] of Object.entries(PAYMENT_CONFIG.creditPrices)) {
    definitions.push({ id: `credits_${credits}`, price });
  }
  return definitions;
}

/**
 * Reconcile the payment module's own configuration against pricing.ts.
 * @returns The reconciliation result for the payment catalog
 */
export function reconcilePaymentConfig(): ReconciliationResult {
  return reconcileCatalog(getPaymentCatalogDefinitions(), 'payment');
}

/**
 * Format a reconciliation result as a human-readable error message that
 * identifies each divergent product (by id, with the differing field).
 * @param result - The reconciliation result to describe
 * @returns A multi-line description, or an empty string when reconciled
 */
export function describeReconciliation(result: ReconciliationResult): string {
  if (result.reconciled) {
    return '';
  }
  return result.discrepancies
    .map(
      (discrepancy) =>
        `Product "${discrepancy.productId}" (${discrepancy.source}) diverges on ${discrepancy.field}: ` +
        `found ${JSON.stringify(discrepancy.found)}, expected (pricing.ts) ${JSON.stringify(
          discrepancy.expected
        )}.`
    )
    .join('\n');
}

/**
 * Surface a reconciliation error when a downstream catalog (payment module,
 * backend, or Midtrans) diverges from pricing.ts. The pricing-config value is
 * always retained as the published price; this only reports divergence.
 *
 * @param definitions - The downstream product definitions to check
 * @param source - Which catalog the definitions came from
 * @returns The reconciliation result (callers may inspect `discrepancies`)
 */
export function assertCatalogReconciled(
  definitions: CatalogProductDefinition[],
  source: ReconciliationDiscrepancy['source']
): ReconciliationResult {
  const result = reconcileCatalog(definitions, source);
  if (!result.reconciled) {
    console.error(
      `Pricing reconciliation error — ${source} catalog diverges from pricing.ts ` +
        `(pricing.ts retained as published):\n${describeReconciliation(result)}`
    );
  }
  return result;
}

// ============================================================================
// STATE
// ============================================================================

let currentPaymentProduct: string | number | null = null;
let currentPaymentAmount: number | null = null;
let paymentListeners: ((result: PaymentResult) => void)[] = [];

// ============================================================================
// API ENDPOINTS
// ============================================================================

import { getServiceUrl } from "./services";

const API_BASE_URL = getServiceUrl("payments");

/**
 * Headers for an authenticated payments call.
 *
 * Every money-moving route on avry-payments depends on `require_auth`, which
 * reads the bearer token from the Authorization header only — there is no cookie
 * fallback across domains. Omitting this is not a soft failure: checkout 401s
 * before Snap ever opens.
 */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================================================
// MIDTRANS SDK LOADING
// ============================================================================

/**
 * Check if Midtrans Snap SDK is available
 * @returns boolean indicating if Snap is available
 */
/**
 * Resolve the Snap SDK global.
 *
 * snap.js publishes itself as `window.snap`, lower-case — verified against the
 * live production bundle. This module was written against `window.Snap`, which
 * never exists, so every real-gateway call failed the availability check and
 * fell through to the redirect fallback. The capital form is still accepted in
 * case a future bundle publishes both.
 */
function getSnap(): { pay: (token: string, options: Record<string, unknown>) => void } | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    snap?: { pay: (token: string, options: Record<string, unknown>) => void };
    Snap?: { pay: (token: string, options: Record<string, unknown>) => void };
  };
  return w.snap ?? w.Snap;
}

export function isMidtransAvailable(): boolean {
  return typeof getSnap()?.pay === 'function';
}

/**
 * Load Midtrans Snap SDK dynamically
 * @param clientKey - Midtrans client key
 * @returns Promise that resolves when SDK is loaded
 */
export async function loadMidtransSnap(clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (isMidtransAvailable()) {
      console.log('Midtrans Snap SDK already loaded');
      resolve();
      return;
    }

    // Validate client key
    if (!clientKey || clientKey.includes('<your-client-key>')) {
      console.warn('Midtrans client key not configured');
      reject(new Error('Midtrans client key not configured'));
      return;
    }

    // Load Snap SDK from Midtrans
    const script = document.createElement('script');
    script.src = 'https://app.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => {
      console.log('✓ Midtrans Snap SDK loaded with client key');
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load Midtrans Snap SDK');
      reject(new Error('Failed to load Midtrans Snap SDK'));
    };
    document.head.appendChild(script);
  });
}

// ============================================================================
// PAYMENT INITIALIZATION
// ============================================================================

/**
 * Fetch Midtrans client key from backend
 * @returns Promise that resolves with client key data
 */
export async function fetchMidtransClientKey(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/client-key`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.client_key) {
        console.log('✓ Midtrans client key fetched from backend');
        // Store client key for later use
        if (typeof window !== 'undefined') {
          window.MIDTRANS_CLIENT_KEY = data.client_key;
          window.MIDTRANS_IS_PRODUCTION = data.is_production || false;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch Midtrans client key:', error);
    // Continue without client key (will use fallback)
  }
}

// ============================================================================
// PAYMENT FLOW
// ============================================================================

/**
 * Get payment amount for a product
 * @param product - Product ID or name
 * @returns Price in USD
 */
export function getPaymentAmount(product: string | number): number | null {
  if (typeof product === 'number') {
    // Credit product
    return PAYMENT_CONFIG.creditPrices[product] || null;
  }

  // The product catalogue is the authority and already knows every id,
  // including the `credits_<n>` packs. Those only used to resolve when the
  // caller passed a bare number, so the dashboard's credit handoff — which
  // sends the string id, like every other product — fell through to the
  // default branch and was rejected as an invalid product.
  const catalogued = getProductPrice(product);
  if (typeof catalogued === 'number') {
    return catalogued;
  }

  // Kept for ids the catalogue does not carry under that exact key.
  switch (product) {
    case PAYMENT_CONFIG.products.SNAPSHOT:
      return PAYMENT_CONFIG.snapshotPrice;
    case PAYMENT_CONFIG.products.BLUEPRINT:
      return PAYMENT_CONFIG.blueprintPrice;
    case PAYMENT_CONFIG.products.FULL_STACK:
      return PAYMENT_CONFIG.fullStackPrice;
    case PAYMENT_CONFIG.products.OPERATIONAL:
      return PAYMENT_CONFIG.operationalPrice;
    case PAYMENT_CONFIG.products.BUSINESS:
      return PAYMENT_CONFIG.businessPrice;
    default:
      console.error('Invalid product:', product);
      return null;
  }
}

/**
 * Check if user can make a payment (authenticated and has valid user_id)
 * @returns boolean indicating if payment is allowed
 */
export function canMakePayment(): boolean {
  if (!isAuthenticated()) {
    console.log('User not authenticated');
    return false;
  }

  const user = getUser();
  if (!user || !user.user_id) {
    console.error('User missing user_id:', user);
    return false;
  }

  return true;
}

/**
 * Create payment transaction with backend
 * @param product - Product ID or name
 * @returns Payment transaction data
 */
export async function createPaymentTransaction(
  product: string | number,
  /**
   * Snap channel(s) to open on, e.g. `['qris']`. Whatever the customer already
   * picked on our own page, so Snap does not ask them to choose a second time.
   * The service validates these against its own allowlist and ignores anything
   * it does not recognise, so a stale value degrades to "show every channel"
   * rather than failing the transaction.
   */
  enabledPayments?: string[]
) {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated');
  }

  const user = getUser();
  if (!user || !user.user_id) {
    throw new Error('User account not properly configured');
  }

  const amount = getPaymentAmount(product);
  if (amount === null) {
    throw new Error('Invalid product selected');
  }

  // Credit packs are addressed by count in this module (`openPaymentModal(500)`)
  // but the API's `product` is a string, and pydantic v2 does not coerce a number
  // into one — sending the raw count 422s before checkout can open.
  const productId = typeof product === 'number' ? `credits_${product}` : product;

  // handlePaymentSuccess/Pending/Failure (Snap's callbacks, below) read these
  // module-level fields. openPaymentModal used to be the only caller and set
  // them itself, so a caller that skips it — like CheckoutForm's
  // runRealPayment, which calls this function directly — left both null and
  // handlePaymentSuccess silently no-op'd: confirmPayment() never fired and
  // the order sat waiting on the Midtrans webhook instead of settling
  // immediately. Setting them here covers every caller uniformly.
  currentPaymentProduct = productId;
  currentPaymentAmount = amount;

  // No amount is sent: the payments service prices the product from its own
  // catalogue, so a browser cannot name its own price.
  const response = await fetch(`${API_BASE_URL}/api/v1/payments/midtrans/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      user_id: user.user_id,
      product: productId,
      customer_email: user.email,
      customer_first_name: user.email.split('@')[0],
      ...(enabledPayments?.length ? { enabled_payments: enabledPayments } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create transaction');
  }

  const result = await response.json();

  if (!result.success || !result.token) {
    throw new Error('Failed to get payment token');
  }

  return result;
}

export interface DirectChargeResult {
  success: boolean;
  order_id?: string;
  channel?: string;
  transaction_status?: string;
  expiry_time?: string;
  amount_idr?: number;
  /** Exactly one of these is set, depending on the channel. */
  qr_string?: string | null;
  qr_url?: string | null;
  deeplink_url?: string | null;
  va_number?: string | null;
  va_bank?: string | null;
  biller_code?: string | null;
  redirect_url?: string | null;
  error?: string;
  /** Core API has no payment_type for this channel (DANA) — use Snap. */
  fallback_to_snap?: boolean;
}

/**
 * Charge through Core API so the payment is drawn on our own page instead of
 * inside Snap's popup.
 *
 * Returns the one render field the chosen channel needs — a QR string, an app
 * deeplink, or a virtual-account number. `fallback_to_snap` comes back for a
 * channel Core API cannot serve (DANA), and the caller should run the Snap path
 * for it rather than showing an error.
 *
 * Card is not routed here: it needs Midtrans' browser tokenisation library
 * first, which is a separate step.
 */
export async function createDirectCharge(
  product: string | number,
  channel: string,
  /** Single-use card token from the browser. Required for `credit_card`. */
  cardTokenId?: string,
): Promise<DirectChargeResult> {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated');
  }

  const user = getUser();
  if (!user || !user.user_id) {
    throw new Error('User account not properly configured');
  }

  const productId = typeof product === 'number' ? `credits_${product}` : product;

  // Same reason as createPaymentTransaction: the webhook-settlement helpers
  // read these module-level fields, and a caller that leaves them null makes
  // confirmPayment() a silent no-op.
  currentPaymentProduct = productId;
  currentPaymentAmount = getPaymentAmount(product);

  // No amount is sent — the payments service prices from its own catalogue.
  const response = await fetch(`${API_BASE_URL}/api/v1/payments/midtrans/charge`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      user_id: user.user_id,
      product: productId,
      channel,
      customer_email: user.email,
      customer_first_name: user.email.split('@')[0],
      ...(cardTokenId ? { card_token_id: cardTokenId } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to start the payment');
  }

  return (await response.json()) as DirectChargeResult;
}

/**
 * File an out-of-band ("manual") payment for admin verification.
 *
 * This does NOT record a completed payment. The customer is declaring that they
 * transferred the money; the order is created as `awaiting_verification` and an
 * admin approves it against the bank statement, at which point the same
 * entitlement grant the Midtrans path uses is applied.
 *
 * It previously posted to `/payments/record`, an admin-only endpoint that also
 * takes query parameters — so from a customer's browser it could only ever fail.
 *
 * @param product - Product ID or name
 * @param paymentMethod - Payment method (bank_transfer, cash, ewallet)
 * @param transactionId - The customer's bank/e-wallet reference
 * @returns The created order (order_id, status, priced amount)
 */
export async function recordManualPayment(
  product: string | number,
  paymentMethod: string,
  transactionId: string
) {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated');
  }

  const user = getUser();
  if (!user || !user.user_id) {
    throw new Error('User account not properly configured');
  }

  const productId = typeof product === 'number' ? `credits_${product}` : product;

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/manual/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      product: productId,
      payment_method: paymentMethod,
      transaction_reference: transactionId,
      customer_email: user.email,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to submit payment for verification');
  }

  return response.json();
}

/**
 * Ask the payments service to settle an order the customer just paid.
 *
 * Only the order id is sent; the service re-verifies the payment with Midtrans
 * and applies the entitlement at most once, so calling this while the webhook is
 * in flight is harmless. Without it, access appears only once the webhook lands.
 */
export async function confirmPayment(
  orderId: string
): Promise<{ success: boolean; granted: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, granted: false, message: data?.detail };
    }
    return {
      success: Boolean(data.success),
      granted: Boolean(data.granted),
      message: data.message,
    };
  } catch (error) {
    // The webhook is the backstop, so a failed confirm delays access rather
    // than losing it.
    return {
      success: false,
      granted: false,
      message: error instanceof Error ? error.message : 'Confirmation failed',
    };
  }
}

// ============================================================================
// MIDTRANS PAYMENT
// ============================================================================

/**
 * Start Midtrans Snap payment
 * @param token - Payment token from backend
 * @returns Promise that resolves with payment result
 */
export async function startMidtransSnap(token: string): Promise<any> {
  const snap = getSnap();
  if (!snap) {
    throw new Error('Midtrans Snap SDK not loaded');
  }

  return new Promise((resolve, reject) => {
    snap.pay(token, {
      // Optional: Callback functions
      onSuccess: (result: any) => {
        console.log('Payment successful:', result);
        handlePaymentSuccess(result);
        resolve(result);
      },
      onPending: (result: any) => {
        console.log('Payment pending:', result);
        handlePaymentPending(result);
        resolve(result);
      },
      // Snap's callback is `onError`, not `onFailure`. The SDK validates the
      // options object and throws "Unsupported option onFailure" outright, so
      // the popup never opened at all — this was not a missed failure path, it
      // broke every payment. Latent until now because the real gateway path had
      // never actually run.
      onError: (result: any) => {
        console.log('Payment failed:', result);
        handlePaymentFailure(result);
        reject(result);
      },
      onClose: () => {
        console.log('Payment modal closed');
        reject(new Error('Payment closed'));
      },
    });
  });
}

// ============================================================================
// PAYMENT EVENT HANDLERS
// ============================================================================

/**
 * Handle successful payment
 * @param result - Payment result from Midtrans
 */
function handlePaymentSuccess(result: any): void {
  if (currentPaymentProduct === null || currentPaymentAmount === null) {
    console.error('Payment product or amount is null');
    return;
  }

  // Settle immediately so access appears now rather than whenever Midtrans'
  // webhook arrives. Fire-and-forget: the webhook still settles the order if
  // this call fails, and the grant is idempotent on the order id.
  if (result?.order_id) {
    void confirmPayment(result.order_id).then((confirmed) => {
      if (!confirmed.granted) {
        console.warn(
          'Payment not yet applied; awaiting gateway notification:',
          confirmed.message
        );
      }
    });
  }

  notifyPaymentSuccess({
    product: currentPaymentProduct,
    amount: currentPaymentAmount,
    payment_method: PAYMENT_CONFIG.paymentMethods.MIDTRANS,
    transaction_id: result.transaction_id,
    order_id: result.order_id,
  });
}

/**
 * Handle pending payment
 * @param result - Payment result from Midtrans
 */
function handlePaymentPending(result: any): void {
  if (currentPaymentProduct === null || currentPaymentAmount === null) {
    console.error('Payment product or amount is null');
    return;
  }
  
  notifyPaymentPending({
    product: currentPaymentProduct,
    amount: currentPaymentAmount,
    payment_method: PAYMENT_CONFIG.paymentMethods.MIDTRANS,
    transaction_id: result.transaction_id,
    order_id: result.order_id,
  });
}

/**
 * Handle payment failure
 * @param result - Payment result from Midtrans
 */
function handlePaymentFailure(result: any): void {
  if (currentPaymentProduct === null || currentPaymentAmount === null) {
    console.error('Payment product or amount is null');
    return;
  }
  
  notifyPaymentFailure({
    product: currentPaymentProduct,
    amount: currentPaymentAmount,
    payment_method: PAYMENT_CONFIG.paymentMethods.MIDTRANS,
    transaction_id: result.transaction_id,
    order_id: result.order_id,
    error: result.status_message,
  });
}

// ============================================================================
// PAYMENT LISTENERS
// ============================================================================

/**
 * Subscribe to payment events
 * @param callback - Callback function with payment result
 */
export function onPayment(callback: (result: PaymentResult) => void): void {
  paymentListeners.push(callback);
}

/**
 * Notify listeners of payment success
 * @param paymentResult - Payment result data
 */
function notifyPaymentSuccess(paymentResult: PaymentTransactionResult): void {
  paymentListeners.forEach((callback) => {
    try {
      callback({ status: 'success', result: paymentResult });
    } catch (error) {
      console.error('Payment listener error:', error);
    }
  });
}

/**
 * Notify listeners of payment pending
 * @param paymentResult - Payment result data
 */
function notifyPaymentPending(paymentResult: PaymentTransactionResult): void {
  paymentListeners.forEach((callback) => {
    try {
      callback({ status: 'pending', result: paymentResult });
    } catch (error) {
      console.error('Payment listener error:', error);
    }
  });
}

/**
 * Notify listeners of payment failure
 * @param paymentResult - Payment result data
 */
function notifyPaymentFailure(paymentResult: PaymentTransactionResult): void {
  paymentListeners.forEach((callback) => {
    try {
      callback({ status: 'failure', result: paymentResult });
    } catch (error) {
      console.error('Payment listener error:', error);
    }
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get payment configuration
 * @returns Payment configuration object
 */
export function getPaymentConfig(): PaymentConfig {
  return PAYMENT_CONFIG;
}

/**
 * Get available credit products
 * @returns Array of credit amounts
 */
export function getCreditProducts(): number[] {
  return PAYMENT_CONFIG.credits;
}

/**
 * Get credit price for amount
 * @param amount - Credit amount
 * @returns Price in USD
 */
export function getCreditPrice(amount: number): number | null {
  return PAYMENT_CONFIG.creditPrices[amount] || null;
}

// ============================================================================
// PAYMENT MODAL
// ============================================================================

/**
 * Open payment modal for a specific product
 * @param product - Product to purchase (ai_snapshot, ai_blueprint, operational, business, or credit amount)
 */
export async function openPaymentModal(product: string | number): Promise<void> {
  console.log('PaymentModal: Opening for product:', product);
  
  currentPaymentProduct = product;
  
  // Set price based on product type
  if (product === PAYMENT_CONFIG.products.SNAPSHOT) {
    currentPaymentAmount = PAYMENT_CONFIG.snapshotPrice;
  } else if (product === PAYMENT_CONFIG.products.BLUEPRINT) {
    currentPaymentAmount = PAYMENT_CONFIG.blueprintPrice;
  } else if (product === PAYMENT_CONFIG.products.FULL_STACK) {
    currentPaymentAmount = PAYMENT_CONFIG.fullStackPrice;
  } else if (product === PAYMENT_CONFIG.products.OPERATIONAL) {
    currentPaymentAmount = PAYMENT_CONFIG.operationalPrice;
  } else if (product === PAYMENT_CONFIG.products.BUSINESS) {
    currentPaymentAmount = PAYMENT_CONFIG.businessPrice;
  } else if (typeof product === 'number') {
    currentPaymentAmount = PAYMENT_CONFIG.creditPrices[product];
    currentPaymentProduct = `credits_${product}`;
  } else {
    console.error('Invalid product:', product);
    alert('Invalid product selected');
    return;
  }
  
  // Check authentication - user must be registered
  if (!isAuthenticated()) {
    console.log('User not authenticated, showing login modal');
    alert('Please log in to access payment options');
    // Dispatch event to open login modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('openLoginModal'));
    }
    return;
  }
  
  // Verify user has valid user_id
  const user = getUser();
  if (!user || !user.user_id) {
    console.error('User missing user_id:', user);
    alert('User account not properly configured. Please log in again.');
    return;
  }
  
  try {
    // Create transaction with backend
    const result = await createPaymentTransaction(product);
    
    if (!result.success || !result.token) {
      throw new Error('Failed to get payment token');
    }
    
    // Check if Midtrans Snap SDK is available
    if (isMidtransAvailable()) {
      // Use Midtrans Snap directly
      await startMidtransSnap(result.token);
    } else if (window.MIDTRANS_CLIENT_KEY) {
      // Load Snap SDK with client key from backend
      try {
        await loadMidtransSnap(window.MIDTRANS_CLIENT_KEY);
        // Wait a moment for SDK to load
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await startMidtransSnap(result.token);
      } catch (loadError) {
        console.warn('Failed to load Snap SDK:', loadError);
        // Fallback: Show redirect URL if available
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        }
      }
    } else {
      // Fallback: Show redirect URL if available
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      }
    }
  } catch (error) {
    console.error('Payment initialization failed:', error);
    alert(error instanceof Error ? error.message : 'Payment failed. Please try again.');
  }
}
