import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/domain/language-selector';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/routes/paths';

export default function LanguageSelectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-bold text-sand-900">🌐 {t('language.title')}</h1>
      </div>
      <LanguageSelector
        currentLanguage={currentLanguage}
        onSelect={(lang) => {
          changeLanguage(lang);
          navigate(-1);
        }}
      />
    </div>
  );
}
