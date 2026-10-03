import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Bell, Info, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/routes/paths';

export default function SettingsPage() {
  const { t } = useTranslation('profile');
  const navigate = useNavigate();

  const items = [
    { icon: Globe, label: t('settings.language'), onClick: () => navigate(ROUTES.LANGUAGE_SELECT) },
    { icon: Bell, label: t('settings.notifications'), onClick: () => navigate(ROUTES.NOTIFICATIONS) },
    { icon: Info, label: t('settings.about'), onClick: () => {} },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-sand-900">{t('settings.title')}</h1>
      <Card>
        <CardContent className="divide-y divide-sand-200">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between py-3.5 first:pt-0 last:pb-0 min-h-[48px]"
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
  );
}
