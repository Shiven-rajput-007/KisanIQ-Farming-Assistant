import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

/**
 * Determine initial language:
 * 1. Saved user preference in localStorage (if valid)
 * 2. Strict default: 'hi' (Hindi). Browser language does NOT override Hindi default.
 */
const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kisaniq_language');
    if (saved && ['hi', 'en', 'mr'].includes(saved)) {
      return saved;
    }
  }
  return 'hi';
};

i18n
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../locales/${language}/${namespace}.json`)
    )
  )
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: {
      default: ['hi', 'en', 'mr'],
    },
    supportedLngs: ['hi', 'en', 'mr'],
    defaultNS: 'common',
    ns: ['common', 'home', 'crop', 'market', 'weather', 'risk', 'assistant', 'profile', 'notifications', 'soil'],
    load: 'languageOnly',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },

    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key "${key}" in namespace "${ns}"`);
      }
    },
  });

export default i18n;
