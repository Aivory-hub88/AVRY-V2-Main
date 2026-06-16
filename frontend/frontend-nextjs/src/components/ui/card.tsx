/**
 * Card Component
 * 
 * A reusable card component that displays content in a styled container.
 * Supports interactive variant with hover effects and compact variant with reduced padding.
 * 
 * @example
 * // Basic card
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </Card>
 * 
 * // Interactive card with hover effects
 * <Card interactive>
 *   <h3>Interactive Card</h3>
 * </Card>
 * 
 * // Compact card with reduced padding
 * <Card compact>
 *   <h3>Compact Card</h3>
 * </Card>
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
}

/**
 * Card component with support for interactive and compact variants
 * 
 * @param children - The content to display in the card
 * @param className - Additional CSS classes to apply
 * @param interactive - Whether the card has hover effects (default: false)
 * @param compact - Whether the card uses reduced padding (default: false)
 * 
 * @returns React component
 */
export function Card({ children, className = '', interactive = false, compact = false }: CardProps) {
  const baseStyles = "bg-bg-secondary p-6 rounded-lg border border-border-default transition-all duration-200 ease-out relative";
  
  const variants = {
    interactive: "cursor-pointer hover:border-border-strong hover:-translate-y-1 hover:shadow-md",
    compact: "p-4",
  };
  
  return (
    <div className={`${baseStyles} ${interactive ? variants.interactive : ''} ${compact ? variants.compact : ''} ${className}`}>
      {children}
    </div>
  );
}

export default Card;
