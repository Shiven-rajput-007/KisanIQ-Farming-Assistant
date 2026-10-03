import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { FlaskConical } from 'lucide-react';

interface DemoBannerProps {
  className?: string;
}

function DemoBanner({ className }: DemoBannerProps) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 bg-agri-gold-100 text-agri-gold-700 text-xs font-medium rounded-full border border-agri-gold-300',
      className
    )}>
      <FlaskConical className="h-3 w-3" />
      {t('states.demo_label')}
    </div>
  );
}

export { DemoBanner };
