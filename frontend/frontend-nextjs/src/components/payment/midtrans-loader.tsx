/**
 * Midtrans Snap SDK Loader
 * 
 * Loads the Midtrans Snap SDK on the homepage to ensure it's available
 * when the payment modal is opened.
 * 
 * This component should be included in the homepage layout to preload
 * the Midtrans SDK for faster payment processing.
 */

'use client';

import { useEffect } from 'react';
import { loadMidtransSnap } from '@/lib/payment';

/**
 * Props for MidtransLoader component
 */
interface MidtransLoaderProps {
  /**
   * Client key from environment variable
   */
  clientKey?: string;
  /**
   * Whether to load in production mode
   */
  isProduction?: boolean;
}

/**
 * MidtransLoader Component
 * 
 * Loads the Midtrans Snap SDK dynamically on component mount.
 * Uses environment variables for configuration.
 * 
 * @example
 * // Basic usage in layout
 * <MidtransLoader 
 *   clientKey={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
 *   isProduction={process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'}
 * />
 */
export function MidtransLoader({ 
  clientKey, 
  isProduction = false 
}: MidtransLoaderProps) {
  useEffect(() => {
    // Check if client key is configured
    if (!clientKey || clientKey.includes('<your-client-key>')) {
      console.warn('Midtrans client key not configured');
      return;
    }

    // Load Midtrans Snap SDK
    loadMidtransSnap(clientKey)
      .then(() => {
        console.log('Midtrans Snap SDK loaded successfully');
        // Store production mode in window for later use
        if (typeof window !== 'undefined') {
          (window as Window & { MIDTRANS_IS_PRODUCTION?: boolean }).MIDTRANS_IS_PRODUCTION = isProduction;
        }
      })
      .catch((error) => {
        console.warn('Failed to load Midtrans Snap SDK:', error);
        // SDK loading failed, but we can still use fallback payment methods
      });
  }, [clientKey, isProduction]);

  return null;
}

export default MidtransLoader;
