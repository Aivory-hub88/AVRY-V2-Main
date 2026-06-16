/**
 * Payment Types
 * Type definitions for payment-related functionality
 */

// Product types
export interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'one-time' | 'subscription';
}

// Credit products
export interface CreditProduct {
  amount: number;
  price: number;
}

// Payment transaction
export interface PaymentTransaction {
  id: string;
  product: PaymentProduct;
  status: 'pending' | 'success' | 'failed';
  midtransTransactionId: string;
  createdAt: string;
  completedAt: string | null;
}

// Payment response
export interface PaymentResponse {
  success: boolean;
  token: string;
  redirectUrl: string | null;
}

// Midtrans payment result
export interface MidtransPaymentResult {
  transaction_id: string;
  order_id: string;
  transaction_status: 'capture' | 'settlement' | 'pending' | 'deny' | 'expire' | 'cancel';
  fraud_status?: 'accept' | 'challenge' | 'deny';
  payment_type?: string;
  transaction_time?: string;
  gross_amount?: string;
  status_message?: string;
  status_code?: string;
}

// Payment method types
export type PaymentMethod = 'midtrans' | 'manual';

// Payment options
export interface PaymentOptions {
  product: string | number;
  amount: number;
  method: PaymentMethod;
}

// Payment event types
export type PaymentEvent = 'success' | 'pending' | 'failure';

// Payment listener callback
export interface PaymentListener {
  (result: PaymentResult): void;
}

export interface PaymentResult {
  status: PaymentEvent;
  result: PaymentTransactionResult;
}

export interface PaymentTransactionResult {
  product: string | number;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id: string;
  order_id?: string;
  error?: string;
}

// Payment configuration
export interface PaymentConfig {
  snapshotPrice: number;
  blueprintPrice: number;
  fullStackPrice: number;
  foundationPrice: number;
  proPrice: number;
  enterprisePrice: number;
  creditPrices: Record<number, number>;
  products: {
    SNAPSHOT: string;
    BLUEPRINT: string;
    FULL_STACK: string;
    FOUNDATION: string;
    PRO: string;
    ENTERPRISE: string;
  };
  credits: number[];
  paymentMethods: {
    MIDTRANS: 'midtrans';
    MANUAL: 'manual';
  };
}

// Window extensions for payment-related properties
declare global {
  interface Window {
    Snap?: any;
    MIDTRANS_CLIENT_KEY?: string;
    MIDTRANS_IS_PRODUCTION?: boolean;
    currentPaymentProduct?: string | number;
    currentPaymentAmount?: number;
    paymentListeners?: ((result: PaymentResult) => void)[];
  }
}

export {};
