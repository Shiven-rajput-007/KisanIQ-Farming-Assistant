import { NavLink } from 'react-router-dom';
import { Home, Wheat, IndianRupee, MessageCircleQuestion, ShoppingBag, Settings, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import { useAuth } from '@/context/AuthContext';

const farmerNavItems = [
  { path: ROUTES.HOME, icon: Home, labelKey: 'nav.home' },
  { path: ROUTES.MERI_FASAL, icon: Wheat, labelKey: 'nav.meri_fasal' },
  { path: ROUTES.SOIL_TESTING, icon: FlaskConical, labelKey: 'nav.soil_testing' },
  { path: ROUTES.MARKET, icon: IndianRupee, labelKey: 'nav.bechein' },
  { path: ROUTES.ASSISTANT, icon: MessageCircleQuestion, labelKey: 'nav.madad' },
];

const buyerNavItems = [
  { path: ROUTES.MARKETPLACE, icon: ShoppingBag, labelKey: 'nav.marketplace' },
  { path: ROUTES.MARKET, icon: IndianRupee, labelKey: 'nav.mandi_rates' },
  { path: ROUTES.ASSISTANT, icon: MessageCircleQuestion, labelKey: 'nav.madad' },
  { path: ROUTES.SETTINGS, icon: Settings, labelKey: 'profile.settings' },
];

function BottomNav() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const navItems = role === 'buyer' ? buyerNavItems : farmerNavItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sand-200 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all active:scale-90',
                isActive
                  ? 'text-agri-forest-800'
                  : 'text-sand-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-1 rounded-lg transition-colors',
                  isActive && 'bg-agri-leaf-100'
                )}>
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  'text-[11px] mt-0.5 tracking-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export { BottomNav };
