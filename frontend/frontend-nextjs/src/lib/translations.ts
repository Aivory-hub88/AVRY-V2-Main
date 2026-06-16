/**
 * Translations Management
 * Provides i18n support for English and Indonesian
 */

export type Language = "en" | "id";

/**
 * Translations interface
 */
export interface Translations {
  nav: {
    signIn: string;
    signUp: string;
    logout: string;
    logs: string;
    settings: string;
    home: string;
    dashboard: string;
    learnMore: string;
  };
  dashboard: {
    title: string;
    free: {
      title: string;
      description: string;
    };
    snapshot: {
      title: string;
      description: string;
    };
    blueprint: {
      title: string;
      description: string;
    };
    operate: {
      title: string;
      description: string;
    };
  };
  footer: {
    copyright: string;
    legal: {
      privacyPolicy: string;
      termsOfService: string;
    };
  };
}

/**
 * English translations
 */
const EN: Translations = {
  nav: {
    signIn: "Sign In",
    signUp: "Sign Up",
    logout: "Logout",
    logs: "Logs",
    settings: "Settings",
    home: "Home",
    dashboard: "Dashboard",
    learnMore: "Learn More",
  },
  dashboard: {
    title: "Dashboard",
    free: {
      title: "Free",
      description: "Basic diagnostic",
    },
    snapshot: {
      title: "Snapshot",
      description: "AI Snapshot Analysis",
    },
    blueprint: {
      title: "Blueprint",
      description: "AI Blueprint",
    },
    operate: {
      title: "Operate",
      description: "Operations",
    },
  },
  footer: {
    copyright: "© {year} Aivory. All rights reserved.",
    legal: {
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
    },
  },
};

/**
 * Indonesian translations
 */
const ID: Translations = {
  nav: {
    signIn: "Masuk",
    signUp: "Daftar",
    logout: "Keluar",
    logs: "Log",
    settings: "Pengaturan",
    home: "Beranda",
    dashboard: "Dashboard",
    learnMore: "Pelajari Lebih Lanjut",
  },
  dashboard: {
    title: "Dashboard",
    free: {
      title: "Gratis",
      description: "Diagnostik dasar",
    },
    snapshot: {
      title: "Snapshot",
      description: "Analisis Snapshot AI",
    },
    blueprint: {
      title: "Blueprint",
      description: "Blueprint AI",
    },
    operate: {
      title: "Operasi",
      description: "Operasi",
    },
  },
  footer: {
    copyright: "© {year} Aivory. Semua hak dilindungi.",
    legal: {
      privacyPolicy: "Kebijakan Privasi",
      termsOfService: "Syarat Layanan",
    },
  },
};

/**
 * Get translations for a specific language
 * @param language - Language code
 * @returns Translations object
 */
export function getTranslations(language: Language): Translations {
  switch (language) {
    case "id":
      return ID;
    case "en":
    default:
      return EN;
  }
}

/**
 * Translate a key path (e.g., "nav.signIn")
 * @param language - Language code
 * @param key - Translation key path
 * @returns Translated string or key if not found
 */
export function t(language: Language, key: string): string {
  const translations = getTranslations(language);
  const keys = key.split(".");
  
  let current: any = translations;
  for (const k of keys) {
    current = current?.[k];
    if (current === undefined) {
      return key;
    }
  }
  
  return current as string;
}

/**
 * React hook to get translations for the current component
 * Returns translation functions for the user's preferred language
 * @param namespace - Optional namespace (ignored, kept for compatibility)
 * @deprecated Use getTranslations and manage language state directly
 */
export function useTranslations(namespace?: string) {
  // This is a hook stub - the actual language should be managed by context
  // For now, return English translations
  return getTranslations("en");
}
