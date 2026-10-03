import { Check } from 'lucide-react';
import { LANGUAGES } from '@/types/i18n';
import { cn } from '@/lib/utils';
import type { SupportedLanguage } from '@/types';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onSelect: (lang: SupportedLanguage) => void;
  className?: string;
}

function LanguageSelector({ currentLanguage, onSelect, className }: LanguageSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {LANGUAGES.map((lang) => {
        const isSelected = lang.code === currentLanguage;
        return (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={cn(
              'relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left min-h-[72px]',
              'active:scale-[0.97]',
              isSelected
                ? 'border-agri-forest-800 bg-agri-forest-50'
                : 'border-sand-200 bg-white hover:border-sand-300 hover:bg-sand-50'
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-agri-forest-800 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            <span className={cn(
              'text-lg font-bold',
              isSelected ? 'text-agri-forest-800' : 'text-sand-900'
            )}>
              {lang.nativeName}
            </span>
            <span className="text-xs text-sand-500 mt-0.5">{lang.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}

export { LanguageSelector };
