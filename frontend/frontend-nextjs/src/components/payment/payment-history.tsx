/**
 * Payment History Display Component
 * 
 * Displays a list of payment transactions with status indicators,
 * transaction details, and payment method information.
 * 
 * @example
 * <PaymentHistory 
 *   payments={payments} 
 *   loading={loading}
 *   onRefresh={fetchPayments}
 * />
 */

import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface Payment {
  paymentId: string;
  orderId: string;
  product: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'verified' | 'rejected';
  paymentMethod: 'midtrans' | 'manual';
  paymentMethodDetail?: string;
  transactionId?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface PaymentHistoryProps {
  payments: Payment[];
  loading?: boolean;
  onRefresh?: () => void;
}

/**
 * Get product display name
 * @param product - Product ID
 * @returns Human-readable product name
 */
function getProductName(product: string): string {
  const productNames: Record<string, string> = {
    ai_snapshot: 'AI Snapshot',
    ai_blueprint: 'AI Blueprint',
    foundation: 'Foundation Plan',
    pro: 'Pro Plan',
    enterprise: 'Enterprise Plan',
  };
  return productNames[product] || product;
}

/**
 * Get status display information
 * @param status - Payment status
 * @returns Object with status label and color class
 */
function getStatusInfo(status: Payment['status']) {
  const statusInfo: Record<Payment['status'], { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-warning text-bg-primary' },
    success: { label: 'Success', color: 'bg-success text-bg-primary' },
    failed: { label: 'Failed', color: 'bg-error text-white' },
    verified: { label: 'Verified', color: 'bg-success text-bg-primary' },
    rejected: { label: 'Rejected', color: 'bg-error text-white' },
  };
  return statusInfo[status];
}

/**
 * Get payment method display name
 * @param method - Payment method
 * @param detail - Optional payment method detail
 * @returns Human-readable payment method name
 */
function getPaymentMethodName(method: Payment['paymentMethod'], detail?: string): string {
  if (method === 'midtrans') {
    return 'Credit Card / Bank Transfer (Midtrans)';
  }
  if (method === 'manual') {
    const methodNames: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      ewallet: 'E-Wallet',
    };
    return methodNames[detail || ''] || 'Manual Payment';
  }
  return method;
}

/**
 * Payment History component
 * 
 * @param payments - Array of payment transactions
 * @param loading - Whether payments are loading
 * @param onRefresh - Callback to refresh payments
 * 
 * @returns React component
 */
export function PaymentHistory({ 
  payments, 
  loading, 
  onRefresh 
}: PaymentHistoryProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (loading && payments.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white">Payment History</h2>
        {onRefresh && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Refresh
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-bg-tertiary mb-4">
            <svg
              className="w-8 h-8 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <p className="text-gray-200">No payment history yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const statusInfo = getStatusInfo(payment.status);
            return (
              <div
                key={payment.paymentId}
                className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-5 hover:border-white/[0.15] transition-colors duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left side - Product and Status */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-white">
                        {getProductName(payment.product)}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">Order ID:</span>
                        <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs">
                          {payment.orderId}
                        </code>
                      </div>
                      {payment.transactionId && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Transaction ID:</span>
                          <span className="font-mono text-xs">{payment.transactionId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">Payment Method:</span>
                        <span className="text-sm">
                          {getPaymentMethodName(payment.paymentMethod, payment.paymentMethodDetail)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">Date:</span>
                        <span>
                          {new Date(payment.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {payment.verifiedAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Verified:</span>
                          <span>
                            {new Date(payment.verifiedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Amount */}
                  <div className="flex items-center md:justify-end">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        ${payment.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh Button (if no payments) */}
      {onRefresh && payments.length === 0 && (
        <div className="flex justify-center pt-6">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Refresh Payments
          </Button>
        </div>
      )}
    </Card>
  );
}

export default PaymentHistory;
