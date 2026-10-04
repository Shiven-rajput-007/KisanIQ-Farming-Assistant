import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/types/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kisaniq_language', lang);
    }
    await i18n.changeLanguage(lang);
  }, [i18n]);

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = 'ltr'; // All Indian languages are LTR
      document.documentElement.setAttribute('data-lang', lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    handleLanguageChanged(i18n.language);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  return {
    currentLanguage: i18n.language as SupportedLanguage,
    changeLanguage,
  };
}
