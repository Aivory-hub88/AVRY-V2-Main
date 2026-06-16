/**
 * Button Component
 * 
 * A reusable button component with variant support (primary, secondary, ghost, danger).
 * Supports size variants (sm, md, lg), loading state, and asChild pattern for rendering as other elements.
 * 
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * // Secondary button with loading state
 * <Button variant="secondary" isLoading>
 *   Loading...
 * </Button>
 * 
 * // As child pattern (renders as Link)
 * <Button asChild>
 *   <Link href="/dashboard">Go to Dashboard</Link>
 * </Button>
 */

import React from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

/**
 * Button component with support for variants, sizes, and asChild pattern
 * 
 * @param variant - The style variant (primary, secondary, ghost, danger)
 * @param size - The size variant (sm, md, lg)
 * @param isLoading - Whether the button is in loading state
 * @param asChild - Whether to render as child element instead of button (default: false)
 * @param children - The content to display in the button
 * @param className - Additional CSS classes to apply
 * @param props - Additional button props
 * 
 * @returns React component
 */
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  isLoading,
  asChild = false,
  children,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = "font-sans font-normal rounded-lg cursor-pointer transition-all duration-200 ease-out border-none text-base inline-flex items-center justify-center gap-2 min-h-[48px]";
  
  const variants = {
    primary: "bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover hover:-translate-y-1 shadow-glow",
    secondary: "bg-transparent border-2 border-border-default text-text-primary hover:bg-bg-tertiary hover:border-brand-mint hover:text-brand-mint",
    ghost: "bg-transparent text-text-secondary border-none px-4 py-2 hover:bg-bg-tertiary hover:text-text-primary",
    danger: "bg-error text-white hover:bg-[#ff6b6b] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,87,87,0.3)]",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm min-h-[36px]",
    md: "px-6 py-3 text-base min-h-[48px]",
    lg: "px-8 py-4 text-lg min-h-[56px]",
  };
  
  // If asChild is true, render as Link (for navigation)
  if (asChild) {
    return (
      <Link 
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...(props as any)}
      >
        {isLoading ? 'Loading...' : children}
      </Link>
    );
  }
  
  // Otherwise, render as button
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

export default Button;
