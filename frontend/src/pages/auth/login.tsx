import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Phone, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/routes/paths';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('kisan123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await login(phone, password);
      if (res.role === 'buyer') {
        navigate(ROUTES.MARKETPLACE);
      } else {
        navigate(ROUTES.HOME);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = (demoPhone: string, demoPass: string) => {
    setPhone(demoPhone);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-agri-forest-100 flex items-center justify-center mx-auto mb-3">
            <Sprout className="h-9 w-9 text-agri-forest-800" />
          </div>
          <h1 className="text-2xl font-bold text-agri-forest-900 tracking-tight">KisanIQ</h1>
          <p className="text-sm text-sand-600 mt-1">{t('auth.login_subtitle')}</p>
        </div>

        <Card>
          <CardContent className="py-6">
            {/* Quick Demo Credentials */}
            <div className="mb-5 p-3 bg-agri-forest-50 border border-agri-forest-200 rounded-xl">
              <span className="text-xs font-bold text-agri-forest-900 block mb-2">
                ⚡ {t('auth.demo_farmers')}:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSelect('9876543210', 'kisan123')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                    phone === '9876543210'
                      ? 'bg-agri-forest-800 text-white border-agri-forest-800'
                      : 'bg-white text-sand-800 border-sand-300 hover:border-agri-forest-500'
                  }`}
                >
                  <p className="font-bold">{t('auth.role_farmer')}</p>
                  <p className="text-[10px] opacity-80">9876543210</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSelect('9123456780', 'buyer123')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                    phone === '9123456780'
                      ? 'bg-agri-forest-800 text-white border-agri-forest-800'
                      : 'bg-white text-sand-800 border-sand-300 hover:border-agri-forest-500'
                  }`}
                >
                  <p className="font-bold">{t('auth.role_buyer')}</p>
                  <p className="text-[10px] opacity-80">9123456780</p>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-risk-red-50 border border-risk-red-300 rounded-lg text-xs text-risk-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1">
                  {t('auth.phone_label')}
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-sand-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('auth.phone_placeholder')}
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1">
                  {t('auth.password_label')}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-sand-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                {isLoading ? t('auth.logging_in') : t('auth.login_button')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-sand-200 text-center text-xs text-sand-600">
              {t('auth.no_account')}{' '}
              <Link to={ROUTES.REGISTER} className="text-agri-forest-800 font-semibold hover:underline">
                {t('auth.register_here')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
