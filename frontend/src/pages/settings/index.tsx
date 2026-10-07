import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Bell, Info, ChevronRight, Palette, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/routes/paths';
import { useTheme, type AgriTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { t } = useTranslation(['profile', 'common']);
  const navigate = useNavigate();
  const { theme, setTheme, themeOptions } = useTheme();

  const navItems = [
    { icon: Globe, label: t('settings.language', { defaultValue: 'Language' }), onClick: () => navigate(ROUTES.LANGUAGE_SELECT) },
    { icon: Bell, label: t('settings.notifications', { defaultValue: 'Notifications' }), onClick: () => navigate(ROUTES.NOTIFICATIONS) },
    { icon: Info, label: t('settings.about', { defaultValue: 'About KisanIQ' }), onClick: () => {} },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-sand-900">{t('settings.title', { defaultValue: 'Settings' })}</h1>

      {/* Agricultural Theme Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-agri-forest-700" />
          <h2 className="text-base font-bold text-sand-900">
            {t('settings.theme_title', { defaultValue: 'Agricultural Theme' })}
          </h2>
        </div>
        <p className="text-xs text-sand-600">
          {t('settings.theme_desc', { defaultValue: 'Select a visual color palette crafted for agricultural environments.' })}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setTheme(opt.id as AgriTheme)}
                className={cn(
                  'p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between bg-white',
                  isSelected
                    ? 'border-agri-forest-800 ring-1 ring-agri-forest-800/30 shadow-xs'
                    : 'border-sand-200 hover:border-sand-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{opt.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-sand-900">
                        {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-agri-forest-100 text-agri-forest-800 px-1.5 py-0.5 rounded">
                          {t('common:states.active', { defaultValue: 'Active' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sand-600 mt-0.5">
                      {t(opt.descriptionKey, { defaultValue: opt.defaultDesc })}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center border shrink-0 mt-1',
                    isSelected
                      ? 'bg-agri-forest-800 border-agri-forest-800 text-white'
                      : 'border-sand-300 bg-sand-50'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* General Settings */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-sand-900">
          {t('settings.general_title', { defaultValue: 'Preferences' })}
        </h2>
        <Card>
          <CardContent className="divide-y divide-sand-200">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center justify-between py-3.5 first:pt-0 last:pb-0 min-h-[48px] text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-sand-500" />
                  <span className="text-base font-medium text-sand-900">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-sand-400" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
