/**
 * Translation System Tests
 * Tests for the translation system in lib/translations.ts
 */

import { describe, it, expect } from "vitest"
import { getTranslations, useTranslations, type Language } from "./translations"

describe("Translation System", () => {
  describe("getTranslations", () => {
    it("should return English translations for 'en' language", () => {
      const translations = getTranslations("en")
      expect(translations.nav.signIn).toBe("Sign In")
      expect(translations.nav.dashboard).toBe("Dashboard")
    })

    it("should return Indonesian translations for 'id' language", () => {
      const translations = getTranslations("id")
      expect(translations.nav.signIn).toBe("Masuk")
      expect(translations.nav.dashboard).toBe("Dashboard")
    })

    it("should have consistent structure between English and Indonesian translations", () => {
      const en = getTranslations("en")
      const id = getTranslations("id")
      const enKeys = Object.keys(en)
      const idKeys = Object.keys(id)

      expect(enKeys).toEqual(idKeys)

      // Check that each namespace has the same keys
      enKeys.forEach((key) => {
        const enNamespace = en[key as keyof typeof en]
        const idNamespace = id[key as keyof typeof id]
        expect(Object.keys(enNamespace)).toEqual(Object.keys(idNamespace))
      })
    })
  })

  describe("Translation Content", () => {
    describe("Navigation translations", () => {
      it("should have consistent navigation translations", () => {
        const en = getTranslations("en")
        const id = getTranslations("id")

        expect(en.nav.signIn).toBe("Sign In")
        expect(id.nav.signIn).toBe("Masuk")

        expect(en.nav.dashboard).toBe("Dashboard")
        expect(id.nav.dashboard).toBe("Dashboard")

        expect(en.nav.learnMore).toBe("Learn More")
        expect(id.nav.learnMore).toBe("Pelajari Lebih Lanjut")

        expect(en.nav.logs).toBe("Logs")
        expect(id.nav.logs).toBe("Log")
      })
    })

    describe("Dashboard translations", () => {
      it("should have consistent dashboard translations", () => {
        const en = getTranslations("en")
        const id = getTranslations("id")

        expect(en.dashboard.title).toBe("Dashboard")
        expect(id.dashboard.title).toBe("Dashboard")

        expect(en.dashboard.free.title).toBe("Free")
        expect(id.dashboard.free.title).toBe("Gratis")
      })
    })

    describe("Footer translations", () => {
      it("should have consistent footer translations", () => {
        const en = getTranslations("en")
        const id = getTranslations("id")

        expect(en.footer.legal.privacyPolicy).toBe("Privacy Policy")
        expect(id.footer.legal.privacyPolicy).toBe("Kebijakan Privasi")
      })
    })
  })

  describe("useTranslations", () => {
    it("should return English translations by default", () => {
      const translations = useTranslations()
      expect(translations.nav.signIn).toBe("Sign In")
    })
  })
})
