import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface OfflineBannerProps {
  lastUpdated?: string;
  className?: string;
}

function OfflineBanner({ lastUpdated, className }: OfflineBannerProps) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 bg-sand-200 text-sand-700 text-sm rounded-lg',
      className
    )}>
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {lastUpdated
          ? t('time.last_updated', { time: lastUpdated })
          : t('states.offline_description')}
      </span>
    </div>
  );
}

export { OfflineBanner };
