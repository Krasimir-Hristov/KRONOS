'use client';

import React, { createContext, useContext, useState } from 'react';
import type { TranslationDictionary } from '@/i18n/bgDictionary';
import { getDictionary, parseLocale, type SupportedLocale } from '@/i18n/translations';

interface LanguageContextValue {
  readonly locale: SupportedLocale;
  readonly dictionary: TranslationDictionary;
  readonly setLocale: (nextLocale: SupportedLocale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  readonly children: React.ReactNode;
  readonly initialLocale?: SupportedLocale;
}

const LOCALE_STORAGE_KEY = 'kronos_ui_locale';

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLocale = 'bg',
}) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window === 'undefined') {
      return initialLocale;
    }
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      return saved ? parseLocale(saved) : initialLocale;
    } catch {
      return initialLocale;
    }
  });

  const setLocale = (nextLocale: SupportedLocale): void => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Ignore storage quota / private mode restrictions gracefully
    }
  };

  const value: LanguageContextValue = {
    locale,
    dictionary: getDictionary(locale),
    setLocale,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return context;
};
