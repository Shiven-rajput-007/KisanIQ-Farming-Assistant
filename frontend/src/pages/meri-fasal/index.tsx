import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2 } from 'lucide-react';
import { CropCard } from '@/components/domain/crop-card';
import { CropTimeline } from '@/components/domain/crop-timeline';
import { CropHealthGrid } from '@/components/domain/crop-health-grid';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoBanner } from '@/components/ui/demo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useCrops } from '@/hooks/useCrops';
import { cropApi } from '@/api';
import { ROUTES } from '@/routes/paths';

export default function MeriFasalPage() {
  const { t } = useTranslation('crop');
  const navigate = useNavigate();
  const { data, isLoading, error, isFallback, refetch } = useCrops();
  const [isAddingCrop, setIsAddingCrop] = useState(false);
  const [newCropName, setNewCropName] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState onRetry={refetch} description={error} />;
  }

  if (!data) return null;
  const { crops, stages, actions } = data;
  const primaryCrop = crops[0];

  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName.trim()) return;
    try {
      await cropApi.createCrop({
        name: newCropName,
        variety: 'Desi / Improved',
        area: 5,
        sowingDate: new Date().toISOString().split('T')[0],
      });
      setNewCropName('');
      setIsAddingCrop(false);
      refetch();
    } catch (err) {
      console.error('Failed to create crop:', err);
    }
  };

  return (
    <div className="space-y-5">
      {isFallback && <DemoBanner className="mb-2" />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
        <Button variant="secondary" size="sm" onClick={() => setIsAddingCrop(!isAddingCrop)}>
          <Plus className="h-4 w-4" />
          {t('empty.cta')}
        </Button>
      </div>

      {isAddingCrop && (
        <Card className="p-4 border-agri-forest-500">
          <form onSubmit={handleCreateCrop} className="space-y-3">
            <h3 className="text-sm font-semibold text-sand-900">{t('empty.cta')}</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                placeholder={t('crop_name_placeholder', { defaultValue: 'e.g. Wheat, Mustard...' })}
                className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm bg-white"
                required
              />
              <Button type="submit" variant="primary" size="sm">{t('common:buttons.save', { defaultValue: 'Save' })}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Primary crop card */}
      {primaryCrop ? (
        <CropCard
          crop={primaryCrop}
          onClick={() => navigate(ROUTES.CROP_DETAIL(primaryCrop.id))}
        />
      ) : (
        <p className="text-sm text-sand-600">{t('empty.title')}</p>
      )}

      {/* Growth Timeline */}
      {stages && stages.length > 0 && (
        <div>
          <SectionHeader title={t('timeline_title')} icon={<span>📊</span>} />
          <Card>
            <CardContent className="py-4">
              <CropTimeline stages={stages} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Crop Health */}
      {primaryCrop && (
        <div>
          <SectionHeader title={t('health.title')} icon={<span>🌱</span>} />
          <CropHealthGrid health={primaryCrop.health} />
        </div>
      )}

      {/* Crop Actions */}
      <div>
        <SectionHeader title={t('actions_title')} icon={<span>📋</span>} />
        <div className="space-y-2">
          {actions.map((action) => (
            <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{action.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-sand-900">
                      {t(`crop_actions.${action.type}`, { defaultValue: action.titleKey })}
                    </p>
                    <p className="text-xs text-sand-600 mt-0.5">{action.descriptionKey}</p>
                  </div>
                  {action.completed && <CheckCircle2 className="h-5 w-5 text-agri-leaf-600" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
