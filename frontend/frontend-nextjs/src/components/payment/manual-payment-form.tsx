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

  /**
   * Field ids are kebab-case for the DOM; state keys are camelCase. The two were
   * previously bridged by `[e.target.name]: value`, which wrote a
   * `"transaction-id"` key that nothing reads — so both controlled inputs were
   * frozen at their initial values and every submission carried an empty
   * transaction reference.
   */
  const FIELD_KEYS: Record<string, keyof ManualPaymentFormData> = {
    'transaction-id': 'transactionId',
    'payment-method': 'paymentMethod',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = FIELD_KEYS[name] ?? (name as keyof ManualPaymentFormData);
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // A rejected file is cleared from the input, not just from state —
      // otherwise the control keeps showing the file it refused, and the user has
      // an error message next to what looks like a valid selection.
      const reject = (message: string) => {
        setError(message);
        e.target.value = '';
      };

      // Validate file type
      if (!file.type.startsWith('image/')) {
        reject('Please upload an image file (PNG, JPG, etc.)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject('File size must be less than 5MB');
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

    // Checked here, not left to the input's `required`: browser validation is
    // skipped on a programmatic submit, and the reference is what an admin
    // matches against the bank statement — an empty one is unverifiable.
    if (!formData.transactionId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

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
      <p className="text-sm text-gray-400 mb-6">
        Send proof of payment to our team for manual verification.
        <br />
        <span className="text-brand-mint">Amount: ${amount.toFixed(2)} for {product}</span>
      </p>

      {/*
        `aria-label` so the element exposes the `form` role — an unnamed <form> is
        a generic region to assistive tech.

        `noValidate` because native constraint validation suppresses the submit
        event when a `required` field is empty: the fields keep `required` for
        semantics, while `handleSubmit` decides what the user is told, so the
        message is the same whether submission came from a click or from code.
      */}
      <form
        onSubmit={handleSubmit}
        aria-label="Manual payment"
        noValidate
        className="space-y-4"
      >
        {/* Payment Proof Upload */}
        <div className="space-y-2">
          <label htmlFor="payment-proof" className="block text-sm font-medium text-gray-300">
            Payment Proof / Screenshot
          </label>
          <div className="relative">
            <input
              type="file"
              id="payment-proof"
              name="payment-proof"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-mint file:text-bg-primary
                hover:file:bg-brand-mint-hover
                cursor-pointer
              "
            />
            {formData.paymentProof && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {formData.paymentProof.name}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Accepted formats: PNG, JPG, JPEG (max 5MB)
          </p>
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <label htmlFor="transaction-id" className="block text-sm font-medium text-gray-300">
            Transaction ID / Reference Number
          </label>
          <input
            type="text"
            id="transaction-id"
            name="transaction-id"
            value={formData.transactionId}
            onChange={handleInputChange}
            placeholder="Enter transaction ID"
            // Kept for semantics (screen readers announce the field as required),
            // but the form is `noValidate` so the message shown is ours — see the
            // form element below.
            required
            aria-invalid={Boolean(error) && !formData.transactionId.trim()}
            className="w-full px-4 py-2 bg-bg-tertiary border border-border-default 
              rounded-lg text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent
              transition-all duration-200
            "
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label htmlFor="payment-method" className="block text-sm font-medium text-gray-300">
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
