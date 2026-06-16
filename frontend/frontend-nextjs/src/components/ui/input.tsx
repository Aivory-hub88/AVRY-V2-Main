/**
 * Input Component
 * 
 * A reusable input component with label, error, and helper text support.
 * Follows the design system with Tailwind CSS and accessibility compliance.
 * 
 * @example
 * // Basic input
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * 
 * // With error state
 * <Input 
 *   label="Password" 
 *   type="password" 
 *   error="Password must be at least 8 characters"
 * />
 * 
 * // With helper text
 * <Input 
 *   label="Username" 
 *   helperText="Choose a unique username for your profile"
 * />
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

/**
 * Input component with label, error, and helper text support
 * 
 * @param label - Optional label text for the input
 * @param error - Optional error message to display below the input
 * @param helperText - Optional helper text to display below the input
 * @param className - Additional CSS classes to apply
 * @param props - All standard HTML input attributes
 * 
 * @returns React component
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }: InputProps, ref) => {
    const baseStyles = "w-full px-4 py-3 rounded-md bg-bg-secondary border text-text-primary placeholder-text-tertiary transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:bg-bg-tertiary disabled:text-text-disabled disabled:cursor-not-allowed";
    
    const borderStyles = error 
      ? "border-error focus:border-error focus:ring-error/20" 
      : "border-border-default focus:border-brand-mint focus:ring-brand-mint/20";
    
    const labelId = `input-label-${props.id || Math.random().toString(36).substr(2, 9)}`;
    const describedBy = [
      error ? `input-error-${props.id || ''}` : null,
      helperText ? `input-helper-${props.id || ''}` : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`space-y-2 ${className || ''}`}>
        {label && (
          <label 
            id={labelId} 
            htmlFor={props.id} 
            className="block text-sm font-medium text-text-primary"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        <input
          ref={ref}
          id={props.id}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={`${baseStyles} ${borderStyles} ${className || ''}`}
          {...props}
        />
        
        {error && (
          <p 
            id={`input-error-${props.id || ''}`} 
            className="text-sm text-error font-medium"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={`input-helper-${props.id || ''}`} 
            className="text-sm text-text-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
