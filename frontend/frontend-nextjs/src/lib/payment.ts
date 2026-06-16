/**
 * Midtrans Snap SDK Integration
 * Provides functions to interact with the Midtrans payment gateway
 */

import { getUser, isAuthenticated, login } from './auth';
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
 * subscription prices (Foundation 20, Pro 44, Enterprise 499) and the Full
 * Stack product ($99) all flow in from `pricing.ts`.
 */
export const PAYMENT_CONFIG: PaymentConfig = {
  // One-time product prices (USD) — sourced from pricing.ts
  snapshotPrice: requirePrice(PRODUCT_IDS.DEEP_DIAGNOSTIC),
  blueprintPrice: requirePrice(PRODUCT_IDS.BLUEPRINT),
  fullStackPrice: requirePrice(PRODUCT_IDS.FULL_STACK),
  // Subscription prices — sourced from pricing.ts
  foundationPrice: requirePrice(PRODUCT_IDS.FOUNDATION),
  proPrice: requirePrice(PRODUCT_IDS.PRO),
  enterprisePrice: requirePrice(PRODUCT_IDS.ENTERPRISE),
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
    FOUNDATION: PRODUCT_IDS.FOUNDATION,
    PRO: PRODUCT_IDS.PRO,
    ENTERPRISE: PRODUCT_IDS.ENTERPRISE,
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
    { id: PAYMENT_CONFIG.products.FOUNDATION, price: PAYMENT_CONFIG.foundationPrice },
    { id: PAYMENT_CONFIG.products.PRO, price: PAYMENT_CONFIG.proPrice },
    { id: PAYMENT_CONFIG.products.ENTERPRISE, price: PAYMENT_CONFIG.enterprisePrice },
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

// ============================================================================
// MIDTRANS SDK LOADING
// ============================================================================

/**
 * Check if Midtrans Snap SDK is available
 * @returns boolean indicating if Snap is available
 */
export function isMidtransAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.Snap !== 'undefined';
}

/**
 * Load Midtrans Snap SDK dynamically
 * @param clientKey - Midtrans client key
 * @returns Promise that resolves when SDK is loaded
 */
export async function loadMidtransSnap(clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window.Snap !== 'undefined') {
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

  switch (product) {
    case PAYMENT_CONFIG.products.SNAPSHOT:
      return PAYMENT_CONFIG.snapshotPrice;
    case PAYMENT_CONFIG.products.BLUEPRINT:
      return PAYMENT_CONFIG.blueprintPrice;
    case PAYMENT_CONFIG.products.FULL_STACK:
      return PAYMENT_CONFIG.fullStackPrice;
    case PAYMENT_CONFIG.products.FOUNDATION:
      return PAYMENT_CONFIG.foundationPrice;
    case PAYMENT_CONFIG.products.PRO:
      return PAYMENT_CONFIG.proPrice;
    case PAYMENT_CONFIG.products.ENTERPRISE:
      return PAYMENT_CONFIG.enterprisePrice;
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
export async function createPaymentTransaction(product: string | number) {
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

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/midtrans/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.user_id,
      amount: amount,
      product: product,
      customer_email: user.email,
      customer_first_name: user.email.split('@')[0],
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

/**
 * Record manual payment with backend
 * @param product - Product ID or name
 * @param paymentMethod - Payment method (bank_transfer, cash, ewallet)
 * @param transactionId - Transaction ID from user
 * @returns Payment record data
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

  const amount = getPaymentAmount(product);
  if (amount === null) {
    throw new Error('Invalid product selected');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.user_id,
      amount: amount,
      payment_method: paymentMethod,
      product: product,
      transaction_id: transactionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to record payment');
  }

  return response.json();
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
  if (typeof window.Snap === 'undefined') {
    throw new Error('Midtrans Snap SDK not loaded');
  }

  return new Promise((resolve, reject) => {
    window.Snap.pay(token, {
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
      onFailure: (result: any) => {
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
 * @param product - Product to purchase (ai_snapshot, ai_blueprint, foundation, pro, enterprise, or credit amount)
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
  } else if (product === PAYMENT_CONFIG.products.FOUNDATION) {
    currentPaymentAmount = PAYMENT_CONFIG.foundationPrice;
  } else if (product === PAYMENT_CONFIG.products.PRO) {
    currentPaymentAmount = PAYMENT_CONFIG.proPrice;
  } else if (product === PAYMENT_CONFIG.products.ENTERPRISE) {
    currentPaymentAmount = PAYMENT_CONFIG.enterprisePrice;
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
