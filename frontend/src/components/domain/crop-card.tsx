import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';

const HEALTH_BADGE = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'caution' as const,
  critical: 'danger' as const,
};

interface CropCardProps {
  crop: Crop;
  onClick?: () => void;
  className?: string;
}

function CropCard({ crop, onClick, className }: CropCardProps) {
  const { t } = useTranslation('crop');

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onClick}
    >
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{crop.icon || '🌾'}</span>
            <div>
              <h3 className="text-base font-bold text-sand-900">
                {t(`crops.${crop.nameKey}`, { defaultValue: crop.name })}
              </h3>
              <p className="text-xs text-sand-600">
                {t('common:units.days_old', { count: crop.daysOld })}
              </p>
            </div>
          </div>
          <Badge variant={HEALTH_BADGE[crop.health.overall]}>
            {t(`common:status.${crop.health.overall}`)}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-agri-leaf-500" />
            <span className="text-sm text-sand-700 font-medium">
              {t(`stages.${crop.currentStage}`)}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-sand-400" />
        </div>
      </CardContent>
    </Card>
  );
}

export { CropCard };
