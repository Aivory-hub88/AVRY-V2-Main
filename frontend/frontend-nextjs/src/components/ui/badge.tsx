/**
 * Badge Component
 * 
 * A reusable badge component that displays status indicators with various variants.
 * Supports success, warning, error, info, and tier variants with consistent styling.
 * 
 * @example
 * // Success badge
 * <Badge variant="success">Active</Badge>
 * 
 * // Tier badge with gradient
 * <Badge variant="tier">Pro Plan</Badge>
 */

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'tier';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge component with support for multiple variants
 * 
 * @param variant - The style variant (success, warning, error, info, tier)
 * @param children - The content to display in the badge
 * @param className - Additional CSS classes to apply
 * 
 * @returns React component
 */
export function Badge({ variant = 'success', children, className = '' }: BadgeProps) {
  const baseStyles = "inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide";
  
  const variants = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    error: "bg-error/15 text-error",
    info: "bg-info/15 text-info",
    tier: "bg-gradient-to-br from-brand-purple to-brand-mint text-white font-semibold",
  };
  
  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
