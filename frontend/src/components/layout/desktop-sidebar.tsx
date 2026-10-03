import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Wheat,
  IndianRupee,
  MessageCircleQuestion,
  Cloud,
  ShieldAlert,
  Settings,
  Sprout,
  ShoppingBag,
  LogIn,
  UserPlus,
  LogOut,
  User,
  FlaskConical,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import { useAuth } from '@/context/AuthContext';

const farmerNavItems = [
  { path: ROUTES.HOME, icon: Home, labelKey: 'nav.home' },
  { path: ROUTES.MERI_FASAL, icon: Wheat, labelKey: 'nav.meri_fasal' },
  { path: ROUTES.SOIL_TESTING, icon: FlaskConical, labelKey: 'nav.soil_testing' },
  { path: ROUTES.MARKET, icon: IndianRupee, labelKey: 'nav.bechein' },
  { path: ROUTES.MARKETPLACE, icon: ShoppingBag, labelKey: 'nav.marketplace' },
  { path: ROUTES.WEATHER, icon: Cloud, labelKey: 'weather:title' },
  { path: ROUTES.RISK, icon: ShieldAlert, labelKey: 'risk:title' },
  { path: ROUTES.ASSISTANT, icon: MessageCircleQuestion, labelKey: 'nav.madad' },
];

const buyerNavItems = [
  { path: ROUTES.MARKETPLACE, icon: ShoppingBag, labelKey: 'nav.marketplace' },
  { path: ROUTES.MARKET, icon: IndianRupee, labelKey: 'nav.mandi_rates' },
  { path: ROUTES.WEATHER, icon: Cloud, labelKey: 'weather:title' },
  { path: ROUTES.ASSISTANT, icon: MessageCircleQuestion, labelKey: 'nav.madad' },
];

const bottomNavItems = [
  { path: ROUTES.SETTINGS, icon: Settings, labelKey: 'profile.settings' },
];

function DesktopSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { farmer, user, role, isAuthenticated, logout } = useAuth();
  const mainNavItems = role === 'buyer' ? buyerNavItems : farmerNavItems;

  const displayName = farmer?.name || user?.name;

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-sand-200 z-30">
      {/* Logo */}
      <div
        className="flex h-16 items-center px-5 gap-2 border-b border-sand-200 cursor-pointer"
        onClick={() => navigate(ROUTES.HOME)}
      >
        <Sprout className="h-6 w-6 text-agri-forest-800" />
        <span className="font-bold text-lg text-agri-forest-900 tracking-tight">KisanIQ</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-agri-forest-50 text-agri-forest-800 font-semibold'
                  : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section: Settings + Auth */}
      <div className="px-3 py-3 border-t border-sand-200 space-y-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-agri-forest-50 text-agri-forest-800'
                  : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900'
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {t(item.labelKey)}
          </NavLink>
        ))}

        {/* User Card / Login CTA */}
        {isAuthenticated ? (
          <div className="pt-2 border-t border-sand-100">
            <div className="flex items-center justify-between p-2 rounded-lg bg-sand-50 border border-sand-200">
              <div
                className="flex items-center gap-2 overflow-hidden cursor-pointer"
                onClick={() => navigate(ROUTES.PROFILE)}
              >
                <div className="w-8 h-8 rounded-full bg-agri-forest-100 text-agri-forest-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-sand-900 truncate">
                    {displayName || 'User'}
                  </p>
                  <p className="text-[10px] text-agri-forest-700 font-medium capitalize">
                    {role === 'buyer' ? t('auth.role_buyer') : t('auth.role_farmer')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate(ROUTES.LOGIN);
                }}
                className="p-1.5 rounded-md text-sand-500 hover:text-risk-red-600 hover:bg-risk-red-50 transition-colors"
                title={t('auth.logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-sand-100 space-y-1.5">
            <NavLink
              to={ROUTES.LOGIN}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold text-agri-forest-800 bg-sand-100 hover:bg-sand-200 transition-colors border border-sand-300"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t('auth.login_button')}</span>
            </NavLink>
            <NavLink
              to={ROUTES.REGISTER}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-agri-forest-800 hover:bg-agri-forest-700 transition-colors shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('auth.register_button')}</span>
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}

export { DesktopSidebar };
