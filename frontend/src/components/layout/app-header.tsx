import { useState } from 'react';
import { Bell, User, MapPin, Sprout, ShoppingBag, Globe, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import { useAuth } from '@/context/AuthContext';
import { useActiveLocation } from '@/context/LocationContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { LocationModal } from '@/components/domain/location-modal';

interface AppHeaderProps {
  farmerName?: string;
  location?: string;
  notificationCount?: number;
  className?: string;
}

function AppHeader({ farmerName, location: propLocation, notificationCount, className }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { farmer, user, role, isAuthenticated, logout, updateFarmerLocation } = useAuth();
  const { location: activeLoc } = useActiveLocation();
  const { notifications } = useNotifications();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);

  const cycleLanguage = () => {
    if (currentLanguage === 'mr') {
      changeLanguage('hi');
    } else if (currentLanguage === 'hi') {
      changeLanguage('en');
    } else {
      changeLanguage('mr');
    }
  };

  const displayName = farmerName || farmer?.name || user?.name;
  const activeLocation =
    propLocation ||
    (activeLoc.district && activeLoc.state
      ? `${activeLoc.district}, ${activeLoc.state}`
      : t('location.select_title'));

  const activeUnread =
    notificationCount !== undefined
      ? notificationCount
      : notifications.filter((n) => !n.read).length;

  const handleLocationUpdated = (newLoc: any) => {
    updateFarmerLocation(newLoc);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sand-200 shadow-xs',
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo & Greeting */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 cursor-pointer select-none"
                onClick={() => navigate(ROUTES.HOME)}
              >
                <Sprout className="h-6 w-6 text-agri-forest-800" />
                <span className="font-bold text-lg text-agri-forest-900 tracking-tight">
                  KisanIQ
                </span>
              </div>

              <div className="hidden sm:block h-6 w-px bg-sand-200" />

              <div className="hidden sm:flex flex-col">
                {isAuthenticated && displayName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-sand-900">
                      {t('greeting', { name: displayName })} {t('greeting_emoji')}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        role === 'buyer'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      )}
                    >
                      {role === 'buyer' ? t('auth.role_buyer') : t('auth.role_farmer')}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-sand-700">
                    {t('auth.guest_greeting')}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="text-xs text-agri-forest-800 hover:text-agri-forest-600 flex items-center gap-1 font-medium transition-colors cursor-pointer group mt-0.5"
                >
                  <MapPin className="h-3 w-3 text-agri-forest-700" />
                  <span>{activeLocation}</span>
                  <span className="text-[10px] bg-agri-forest-100 text-agri-forest-800 px-1.5 py-0.2 rounded group-hover:bg-agri-forest-200">
                    {t('buttons.change')}
                  </span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={cycleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sand-700 bg-sand-100 hover:bg-sand-200 transition-colors border border-sand-300"
                title={t('language.change')}
              >
                <Globe className="h-3.5 w-3.5 text-agri-forest-800" />
                <span>
                  {currentLanguage === 'mr'
                    ? 'मराठी'
                    : currentLanguage === 'hi'
                    ? 'हिन्दी'
                    : 'English'}
                </span>
              </button>

              {/* Direct Marketplace Link */}
              <button
                onClick={() => navigate(ROUTES.MARKETPLACE)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-agri-forest-800 bg-agri-forest-50 hover:bg-agri-forest-100 transition-colors border border-agri-forest-200"
                title="Direct Farmer-to-Buyer Marketplace"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{t('nav.marketplace')}</span>
              </button>

              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <button
                    onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                    className="relative p-2 rounded-lg text-sand-600 hover:bg-sand-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {activeUnread > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 bg-risk-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {activeUnread > 9 ? '9+' : activeUnread}
                      </span>
                    )}
                  </button>

                  {/* Profile */}
                  <button
                    onClick={() => navigate(ROUTES.PROFILE)}
                    className="p-2 rounded-lg text-sand-600 hover:bg-sand-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Profile"
                    title={displayName || 'Profile'}
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-sand-600 hover:bg-risk-red-50 hover:text-risk-red-600 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label={t('auth.logout')}
                    title={t('auth.logout')}
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigate(ROUTES.LOGIN)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-agri-forest-800 bg-white hover:bg-agri-forest-50 border border-agri-forest-700 transition-colors"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>{t('auth.login_button')}</span>
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.REGISTER)}
                    className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-agri-forest-800 hover:bg-agri-forest-700 transition-colors shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{t('auth.register_button')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile greeting (shown below header on mobile) */}
          <div className="sm:hidden pb-2.5 pt-0.5 flex items-center justify-between border-t border-sand-100">
            <div>
              {isAuthenticated && displayName ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-sand-900 block">
                    {t('greeting', { name: displayName })} {t('greeting_emoji')}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase px-1.5 py-0.2 rounded',
                      role === 'buyer'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    {role === 'buyer' ? 'Buyer' : 'Farmer'}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium text-sand-700">
                  {t('auth.guest_greeting')}
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="text-xs text-agri-forest-800 flex items-center gap-1 mt-0.5 font-medium"
              >
                <MapPin className="h-3 w-3 text-agri-forest-700" />
                <span>{activeLocation}</span>
                <span className="text-[10px] bg-sand-200 text-sand-700 px-1 rounded">
                  {t('buttons.change')}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-agri-forest-800 text-white rounded-lg font-medium"
                >
                  <LogIn className="h-3 w-3" />
                  <span>{t('auth.login_button')}</span>
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-sand-100 text-risk-red-600 rounded-lg font-medium border border-sand-200"
                >
                  <LogOut className="h-3 w-3" />
                  <span>{t('auth.logout')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLocation={{
          district: activeLoc.district,
          state: activeLoc.state,
          village: activeLoc.village,
        }}
        onLocationUpdated={handleLocationUpdated}
      />
    </>
  );
}

export { AppHeader };
