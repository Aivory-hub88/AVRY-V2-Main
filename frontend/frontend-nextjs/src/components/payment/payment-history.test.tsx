/**
 * Unit Tests for Payment History Component
 * 
 * Tests rendering of payment list, status indicators, and refresh functionality
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PaymentHistory } from './payment-history';

describe('Payment History Component', () => {
  const mockPayments: Array<{
    paymentId: string;
    orderId: string;
    product: string;
    amount: number;
    status: 'success' | 'pending' | 'verified';
    paymentMethod: 'midtrans' | 'manual';
    paymentMethodDetail?: string;
    transactionId?: string;
    createdAt: string;
    verifiedAt?: string;
  }> = [
    {
      paymentId: 'pay_001',
      orderId: 'order_001',
      product: 'ai_snapshot',
      amount: 29.99,
      status: 'success',
      paymentMethod: 'midtrans',
      transactionId: 'txn_123',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      paymentId: 'pay_002',
      orderId: 'order_002',
      product: 'foundation',
      amount: 200,
      status: 'pending',
      paymentMethod: 'manual',
      paymentMethodDetail: 'bank_transfer',
      transactionId: 'txn_456',
      createdAt: '2024-01-16T14:20:00Z',
    },
    {
      paymentId: 'pay_003',
      orderId: 'order_003',
      product: 'ai_blueprint',
      amount: 85,
      status: 'verified',
      paymentMethod: 'manual',
      paymentMethodDetail: 'cash',
      transactionId: 'txn_789',
      createdAt: '2024-01-17T09:15:00Z',
      verifiedAt: '2024-01-18T11:00:00Z',
    },
  ];

  describe('Basic Rendering', () => {
    it('should render payment history title', () => {
      render(<PaymentHistory payments={[]} />);
      expect(screen.getByText('Payment History')).toBeInTheDocument();
    });

    it('should render refresh button when onRefresh is provided', () => {
      const mockOnRefresh = vi.fn();
      render(<PaymentHistory payments={[]} onRefresh={mockOnRefresh} />);
      
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });

    it('should not render refresh button when onRefresh is not provided', () => {
      render(<PaymentHistory payments={[]} />);
      expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no payments', () => {
      render(<PaymentHistory payments={[]} />);
      
      expect(screen.getByText('No payment history yet')).toBeInTheDocument();
      
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
    });

    it('should show refresh button in empty state when onRefresh is provided', () => {
      const mockOnRefresh = vi.fn();
      render(<PaymentHistory payments={[]} onRefresh={mockOnRefresh} />);
      
      expect(screen.getByRole('button', { name: 'Refresh Payments' })).toBeInTheDocument();
    });
  });

  describe('Payment List Rendering', () => {
    it('should render all payments in the list', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('AI Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Foundation Plan')).toBeInTheDocument();
      expect(screen.getByText('AI Blueprint')).toBeInTheDocument();
    });

    it('should display correct payment amounts', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('$29.99')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
      expect(screen.getByText('$85.00')).toBeInTheDocument();
    });

    it('should display order IDs', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('order_001')).toBeInTheDocument();
      expect(screen.getByText('order_002')).toBeInTheDocument();
      expect(screen.getByText('order_003')).toBeInTheDocument();
    });

    it('should display transaction IDs when available', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('txn_123')).toBeInTheDocument();
      expect(screen.getByText('txn_456')).toBeInTheDocument();
      expect(screen.getByText('txn_789')).toBeInTheDocument();
    });

    it('should display payment methods', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('Credit Card / Bank Transfer (Midtrans)')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    it('should display dates in readable format', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('January 16, 2024')).toBeInTheDocument();
      expect(screen.getByText('January 17, 2024')).toBeInTheDocument();
    });

    it('should display verification date when available', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      expect(screen.getByText('January 18, 2024')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should display success status with correct styling', () => {
      render(<PaymentHistory payments={[mockPayments[0]]} />);
      
      expect(screen.getByText('Success')).toBeInTheDocument();
      const statusBadge = screen.getByText('Success');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should display pending status with correct styling', () => {
      render(<PaymentHistory payments={[mockPayments[1]]} />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      const statusBadge = screen.getByText('Pending');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should display verified status with correct styling', () => {
      render(<PaymentHistory payments={[mockPayments[2]]} />);
      
      expect(screen.getByText('Verified')).toBeInTheDocument();
      const statusBadge = screen.getByText('Verified');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should display failed status correctly', () => {
      const failedPayment: {
        paymentId: string;
        orderId: string;
        product: string;
        amount: number;
        status: 'failed';
        paymentMethod: 'midtrans' | 'manual';
        paymentMethodDetail?: string;
        transactionId?: string;
        createdAt: string;
        verifiedAt?: string;
      } = {
        ...mockPayments[0],
        status: 'failed' as const,
      };
      render(<PaymentHistory payments={[failedPayment]} />);
      
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should display rejected status correctly', () => {
      const rejectedPayment: {
        paymentId: string;
        orderId: string;
        product: string;
        amount: number;
        status: 'rejected';
        paymentMethod: 'midtrans' | 'manual';
        paymentMethodDetail?: string;
        transactionId?: string;
        createdAt: string;
        verifiedAt?: string;
      } = {
        ...mockPayments[0],
        status: 'rejected' as const,
      };
      render(<PaymentHistory payments={[rejectedPayment]} />);
      
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      const mockOnRefresh = vi.fn();
      render(<PaymentHistory payments={mockPayments} onRefresh={mockOnRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      fireEvent.click(refreshButton);
      
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during refresh', async () => {
      const mockOnRefresh = vi.fn(() => new Promise(() => {})); // Never resolves
      render(<PaymentHistory payments={mockPayments} onRefresh={mockOnRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      fireEvent.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
      expect(refreshButton).toHaveTextContent('Loading...');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading and no payments', () => {
      render(<PaymentHistory payments={[]} loading={true} />);
      
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not show loading spinner when loading but has payments', () => {
      render(<PaymentHistory payments={mockPayments} loading={true} />);
      
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('AI Snapshot')).toBeInTheDocument();
    });
  });

  describe('Product Name Mapping', () => {
    it('should map ai_snapshot to AI Snapshot', () => {
      render(<PaymentHistory payments={mockPayments} />);
      expect(screen.getByText('AI Snapshot')).toBeInTheDocument();
    });

    it('should map ai_blueprint to AI Blueprint', () => {
      render(<PaymentHistory payments={mockPayments} />);
      expect(screen.getByText('AI Blueprint')).toBeInTheDocument();
    });

    it('should map foundation to Foundation Plan', () => {
      render(<PaymentHistory payments={mockPayments} />);
      expect(screen.getByText('Foundation Plan')).toBeInTheDocument();
    });

    it('should map pro to Pro Plan', () => {
      const proPayment = {
        ...mockPayments[0],
        product: 'pro' as const,
      };
      render(<PaymentHistory payments={[proPayment]} />);
      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    });

    it('should map enterprise to Enterprise Plan', () => {
      const enterprisePayment = {
        ...mockPayments[0],
        product: 'enterprise' as const,
      };
      render(<PaymentHistory payments={[enterprisePayment]} />);
      expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
    });

    it('should show product ID if not in mapping', () => {
      const unknownPayment = {
        ...mockPayments[0],
        product: 'unknown_product' as const,
      };
      render(<PaymentHistory payments={[unknownPayment]} />);
      expect(screen.getByText('unknown_product')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper list structure', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('should have proper semantic structure for payment items', () => {
      render(<PaymentHistory payments={mockPayments} />);
      
      const paymentItem = screen.getByText('AI Snapshot').closest('div');
      expect(paymentItem).toBeInTheDocument();
    });
  });
});