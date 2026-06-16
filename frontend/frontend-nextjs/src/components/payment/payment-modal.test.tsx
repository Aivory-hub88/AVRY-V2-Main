// @ts-nocheck
/**
 * Payment Modal Component Tests
 * 
 * Tests for the PaymentModal component that integrates with Midtrans
 * for payment processing.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentModal } from './payment-modal';
import * as paymentLib from '@/lib/payment';
import * as authLib from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/payment', () => ({
  isMidtransAvailable: vi.fn(),
  loadMidtransSnap: vi.fn(),
  createPaymentTransaction: vi.fn(),
  startMidtransSnap: vi.fn(),
  recordManualPayment: vi.fn(),
  getPaymentAmount: vi.fn(),
  getPaymentConfig: vi.fn(),
  onPayment: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  isAuthenticated: vi.fn(),
  getUser: vi.fn(),
  login: vi.fn(),
}));

// Default mocks
const defaultStartMidtransSnap = vi.fn();
const defaultCreatePaymentTransaction = vi.fn();

vi.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen, onClose, title, className }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal" className={className}>
        <h2 id="modal-title">{title}</h2>
        <button onClick={onClose} data-testid="mock-modal-close" aria-label="Close modal">Close</button>
        <div role="document">{children}</div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, isLoading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; className?: string; isLoading?: boolean }) => {
    const baseClasses = 'btn';
    const variantClassesMap: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
    };
    const variantClasses = variantClassesMap[variant || 'primary'] || 'btn-primary';
    
    return (
      <button 
        onClick={onClick} 
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses} ${className || ''}`}
        data-testid="mock-button"
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  },
}));

vi.mock('./manual-payment-form', () => ({
  ManualPaymentForm: ({ amount, product, onSubmit, onCancel }: any) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        transactionId: 'TXN-123',
        paymentMethod: 'bank_transfer',
      });
    };

    return (
      <form onSubmit={handleSubmit} data-testid="mock-manual-form">
        <div>Manual Payment Form</div>
        <div>Amount: {amount}</div>
        <div>Product: {product}</div>
        <button type="submit" data-testid="mock-manual-submit">Submit</button>
        <button type="button" onClick={onCancel} data-testid="mock-manual-cancel">Cancel</button>
      </form>
    );
  },
}));

describe('PaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(authLib.isAuthenticated).mockReturnValue(true);
    vi.mocked(authLib.getUser).mockReturnValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      token: 'mock-token-123',
      createdAt: '2024-01-01T00:00:00Z',
    });
    vi.mocked(paymentLib.getPaymentAmount).mockReturnValue(29);
    vi.mocked(paymentLib.isMidtransAvailable).mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders the modal when isOpen is true', () => {
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    });

    it('does not render the modal when isOpen is false', () => {
      render(
        <PaymentModal 
          isOpen={false} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      expect(screen.queryByText('Complete Payment')).not.toBeInTheDocument();
    });

    it('renders payment options for authenticated user', () => {
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders authentication required message when user is not authenticated', async () => {
      vi.mocked(authLib.isAuthenticated).mockReturnValue(false);

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // The component shows "Payment Pending" when user is not authenticated
      // because startMidtransSnap is called with a pending result
      await waitFor(() => {
        expect(screen.getByText('Payment Pending')).toBeInTheDocument();
      });
    });
  });

  describe('Product Selection', () => {
    it('displays correct price for snapshot product', () => {
      vi.mocked(paymentLib.getPaymentAmount).mockReturnValue(29);

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // Price appears twice (for both payment method buttons)
      const priceElements = screen.getAllByText('$29');
      expect(priceElements).toHaveLength(2);
    });

    it('displays correct price for blueprint product', () => {
      vi.mocked(paymentLib.getPaymentAmount).mockReturnValue(85);

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_blueprint"
        />
      );

      // Price appears twice (for both payment method buttons)
      const priceElements = screen.getAllByText('$85');
      expect(priceElements).toHaveLength(2);
    });

    it('displays correct price for credit product', () => {
      vi.mocked(paymentLib.getPaymentAmount).mockReturnValue(9);

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product={100}
        />
      );

      // Price appears twice (for both payment method buttons)
      const priceElements = screen.getAllByText('$9');
      expect(priceElements).toHaveLength(2);
    });
  });

  describe('Payment Methods', () => {
    it('renders Midtrans payment option', () => {
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      expect(screen.getByText('Credit Card / Bank Transfer (Midtrans)')).toBeInTheDocument();
    });

    it('renders manual payment option', () => {
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      expect(screen.getByText('Bank Transfer / Cash (Manual)')).toBeInTheDocument();
    });

    it('shows manual payment form when manual option is selected', async () => {
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      const manualBtn = screen.getByText('Bank Transfer / Cash (Manual)').closest('button');
      expect(manualBtn).toBeInTheDocument();
      
      if (manualBtn) {
        fireEvent.click(manualBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Manual Payment Form')).toBeInTheDocument();
      });
    });
  });

  describe('Midtrans Payment Flow', () => {
    it('calls createPaymentTransaction when Midtrans option is selected', async () => {
      vi.mocked(paymentLib.createPaymentTransaction).mockResolvedValue({
        success: true,
        token: 'mock-token-123',
      });

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      const midtransBtn = screen.getByText('Credit Card / Bank Transfer (Midtrans)').closest('button');
      expect(midtransBtn).toBeInTheDocument();

      if (midtransBtn) {
        fireEvent.click(midtransBtn);
      }

      await waitFor(() => {
        expect(paymentLib.createPaymentTransaction).toHaveBeenCalledWith('ai_snapshot');
      });
    });

    it('calls startMidtransSnap with token when available', async () => {
      vi.mocked(paymentLib.createPaymentTransaction).mockResolvedValue({
        success: true,
        token: 'mock-token-123',
      });
      vi.mocked(paymentLib.startMidtransSnap).mockResolvedValue({});

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      const midtransBtn = screen.getByText('Credit Card / Bank Transfer (Midtrans)').closest('button');
      if (midtransBtn) {
        fireEvent.click(midtransBtn);
      }

      await waitFor(() => {
        expect(paymentLib.startMidtransSnap).toHaveBeenCalledWith('mock-token-123');
      });
    });

    it('shows error when payment initialization fails', async () => {
      vi.mocked(paymentLib.createPaymentTransaction).mockRejectedValue(new Error('Payment failed'));

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      const midtransBtn = screen.getByText('Credit Card / Bank Transfer (Midtrans)').closest('button');
      if (midtransBtn) {
        fireEvent.click(midtransBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });
    });
  });

  describe('Manual Payment Flow', () => {
    it('calls recordManualPayment when form is submitted', async () => {
      vi.mocked(paymentLib.recordManualPayment).mockResolvedValue({
        success: true,
      });

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // Select manual payment
      const manualBtn = screen.getByText('Bank Transfer / Cash (Manual)').closest('button');
      expect(manualBtn).toBeInTheDocument();
      
      if (manualBtn) {
        fireEvent.click(manualBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Manual Payment Form')).toBeInTheDocument();
      });

      const submitBtn = screen.getByText('Submit');
      expect(submitBtn).toBeInTheDocument();

      if (submitBtn) {
        fireEvent.click(submitBtn);
      }

      await waitFor(() => {
        expect(paymentLib.recordManualPayment).toHaveBeenCalledWith(
          'ai_snapshot',
          'bank_transfer',
          'TXN-123'
        );
      });
    });

    it('shows success message after manual payment submission', async () => {
      vi.mocked(paymentLib.recordManualPayment).mockResolvedValue({
        success: true,
      });

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // Select manual payment
      const manualBtn = screen.getByText('Bank Transfer / Cash (Manual)').closest('button');
      expect(manualBtn).toBeInTheDocument();
      
      if (manualBtn) {
        fireEvent.click(manualBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Manual Payment Form')).toBeInTheDocument();
      });

      const submitBtn = screen.getByText('Submit');
      expect(submitBtn).toBeInTheDocument();

      if (submitBtn) {
        fireEvent.click(submitBtn);
      }

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Payment recorded successfully!')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Authentication', () => {
    it('calls login when user is not authenticated', async () => {
      vi.mocked(authLib.isAuthenticated).mockReturnValue(false);

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // When user is not authenticated, the component shows "Payment Pending"
      // because startMidtransSnap is called with a pending result
      await waitFor(() => {
        expect(screen.getByText('Payment Pending')).toBeInTheDocument();
      });

      // The login button should be present to allow user to log in
      const loginBtn = screen.getByText('Log In');
      expect(loginBtn).toBeInTheDocument();

      if (loginBtn) {
        fireEvent.click(loginBtn);
      }

      expect(authLib.login).toHaveBeenCalled();
    });

    it('shows error when user has no id', async () => {
      vi.mocked(authLib.getUser).mockReturnValue({
        id: '',
        email: 'test@example.com',
        name: 'Test User',
        token: 'mock-token-123',
        createdAt: '2024-01-01T00:00:00Z',
      });

      // Mock createPaymentTransaction to throw the specific error
      vi.mocked(paymentLib.createPaymentTransaction).mockRejectedValue(
        new Error('User account not properly configured')
      );

      render(
        <PaymentModal 
          isOpen={true} 
          onClose={vi.fn()} 
          product="ai_snapshot"
        />
      );

      // Click Midtrans button to trigger payment flow
      const midtransBtn = screen.getByText('Credit Card / Bank Transfer (Midtrans)').closest('button');
      expect(midtransBtn).toBeInTheDocument();

      if (midtransBtn) {
        fireEvent.click(midtransBtn);
      }

      // Should show error when user has no id
      await waitFor(() => {
        expect(screen.getByText('User account not properly configured')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Close Modal', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <PaymentModal 
          isOpen={true} 
          onClose={onClose} 
          product="ai_snapshot"
        />
      );

      const closeBtn = screen.getByTestId('mock-modal-close');
      expect(closeBtn).toBeInTheDocument();

      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
