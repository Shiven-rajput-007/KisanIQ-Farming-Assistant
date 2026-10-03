import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-risk-amber-100 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-risk-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-sand-900 mb-1">
        {title || t('states.error_title')}
      </h3>
      <p className="text-sm text-sand-600 mb-6 max-w-sm">
        {description || t('states.error_description')}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('buttons.retry')}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
