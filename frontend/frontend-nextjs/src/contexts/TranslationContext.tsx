"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Language, getTranslations, Translations } from "@/lib/translations"

/**
 * Translation context for managing language state and currency formatting
 */
interface TranslationContextType {
  language: Language
  translations: Translations
  setLanguage: (language: Language) => void
  exchangeRate: number
  formatPrice: (usdPrice: number) => string
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const STORAGE_KEY = "aivory:language"

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [exchangeRate, setExchangeRate] = useState<number>(16000) // default fallback

  // Load language from localStorage on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem(STORAGE_KEY) as Language | null
    if (storedLanguage) {
      setLanguageState(storedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  // Fetch live exchange rate on mount
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('/api/exchange-rate')
        if (res.ok) {
          const data = await res.json()
          if (data.idrRate) {
            setExchangeRate(data.idrRate)
          }
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate client-side', err)
      }
    }
    fetchRate()
  }, [])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
  }

  /**
   * Format a USD price based on the current language.
   * - English: "$29"
   * - Indonesian: "Rp 464 rb" or "Rp 1.6 jt" (thousands/millions shorthand)
   */
  const formatPrice = (usdPrice: number): string => {
    if (language === 'en') {
      return `$${usdPrice}`
    }
    // Convert to IDR
    const idrValue = usdPrice * exchangeRate

    // Format IDR nicely with shorthand
    if (idrValue >= 1000000) {
      const juta = idrValue / 1000000
      return `Rp ${parseFloat(juta.toFixed(2))} jt`
    } else if (idrValue >= 1000) {
      const ribu = idrValue / 1000
      return `Rp ${Math.round(ribu)} rb`
    }
    return `Rp ${Math.round(idrValue)}`
  }

  const translations = getTranslations(language)

  return (
    <TranslationContext.Provider value={{ language, translations, setLanguage, exchangeRate, formatPrice }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    // Fallback for when used outside provider (e.g., in lib files)
    return {
      language: "en" as Language,
      translations: getTranslations("en"),
      setLanguage: () => console.warn("useTranslation must be used within TranslationProvider"),
      exchangeRate: 16000,
      formatPrice: (usdPrice: number) => `$${usdPrice}`,
    }
  }
  return context
}
