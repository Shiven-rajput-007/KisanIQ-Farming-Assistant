import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CropStageInfo } from '@/types';

interface CropTimelineProps {
  stages: CropStageInfo[];
  className?: string;
}

function CropTimeline({ stages, className }: CropTimelineProps) {
  const { t } = useTranslation('crop');

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {stages.map((stage, index) => (
          <div key={stage.stage} className="flex items-center">
            {/* Stage dot */}
            <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  stage.completed
                    ? 'bg-agri-leaf-600 text-white'
                    : stage.active
                    ? 'bg-agri-forest-800 text-white ring-4 ring-agri-forest-100'
                    : 'bg-sand-200 text-sand-500'
                )}
              >
                {stage.completed ? (
                  <Check className="h-4 w-4" />
                ) : stage.active ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : null}
              </div>
              <span
                className={cn(
                  'text-[10px] text-center leading-tight font-medium max-w-[60px]',
                  stage.active
                    ? 'text-agri-forest-800 font-semibold'
                    : stage.completed
                    ? 'text-agri-leaf-700'
                    : 'text-sand-500'
                )}
              >
                {t(`stages.${stage.stage}`)}
              </span>
            </div>

            {/* Connector line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 sm:w-8 -mx-0.5',
                  stage.completed ? 'bg-agri-leaf-500' : 'bg-sand-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { CropTimeline };
