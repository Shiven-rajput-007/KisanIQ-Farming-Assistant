import { AlertTriangle, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';

const SEVERITY_STYLES = {
  low: {
    bg: 'bg-agri-leaf-50',
    border: 'border-agri-leaf-300',
    icon: Info,
    iconColor: 'text-agri-leaf-600',
    titleColor: 'text-agri-leaf-800',
  },
  medium: {
    bg: 'bg-agri-gold-50',
    border: 'border-agri-gold-300',
    icon: AlertTriangle,
    iconColor: 'text-agri-gold-600',
    titleColor: 'text-agri-gold-700',
  },
  high: {
    bg: 'bg-risk-amber-50',
    border: 'border-risk-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-risk-amber-500',
    titleColor: 'text-risk-amber-600',
  },
  critical: {
    bg: 'bg-risk-red-50',
    border: 'border-risk-red-500/30',
    icon: AlertCircle,
    iconColor: 'text-risk-red-500',
    titleColor: 'text-risk-red-600',
  },
};

interface AlertCardProps {
  alert: Alert;
  onDetails?: () => void;
  className?: string;
}

function AlertCard({ alert, onDetails, className }: AlertCardProps) {
  const styles = SEVERITY_STYLES[alert.severity];
  const IconComponent = styles.icon;

  return (
    <Card className={cn(styles.bg, 'border', styles.border, className)}>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <IconComponent className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn('text-sm font-bold uppercase tracking-wide', styles.titleColor)}>
              ⚠️ {alert.titleKey}
            </h3>
            <p className="text-sm text-sand-700 mt-1">{alert.descriptionKey}</p>
            {onDetails && (
              <button
                onClick={onDetails}
                className={cn(
                  'mt-2 inline-flex items-center gap-1 text-sm font-semibold transition-colors min-h-[44px] active:scale-[0.95]',
                  styles.titleColor
                )}
              >
                Details
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { AlertCard };
