import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { LanguageSelector } from '@/components/domain/language-selector';
import { useLanguage } from '@/hooks/useLanguage';
import { farmerApi } from '@/api';
import { ROUTES } from '@/routes/paths';
import type { SupportedLanguage } from '@/types';

const STEPS = ['language', 'name', 'location', 'farm_size', 'crop', 'soil'] as const;

export default function OnboardingPage() {
  const { t } = useTranslation('profile');
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    language: currentLanguage,
    name: '',
    location: '',
    farmSize: '5',
    crop: 'wheat',
    soil: 'alluvial',
  });

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      try {
        await farmerApi.saveOnboarding(formData);
      } catch (err) {
        console.warn('Could not sync onboarding to backend, continuing:', err);
      } finally {
        setIsSubmitting(false);
        navigate(ROUTES.HOME);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Sprout className="h-10 w-10 text-agri-forest-800 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-agri-forest-900">
            {t('onboarding.welcome')}
          </h1>
        </div>

        {/* Progress */}
        <ProgressIndicator currentStep={step} totalSteps={STEPS.length} />
        <p className="text-center text-sm text-sand-600">
          {t('onboarding.step_of', { current: step + 1, total: STEPS.length })}
        </p>

        {/* Step Content */}
        <Card>
          <CardContent className="py-6">
            {STEPS[step] === 'language' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4 text-center">
                  {t('onboarding.step_language')}
                </h2>
                <LanguageSelector
                  currentLanguage={formData.language as SupportedLanguage}
                  onSelect={(lang) => {
                    setFormData({ ...formData, language: lang });
                    changeLanguage(lang);
                  }}
                />
              </div>
            )}

            {STEPS[step] === 'name' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4">
                  {t('onboarding.step_name')}
                </h2>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('fields.name')}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-white text-sand-900 text-base focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>
            )}

            {STEPS[step] === 'location' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4">
                  {t('onboarding.step_location')}
                </h2>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={t('fields.location')}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-white text-sand-900 text-base focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>
            )}

            {STEPS[step] === 'farm_size' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4">
                  {t('onboarding.step_farm_size')}
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.farmSize}
                    onChange={(e) => setFormData({ ...formData, farmSize: e.target.value })}
                    placeholder="5"
                    className="flex-1 px-4 py-3 rounded-xl border border-sand-200 bg-white text-sand-900 text-base focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  />
                  <span className="text-sand-600 font-medium">acres</span>
                </div>
              </div>
            )}

            {STEPS[step] === 'crop' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4">
                  {t('onboarding.step_crop')}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {['wheat', 'rice', 'cotton', 'sugarcane', 'maize', 'soybean'].map((crop) => (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => setFormData({ ...formData, crop })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        formData.crop === crop
                          ? 'border-agri-forest-800 bg-agri-forest-50 text-agri-forest-800'
                          : 'border-sand-200 text-sand-700 hover:border-sand-300'
                      }`}
                    >
                      {t(`crop:crops.${crop}`, { defaultValue: crop.toUpperCase() })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {STEPS[step] === 'soil' && (
              <div>
                <h2 className="text-lg font-bold text-sand-900 mb-4">
                  {t('onboarding.step_soil')}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {['alluvial', 'black', 'red', 'sandy', 'clayey', 'loamy'].map((soil) => (
                    <button
                      key={soil}
                      type="button"
                      onClick={() => setFormData({ ...formData, soil })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        formData.soil === soil
                          ? 'border-agri-forest-800 bg-agri-forest-50 text-agri-forest-800'
                          : 'border-sand-200 text-sand-700 hover:border-sand-300'
                      }`}
                    >
                      {t(`soil_types.${soil}`, { defaultValue: soil.toUpperCase() })}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack} className="flex-1" disabled={isSubmitting}>
              {t('common:buttons.back')}
            </Button>
          )}
          <Button variant="primary" onClick={handleNext} className="flex-1" isLoading={isSubmitting}>
            {step === STEPS.length - 1 ? t('onboarding.get_started') : t('common:buttons.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
