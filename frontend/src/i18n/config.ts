import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { SUPPORTED_LANGUAGES } from '@/types/i18n';

i18n
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../locales/${language}/${namespace}.json`)
    )
  )
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: (typeof window !== 'undefined' && localStorage.getItem('kisaniq_language')) || 'mr',
    fallbackLng: {
      default: ['mr', 'hi', 'en'],
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: 'common',
    ns: ['common', 'home', 'crop', 'market', 'weather', 'risk', 'assistant', 'profile', 'notifications', 'soil'],
    load: 'languageOnly',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kisaniq_language',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },

    // Development: log missing keys
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key "${key}" in namespace "${ns}"`);
      }
    },
  });

export default i18n;
