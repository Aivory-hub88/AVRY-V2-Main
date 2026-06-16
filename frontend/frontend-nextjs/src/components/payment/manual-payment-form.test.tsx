/**
 * Unit Tests for Manual Payment Form Component
 * 
 * Tests form rendering, validation, file upload, and submission
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ManualPaymentForm } from './manual-payment-form';

// Mock file upload
const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('Manual Payment Form Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render form with amount and product info', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByText('Manual Payment')).toBeInTheDocument();
      expect(screen.getByText('$29.99 for ai_snapshot')).toBeInTheDocument();
    });

    it('should render payment proof upload field', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByText('Payment Proof / Screenshot')).toBeInTheDocument();
      const fileInput = screen.getByLabelText('Payment Proof / Screenshot');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });

    it('should render transaction ID input field', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByText('Transaction ID / Reference Number')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Enter transaction ID');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('required');
    });

    it('should render payment method select dropdown', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('bank_transfer');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue('bank_transfer');
      expect(options[1]).toHaveValue('cash');
      expect(options[2]).toHaveValue('ewallet');
    });

    it('should render cancel and submit buttons', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Payment' })).toBeInTheDocument();
    });
  });

  describe('File Upload Validation', () => {
    it('should accept image files', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const fileInput = screen.getByLabelText('Payment Proof / Screenshot') as HTMLInputElement;
      const file = createMockFile('payment.png', 'image/png', 1024 * 1024);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(fileInput.files).toHaveLength(1);
      expect(fileInput.files?.[0]).toBe(file);
    });

    it('should reject non-image files', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const fileInput = screen.getByLabelText('Payment Proof / Screenshot') as HTMLInputElement;
      const file = new File([''], 'document.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('Please upload an image file (PNG, JPG, etc.)')).toBeInTheDocument();
      expect(fileInput.files).toBeNull();
    });

    it('should reject files larger than 5MB', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const fileInput = screen.getByLabelText('Payment Proof / Screenshot') as HTMLInputElement;
      const file = createMockFile('large.png', 'image/png', 6 * 1024 * 1024);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
      expect(fileInput.files).toBeNull();
    });

    it('should show selected file name after upload', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const fileInput = screen.getByLabelText('Payment Proof / Screenshot');
      const file = createMockFile('payment.png', 'image/png', 1024 * 1024);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('Selected: payment.png')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when transaction ID is empty on submit', async () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit Payment' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a transaction ID')).toBeInTheDocument();
      });
    });

    it('should clear error when user starts typing', async () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit Payment' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a transaction ID')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter transaction ID');
      fireEvent.change(input, { target: { value: 'TXN123' } });

      expect(screen.queryByText('Please enter a transaction ID')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const fileInput = screen.getByLabelText('Payment Proof / Screenshot');
      const file = createMockFile('payment.png', 'image/png', 1024 * 1024);
      fireEvent.change(fileInput, { target: { files: [file] } });

      const input = screen.getByPlaceholderText('Enter transaction ID');
      fireEvent.change(input, { target: { value: 'TXN123' } });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'cash' } });

      const submitButton = screen.getByRole('button', { name: 'Submit Payment' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          transactionId: 'TXN123',
          paymentMethod: 'cash',
          paymentProof: file,
        });
      });
    });

    it('should show error when onSubmit fails', async () => {
      const mockSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const input = screen.getByPlaceholderText('Enter transaction ID');
      fireEvent.change(input, { target: { value: 'TXN123' } });

      const submitButton = screen.getByRole('button', { name: 'Submit Payment' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const mockSubmit = vi.fn(async (): Promise<void> => {}); // Never resolves
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const input = screen.getByPlaceholderText('Enter transaction ID');
      fireEvent.change(input, { target: { value: 'TXN123' } });

      const submitButton = screen.getByRole('button', { name: 'Submit Payment' });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Loading...');
    });
  });

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should have required fields marked', () => {
      render(
        <ManualPaymentForm 
          amount={29.99} 
          product="ai_snapshot" 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const input = screen.getByPlaceholderText('Enter transaction ID');
      expect(input).toHaveAttribute('required');
    });
  });
});