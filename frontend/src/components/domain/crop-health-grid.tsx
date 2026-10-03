import { Cloud, Bug, Droplets, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CropHealth } from '@/types';

const BADGE_VARIANT = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'caution' as const,
  critical: 'danger' as const,
};

interface CropHealthGridProps {
  health: CropHealth;
  className?: string;
}

function CropHealthGrid({ health, className }: CropHealthGridProps) {
  const { t } = useTranslation('crop');

  const items = [
    { icon: Leaf, label: t('health.overall'), level: health.overall },
    { icon: Cloud, label: t('health.weather_risk'), level: health.weatherRisk },
    { icon: Bug, label: t('health.disease_risk'), level: health.diseaseRisk },
    { icon: Droplets, label: t('health.water_status'), level: health.waterStatus },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-sand-200"
        >
          <item.icon className="h-4 w-4 text-sand-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sand-600 truncate">{item.label}</p>
            <Badge variant={BADGE_VARIANT[item.level]} className="mt-1">
              {t(`common:status.${item.level}`)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export { CropHealthGrid };
