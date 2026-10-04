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
  const { logout, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated && !farmer) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
        <Card className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-agri-forest-100 flex items-center justify-center text-2xl mx-auto mb-3">
            👨‍🌾
          </div>
          <h2 className="text-base font-bold text-sand-900 mb-1">{t('unauthenticated_title', { defaultValue: 'Welcome to KisanIQ' })}</h2>
          <p className="text-xs text-sand-600 mb-4 max-w-sm mx-auto">
            {t('unauthenticated_desc', { defaultValue: 'Log in or register your account to view your farm details, soil reports, and mandi prices.' })}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="px-4 py-2 bg-agri-forest-800 text-white rounded-xl text-xs font-semibold hover:bg-agri-forest-700"
            >
              {t('common:buttons.login', { defaultValue: 'Login' })}
            </button>
            <button
              onClick={() => navigate(ROUTES.REGISTER)}
              className="px-4 py-2 bg-sand-200 text-sand-800 rounded-xl text-xs font-semibold hover:bg-sand-300"
            >
              {t('common:buttons.register', { defaultValue: 'Register' })}
            </button>
          </div>
        </Card>

        {/* Settings */}
        <div>
          <SectionHeader title={t('settings.title')} icon={<span>⚙️</span>} />
          <Card>
            <CardContent className="divide-y divide-sand-200">
              <button
                onClick={() => navigate(ROUTES.LANGUAGE_SELECT)}
                className="w-full flex items-center justify-between py-3 min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-sand-500" />
                  <span className="text-sm font-medium text-sand-900">{t('settings.language')}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-sand-400" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayName = farmer?.name || user?.name || t('unnamed_user', { defaultValue: 'Farmer' });
  const displayLocation = farmer?.location?.district
    ? `${farmer.location.district}${farmer.location.state ? `, ${farmer.location.state}` : ''}`
    : farmer?.location?.state || t('common:states.not_specified', { defaultValue: 'Not specified' });

  const infoItems = [
    {
      icon: MapPin,
      label: t('fields.location'),
      value: displayLocation,
    },
    {
      icon: Mountain,
      label: t('fields.farm_size'),
      value: farmProfile?.totalArea ? `${farmProfile.totalArea} acres` : t('common:states.not_specified', { defaultValue: 'Not specified' }),
    },
    {
      icon: Wheat,
      label: t('fields.main_crop'),
      value: (farmProfile?.crops && farmProfile.crops.length > 0)
        ? farmProfile.crops.join(', ')
        : t('common:states.not_specified', { defaultValue: 'Not specified' }),
    },
    {
      icon: Droplets,
      label: t('fields.irrigation'),
      value: farmProfile?.irrigationSource
        ? t(`irrigation_types.${farmProfile.irrigationSource}`, { defaultValue: farmProfile.irrigationSource })
        : t('common:states.not_specified', { defaultValue: 'Not specified' }),
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
              <h2 className="text-lg font-bold text-sand-900">{displayName}</h2>
              <p className="text-sm text-sand-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {displayLocation}
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
