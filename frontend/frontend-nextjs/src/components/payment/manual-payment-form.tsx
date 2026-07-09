/**
 * Manual Payment Form Component
 * 
 * A form for users to manually record their payment with proof of payment,
 * transaction ID, and payment method selection.
 * 
 * @example
 * <ManualPaymentForm 
 *   amount={29.99} 
 *   product="ai_snapshot"
 *   onSubmit={handleManualPaymentSubmit}
 *   onCancel={closeModal}
 * />
 */

import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface ManualPaymentFormData {
  transactionId: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'ewallet';
  paymentProof?: File;
}

export interface ManualPaymentFormProps {
  amount: number;
  product: string;
  onSubmit: (data: ManualPaymentFormData) => Promise<void>;
  onCancel: () => void;
}

/**
 * Manual Payment Form component
 * 
 * @param amount - Payment amount
 * @param product - Product being purchased
 * @param onSubmit - Callback when form is submitted
 * @param onCancel - Callback when user cancels
 * 
 * @returns React component
 */
export function ManualPaymentForm({ 
  amount, 
  product, 
  onSubmit, 
  onCancel 
}: ManualPaymentFormProps) {
  const [formData, setFormData] = React.useState<ManualPaymentFormData>({
    transactionId: '',
    paymentMethod: 'bank_transfer',
    paymentProof: undefined,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, etc.)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        paymentProof: file,
      }));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-white mb-2">Manual Payment</h3>
      <p className="text-sm text-gray-200 mb-6">
        Send proof of payment to our team for manual verification.
        <br />
        <span className="text-brand-mint">Amount: ${amount.toFixed(2)} for {product}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Proof Upload */}
        <div className="space-y-2">
          <label htmlFor="payment-proof" className="block text-sm font-medium text-gray-100">
            Payment Proof / Screenshot
          </label>
          <div className="relative">
            <input
              type="file"
              id="payment-proof"
              name="payment-proof"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-200
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-mint file:text-bg-primary
                hover:file:bg-brand-mint-hover
                cursor-pointer
              "
            />
            {formData.paymentProof && (
              <p className="text-xs text-gray-300 mt-1">
                Selected: {formData.paymentProof.name}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-300">
            Accepted formats: PNG, JPG, JPEG (max 5MB)
          </p>
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <label htmlFor="transaction-id" className="block text-sm font-medium text-gray-100">
            Transaction ID / Reference Number
          </label>
          <input
            type="text"
            id="transaction-id"
            name="transaction-id"
            value={formData.transactionId}
            onChange={handleInputChange}
            placeholder="Enter transaction ID"
            required
            className="w-full px-4 py-2 bg-bg-tertiary border border-border-default 
              rounded-lg text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent
              transition-all duration-200
            "
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label htmlFor="payment-method" className="block text-sm font-medium text-gray-100">
            Payment Method
          </label>
          <select
            id="payment-method"
            name="payment-method"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            className="w-full px-4 py-2 bg-bg-tertiary border border-border-default 
              rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-mint 
              focus:border-transparent transition-all duration-200
            "
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="ewallet">E-Wallet</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="flex-1"
          >
            Submit Payment
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default ManualPaymentForm;
