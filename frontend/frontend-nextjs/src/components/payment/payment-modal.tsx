/**
 * Payment Modal Component
 * 
 * A payment modal component that integrates with Midtrans for payment processing.
 * Supports multiple payment products (snapshot, blueprint, subscriptions, credits)
 * and manual payment recording.
 * 
 * @example
 * // Basic usage
 * <PaymentModal 
 *   isOpen={isPaymentOpen} 
 *   onClose={closePaymentModal} 
 *   product="ai_snapshot"
 * />
 * 
 * // With credit product
 * <PaymentModal 
 *   isOpen={isPaymentOpen} 
 *   onClose={closePaymentModal} 
 *   product={100} // 100 credits
 * />
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ManualPaymentForm } from './manual-payment-form';
import { PaymentHistory } from './payment-history';
import { 
  isMidtransAvailable, 
  loadMidtransSnap, 
  createPaymentTransaction, 
  startMidtransSnap, 
  recordManualPayment,
  getPaymentAmount,
  getPaymentConfig,
  onPayment,
  PaymentResult,
  PaymentTransactionResult,
  PaymentMethod
} from '@/lib/payment';
import { getUser, isAuthenticated } from '@/lib/auth';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: string | number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentModal({ isOpen, onClose, product: initialProduct }: PaymentModalProps) {
  const [product, setProduct] = useState<string | number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [status, setStatus] = useState<{ message: string; type: 'loading' | 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Initialize product and amount when modal opens
  useEffect(() => {
    if (isOpen && initialProduct !== undefined) {
      setProduct(initialProduct);
      const amount = getPaymentAmount(initialProduct);
      setAmount(amount);
    }
  }, [isOpen, initialProduct]);

  // Check authentication when modal opens
  useEffect(() => {
    if (isOpen && !isAuthenticated()) {
      setStatus({
        message: 'Please log in to access payment options',
        type: 'info',
      });
    }
  }, [isOpen]);

  // Handle payment success
  const handlePaymentSuccess = (result: PaymentTransactionResult) => {
    setStatus({
      message: 'Payment processed successfully!',
      type: 'success',
    });
    setPaymentMethod(result.payment_method);
  };

  // Handle payment pending
  const handlePaymentPending = (result: PaymentTransactionResult) => {
    setStatus({
      message: 'Payment is being processed...',
      type: 'info',
    });
    setPaymentMethod(result.payment_method);
  };

  // Handle payment failure
  const handlePaymentFailure = (error: string) => {
    setStatus({
      message: error || 'Payment failed. Please try again.',
      type: 'error',
    });
  };

  // Start Midtrans payment flow
  const startMidtransPayment = async () => {
    if (!product || amount === null) {
      setStatus({
        message: 'Invalid product selected',
        type: 'error',
      });
      return;
    }

    if (!isAuthenticated()) {
      setStatus({
        message: 'Please log in to access payment options',
        type: 'info',
      });
      return;
    }

    setIsProcessing(true);
    setStatus({
      message: 'Connecting to payment gateway...',
      type: 'loading',
    });

    try {
      // Create transaction with backend
      const result = await createPaymentTransaction(product);

      if (!result.token) {
        throw new Error('Failed to get payment token');
      }

      // Check if Midtrans Snap SDK is available
      if (isMidtransAvailable()) {
        // Use Midtrans Snap
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
          setStatus({
            message: 'Redirecting to payment gateway...',
            type: 'info',
          });
          // Show redirect URL
          setRedirectUrl(result.redirect_url || result.token);
        }
      } else {
        // Fallback: Show redirect URL
        setStatus({
          message: 'Redirecting to payment gateway...',
          type: 'info',
        });
        setRedirectUrl(result.redirect_url || result.token);
      }
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      setStatus({
        message: error.message || 'Payment initialization failed',
        type: 'error',
      });
      setIsProcessing(false);
    }
  };

  // Handle manual payment submission
  const handleManualPaymentSubmit = async (data: {
    transactionId: string;
    paymentMethod: 'bank_transfer' | 'cash' | 'ewallet';
    paymentProof?: File;
  }) => {
    if (!product || amount === null) {
      throw new Error('Invalid product selected');
    }

    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    if (!data.transactionId) {
      throw new Error('Please enter a transaction ID');
    }

    setIsProcessing(true);
    setStatus({
      message: 'Submitting payment...',
      type: 'loading',
    });

    try {
      // Record manual payment
      const result = await recordManualPayment(
        product,
        data.paymentMethod,
        data.transactionId
      );

      setStatus({
        message: 'Payment recorded successfully!',
        type: 'success',
      });
      setPaymentMethod('manual');
      setShowManualForm(false);
    } catch (error: any) {
      console.error('Manual payment failed:', error);
      setStatus({
        message: error.message || 'Manual payment failed',
        type: 'error',
      });
      setIsProcessing(false);
      throw error;
    }
  };

  // Handle login redirect
  const handleLogin = () => {
    // Dispatch event to open login modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('openLoginModal'));
    }
  };

  // Get user email for display
  const getUserEmail = (): string => {
    if (!isAuthenticated()) return 'user@aivory.id';
    const user = getUser();
    return user?.email || 'user@aivory.id';
  };

  // Render payment options
  const renderPaymentOptions = () => {
    if (!isAuthenticated()) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-4 text-4xl">🔒</div>
          <h3 className="mb-2 text-lg font-semibold text-text-primary">Authentication Required</h3>
          <p className="mb-6 text-text-secondary">Please log in to access payment options</p>
          <Button onClick={handleLogin} variant="primary">
            Log In
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-4">
          <p className="text-text-secondary">
            Processing payment for: <strong className="text-text-primary">{getUserEmail()}</strong>
          </p>
        </div>

        <h3 className="mb-4 text-center text-lg font-semibold text-text-primary">Select Payment Method</h3>

        <div className="grid gap-4">
          <Button
            onClick={startMidtransPayment}
            disabled={isProcessing}
            variant="primary"
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <span className="font-medium">Credit Card / Bank Transfer (Midtrans)</span>
            </div>
            <span className="font-semibold">${amount}</span>
          </Button>

          <Button
            onClick={() => setShowManualForm(true)}
            disabled={isProcessing}
            variant="secondary"
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏦</span>
              <span className="font-medium">Bank Transfer / Cash (Manual)</span>
            </div>
            <span className="font-semibold">${amount}</span>
          </Button>
        </div>

        <p className="text-center text-sm text-text-tertiary">
          Secure payment powered by Midtrans
        </p>
      </div>
    );
  };

  // Render manual payment form
  const renderManualPaymentForm = () => {
    if (!isAuthenticated() || amount === null || product === null) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-4 text-4xl">🔒</div>
          <h3 className="mb-2 text-lg font-semibold text-text-primary">Authentication Required</h3>
          <p className="mb-6 text-text-secondary">Please log in to access payment options</p>
          <Button onClick={handleLogin} variant="primary">
            Log In
          </Button>
        </div>
      );
    }

    return (
      <ManualPaymentForm
        amount={amount}
        product={typeof product === 'string' ? product : `credits_${product}`}
        onSubmit={handleManualPaymentSubmit}
        onCancel={() => setShowManualForm(false)}
      />
    );
  };

  // Render success state
  const renderSuccess = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-4xl">
          ✓
        </div>
        <h3 className="mb-2 text-xl font-semibold text-text-primary">Payment Successful!</h3>
        <p className="mb-4 text-text-secondary">
          Your payment has been processed successfully.
        </p>
        {paymentMethod === 'midtrans' && (
          <div className="w-full rounded-lg bg-bg-tertiary p-4">
            <p className="mb-2 text-sm text-text-tertiary">
              <strong>Order ID:</strong>{' '}
              {status?.message.includes('Order ID') ? '...' : 'N/A'}
            </p>
            <p className="text-sm text-text-tertiary">
              <strong>Status:</strong>{' '}
              {status?.message.includes('Status') ? '...' : 'N/A'}
            </p>
          </div>
        )}
        <Button onClick={onClose} variant="primary" className="mt-6">
          Close
        </Button>
      </div>
    );
  };

  // Render error state
  const renderError = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/20 text-4xl">
          ✗
        </div>
        <h3 className="mb-2 text-xl font-semibold text-text-primary">Payment Failed</h3>
        <p className="mb-6 text-text-secondary">{status?.message}</p>
        <Button onClick={() => setStatus(null)} variant="primary">
          Try Again
        </Button>
      </div>
    );
  };

  // Render redirect state
  const renderRedirect = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <h3 className="mb-4 text-xl font-semibold text-text-primary">Complete Payment</h3>
        <p className="mb-6 text-text-secondary">
          Please complete your payment on the payment gateway.
        </p>
        {redirectUrl && (
          <div className="w-full max-w-md space-y-4">
            <Button
              onClick={() => window.open(redirectUrl, '_blank')}
              variant="primary"
              className="w-full"
            >
              Go to Payment Gateway
            </Button>
            <p className="text-sm text-text-tertiary">
              Or copy and paste this URL into your browser:
            </p>
            <code className="block rounded bg-bg-tertiary p-3 text-xs text-text-secondary">
              {redirectUrl}
            </code>
            <Button onClick={onClose} variant="secondary" className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  const renderLoading = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 animate-spin rounded-full border-4 border-border-default border-t-brand-mint h-12 w-12"></div>
        <p className="text-text-secondary">{status?.message}</p>
      </div>
    );
  };

  // Render pending state
  const renderPending = () => {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 text-4xl">⏳</div>
        <h3 className="mb-2 text-xl font-semibold text-text-primary">Payment Pending</h3>
        <p className="mb-4 text-text-secondary">
          Your payment is being processed.
        </p>
        <Button onClick={onClose} variant="primary">
          Close
        </Button>
      </div>
    );
  };

  // Render status message
  const renderStatus = () => {
    if (!status) return null;

    switch (status.type) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'loading':
        return renderLoading();
      case 'info':
        if (redirectUrl) {
          return renderRedirect();
        }
        return renderPending();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      title="Complete Payment"
    >
      <div className="min-h-[400px]">
        {/* Render status message if present */}
        {status ? (
          renderStatus()
        ) : showManualForm ? (
          renderManualPaymentForm()
        ) : (
          renderPaymentOptions()
        )}
      </div>
    </Modal>
  );
}

export default PaymentModal;
