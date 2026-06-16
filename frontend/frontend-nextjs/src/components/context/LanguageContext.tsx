'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'id';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  exchangeRate: number;
  formatPrice: (usdPrice: number) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('id');
  const [exchangeRate, setExchangeRate] = useState<number>(16000); // default fallback

  useEffect(() => {
    // Fetch live rate on mount
    async function fetchRate() {
      try {
        const res = await fetch('/api/exchange-rate');
        if (res.ok) {
          const data = await res.json();
          if (data.idrRate) {
            setExchangeRate(data.idrRate);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate client-side', err);
      }
    }
    fetchRate();
  }, []);

  const formatPrice = (usdPrice: number) => {
    if (language === 'en') {
      return `$${usdPrice}`;
    } else {
      // Convert to IDR
      const idrValue = usdPrice * exchangeRate;
      
      // Format IDR nicely
      if (idrValue >= 1000000) {
        const juta = idrValue / 1000000;
        return `Rp ${parseFloat(juta.toFixed(2))} jt`;
      } else if (idrValue >= 1000) {
        const ribu = idrValue / 1000;
        return `Rp ${Math.round(ribu)} rb`;
      }
      return `Rp ${Math.round(idrValue)}`;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, exchangeRate, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
