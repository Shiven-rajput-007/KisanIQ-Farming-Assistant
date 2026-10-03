import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Wheat, Droplets, Mountain, Globe, ChevronRight, Bell, Info, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { DemoBanner } from '@/components/ui/demo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/routes/paths';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const navigate = useNavigate();
  const { farmer, farmProfile, isLoading, isFallback } = useProfile();
  const { logout, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const activeFarmer = farmer || { name: 'Ramesh', location: { district: 'Gwalior', state: 'Madhya Pradesh', village: 'Morar' } };
  const activeFarm = farmProfile || { totalArea: 5, soilType: 'alluvial', irrigationSource: 'borewell' };

  const infoItems = [
    {
      icon: MapPin,
      label: t('fields.location'),
      value: `${activeFarmer.location?.district || 'Gwalior'}, ${activeFarmer.location?.state || 'Madhya Pradesh'}`,
    },
    {
      icon: Mountain,
      label: t('fields.farm_size'),
      value: `${activeFarm.totalArea || 5} acres`,
    },
    {
      icon: Wheat,
      label: t('fields.main_crop'),
      value: 'Wheat (HD-2967)',
    },
    {
      icon: Droplets,
      label: t('fields.irrigation'),
      value: t(`irrigation_types.${activeFarm.irrigationSource || 'borewell'}`, { defaultValue: activeFarm.irrigationSource || 'Borewell' }),
    },
  ];

  const settingsItems = [
    { icon: Globe, label: t('settings.language'), onClick: () => navigate(ROUTES.LANGUAGE_SELECT) },
    { icon: Bell, label: t('settings.notifications'), onClick: () => navigate(ROUTES.NOTIFICATIONS) },
    { icon: Info, label: t('settings.about'), onClick: () => {} },
  ];

  return (
    <div className="space-y-5">
      {isFallback && <DemoBanner className="mb-2" />}

      <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>

      {/* Farmer info */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-agri-forest-100 flex items-center justify-center text-2xl">
              👨‍🌾
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-sand-900">{activeFarmer.name}</h2>
              <p className="text-sm text-sand-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {activeFarmer.location?.village ? `${activeFarmer.location.village}, ` : ''}
                {activeFarmer.location?.district || 'Gwalior'}, {activeFarmer.location?.state || 'Madhya Pradesh'}
              </p>
            </div>
            {isAuthenticated && (
              <button
                onClick={logout}
                className="p-2 text-risk-red-600 hover:bg-risk-red-50 rounded-lg flex items-center gap-1 text-xs font-semibold"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Farm Details */}
      <div>
        <SectionHeader title={t('farm_profile')} icon={<span>🏡</span>} />
        <Card>
          <CardContent className="space-y-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-sand-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-sand-500">{item.label}</p>
                  <p className="text-sm font-medium text-sand-900">{item.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <div>
        <SectionHeader title={t('settings.title')} icon={<span>⚙️</span>} />
        <Card>
          <CardContent className="divide-y divide-sand-200">
            {settingsItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center justify-between py-3 first:pt-0 last:pb-0 min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-sand-500" />
                  <span className="text-sm font-medium text-sand-900">{item.label}</span>
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
