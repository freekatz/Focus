import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { languages, LANGUAGE_KEY, type LanguageCode } from '../i18n';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  languages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  const language = (i18n.language?.split('-')[0] || 'en') as LanguageCode;

  const setLanguage = useCallback((lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }, [i18n]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}