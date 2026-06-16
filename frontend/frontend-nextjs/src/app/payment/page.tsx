/**
 * Payment Modal Page
 * 
 * A standalone page for the payment modal functionality that supports
 * all products (snapshot, blueprint, subscriptions, credits).
 * 
 * This page can be used both as a standalone page and as a modal
 * when opened from other pages.
 */

'use client';

import React from 'react';
import { PaymentModal } from '@/components/payment/payment-modal';
import { isAuthenticated, getUser } from '@/lib/auth';
import { getPaymentConfig, getCreditProducts } from '@/lib/payment';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/lib/translations';

// ============================================================================
// PRODUCT SELECTION CARD
// ============================================================================

interface ProductCardProps {
  product: string | number;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'one-time' | 'subscription';
  onSelect: (product: string | number) => void;
}

function ProductCard({ product, name, description, price, currency, type, onSelect }: ProductCardProps) {
  const isCredit = typeof product === 'number';
  
  return (
    <Card className="flex flex-col p-6 hover:border-brand-mint transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">{name}</h3>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <Badge variant={type === 'subscription' ? 'tier' : 'success'}>
          {type === 'subscription' ? 'Subscription' : 'One-time'}
        </Badge>
      </div>
      
      <div className="mt-auto flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-text-primary">${price}</span>
          <span className="text-text-tertiary ml-1">USD</span>
        </div>
        <Button 
          onClick={() => onSelect(product)}
          variant="primary"
          className="group-hover:bg-brand-mint-hover transition-colors"
        >
          Select
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// CREDIT PRODUCT CARD
// ============================================================================

interface CreditCardProps {
  amount: number;
  price: number;
  onSelect: (amount: number) => void;
}

function CreditCard({ amount, price, onSelect }: CreditCardProps) {
  return (
    <Card className="flex flex-col p-6 hover:border-brand-mint transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">{amount} Credits</h3>
          <p className="text-sm text-text-secondary">AI usage credits</p>
        </div>
        <Badge variant="info">Credit</Badge>
      </div>
      
      <div className="mt-auto flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-text-primary">${price}</span>
          <span className="text-text-tertiary ml-1">USD</span>
        </div>
        <Button 
          onClick={() => onSelect(amount)}
          variant="primary"
          className="group-hover:bg-brand-mint-hover transition-colors"
        >
          Select
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// PAYMENT PAGE COMPONENT
// ============================================================================

export default function PaymentPage() {
  const t = useTranslations('payment');
  const [selectedProduct, setSelectedProduct] = React.useState<string | number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const paymentConfig = getPaymentConfig();
  const creditProducts = getCreditProducts();

  // Check authentication on mount
  React.useEffect(() => {
    if (!isAuthenticated()) {
      setAuthError('Please log in to access payment options');
    }
  }, []);

  const handleProductSelect = (product: string | number) => {
    if (!isAuthenticated()) {
      setAuthError('Please log in to access payment options');
      // Dispatch event to open login modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('openLoginModal'));
      }
      return;
    }

    setSelectedProduct(product);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedProduct(null);
  };

  const handleLogin = () => {
    // Dispatch event to open login modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('openLoginModal'));
    }
  };

  // Get product details
  const getProductName = (product: string | number): string => {
    if (typeof product === 'number') {
      return `${product} Credits`;
    }

    switch (product) {
      case paymentConfig.products.SNAPSHOT:
        return 'AI Snapshot';
      case paymentConfig.products.BLUEPRINT:
        return 'AI Blueprint';
      case paymentConfig.products.FOUNDATION:
        return 'Foundation Plan';
      case paymentConfig.products.PRO:
        return 'Pro Plan';
      case paymentConfig.products.ENTERPRISE:
        return 'Enterprise Plan';
      default:
        return 'Product';
    }
  };

  const getProductDescription = (product: string | number): string => {
    if (typeof product === 'number') {
      return 'AI usage credits for API calls and processing';
    }

    switch (product) {
      case paymentConfig.products.SNAPSHOT:
        return 'One-time AI diagnostic report for your system';
      case paymentConfig.products.BLUEPRINT:
        return 'Comprehensive AI system architecture blueprint';
      case paymentConfig.products.FOUNDATION:
        return 'Monthly foundation tier subscription';
      case paymentConfig.products.PRO:
        return 'Monthly pro tier subscription';
      case paymentConfig.products.ENTERPRISE:
        return 'Monthly enterprise tier subscription';
      default:
        return 'Product';
    }
  };

  const getProductPrice = (product: string | number): number | null => {
    if (typeof product === 'number') {
      return paymentConfig.creditPrices[product] || null;
    }

    switch (product) {
      case paymentConfig.products.SNAPSHOT:
        return paymentConfig.snapshotPrice;
      case paymentConfig.products.BLUEPRINT:
        return paymentConfig.blueprintPrice;
      case paymentConfig.products.FOUNDATION:
        return paymentConfig.foundationPrice;
      case paymentConfig.products.PRO:
        return paymentConfig.proPrice;
      case paymentConfig.products.ENTERPRISE:
        return paymentConfig.enterprisePrice;
      default:
        return null;
    }
  };

  // Render authentication error
  if (authError) {
    return (
      <div className="min-h-screen bg-[#353531] p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="mb-4 text-6xl">🔒</div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Authentication Required</h2>
            <p className="text-text-secondary mb-6">{authError}</p>
            <Button onClick={handleLogin} variant="primary" className="w-full">
              Log In
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#353531] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-4">Choose Your Product</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Select from our range of AI services and subscription plans.
            Secure payment powered by Midtrans.
          </p>
        </div>

        {/* Product Selection */}
        <div className="space-y-12">
          {/* One-time Products */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-6">One-time Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProductCard
                product={paymentConfig.products.SNAPSHOT}
                name={getProductName(paymentConfig.products.SNAPSHOT)}
                description={getProductDescription(paymentConfig.products.SNAPSHOT)}
                price={paymentConfig.snapshotPrice}
                currency="USD"
                type="one-time"
                onSelect={handleProductSelect}
              />
              <ProductCard
                product={paymentConfig.products.BLUEPRINT}
                name={getProductName(paymentConfig.products.BLUEPRINT)}
                description={getProductDescription(paymentConfig.products.BLUEPRINT)}
                price={paymentConfig.blueprintPrice}
                currency="USD"
                type="one-time"
                onSelect={handleProductSelect}
              />
            </div>
          </section>

          {/* Subscription Products */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Subscription Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProductCard
                product={paymentConfig.products.FOUNDATION}
                name={getProductName(paymentConfig.products.FOUNDATION)}
                description={getProductDescription(paymentConfig.products.FOUNDATION)}
                price={paymentConfig.foundationPrice}
                currency="USD"
                type="subscription"
                onSelect={handleProductSelect}
              />
              <ProductCard
                product={paymentConfig.products.PRO}
                name={getProductName(paymentConfig.products.PRO)}
                description={getProductDescription(paymentConfig.products.PRO)}
                price={paymentConfig.proPrice}
                currency="USD"
                type="subscription"
                onSelect={handleProductSelect}
              />
              <ProductCard
                product={paymentConfig.products.ENTERPRISE}
                name={getProductName(paymentConfig.products.ENTERPRISE)}
                description={getProductDescription(paymentConfig.products.ENTERPRISE)}
                price={paymentConfig.enterprisePrice}
                currency="USD"
                type="subscription"
                onSelect={handleProductSelect}
              />
            </div>
          </section>

          {/* Credit Products */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Credit Packages</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {creditProducts.map((amount) => {
                const price = paymentConfig.creditPrices[amount];
                return (
                  <CreditCard
                    key={amount}
                    amount={amount}
                    price={price}
                    onSelect={handleProductSelect}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* Payment Security */}
        <div className="mt-16 pt-8 border-t border-border-default">
          <div className="flex items-center justify-center gap-8 text-text-tertiary">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Midtrans Powered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        product={selectedProduct || undefined}
      />
    </div>
  );
}
