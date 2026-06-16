/**
 * Unit Tests for Input Component
 * 
 * Tests basic rendering, label, error, and helper text functionality
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Input } from './input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with placeholder text', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('should apply custom className to wrapper div', () => {
      render(<Input className="custom-wrapper" />);
      const wrapper = screen.getByRole('textbox').parentElement;
      expect(wrapper).toHaveClass('custom-wrapper');
    });
  });

  describe('Label Support', () => {
    it('should render label when provided', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-text-primary');
    });

    it('should render required asterisk when required prop is true', () => {
      render(<Input label="Email" required />);
      const label = screen.getByText('Email', { selector: 'label' });
      const asterisk = label.querySelector('span.text-error');
      expect(asterisk).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor', () => {
      const { container } = render(<Input id="email" label="Email" />);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'email');
    });
  });

  describe('Error State', () => {
    it('should render error message when provided', () => {
      render(<Input error="Invalid email" />);
      const error = screen.getByText('Invalid email');
      expect(error).toBeInTheDocument();
      expect(error).toHaveClass('text-error');
    });

    it('should set aria-invalid when error is present', () => {
      render(<Input error="Invalid email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error message with input via aria-describedby', () => {
      const { container } = render(<Input id="email" error="Invalid email" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-describedby', 'input-error-email');
    });
  });

  describe('Helper Text', () => {
    it('should render helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      const helper = screen.getByText('Enter your email address');
      expect(helper).toBeInTheDocument();
      expect(helper).toHaveClass('text-text-tertiary');
    });

    it('should not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper text" />);
      const helper = screen.queryByText('Helper text');
      expect(helper).not.toBeInTheDocument();
    });

    it('should associate helper text with input via aria-describedby', () => {
      const { container } = render(<Input id="email" helperText="Helper" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-describedby', 'input-helper-email');
    });
  });

  describe('Input Types', () => {
    it('should support text input type', () => {
      render(<Input type="text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should support email input type', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should support password input type', () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should support number input type', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Disabled State', () => {
    it('should render disabled input when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should apply disabled styles when disabled', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:bg-bg-tertiary');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Input label="Email" error="Invalid" helperText="Help" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have label with proper styling', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-text-primary');
    });
  });
});
