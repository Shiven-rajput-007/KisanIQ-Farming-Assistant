export const SUPPORTED_LANGUAGES = [
  'mr',
  'hi',
  'en',
  'pa',
  'gu',
  'bn',
  'ta',
  'te',
  'kn',
  'ml',
  'or',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  script: string;
  direction: 'ltr' | 'rtl';
  subtitle: string; // native subtitle for language selector
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', direction: 'ltr', subtitle: 'प्राथमिक भाषा (Default)' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari', direction: 'ltr', subtitle: 'आपकी पसंदीदा भाषा' },
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin', direction: 'ltr', subtitle: 'Your preferred language' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', direction: 'ltr', subtitle: 'ਤੁਹਾਡੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', direction: 'ltr', subtitle: 'તમારી પસંદીદા ભાષા' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', direction: 'ltr', subtitle: 'আপনার পছন্দের ভাষা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', direction: 'ltr', subtitle: 'உங்கள் விருப்பமான மொழி' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', direction: 'ltr', subtitle: 'మీ ఇష్టమైన భాష' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', direction: 'ltr', subtitle: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', direction: 'ltr', subtitle: 'നിങ്ങളുടെ ഇഷ്ടഭാഷ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', direction: 'ltr', subtitle: 'ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା' },
];
