import { useTranslation } from 'react-i18next';
import { RiskOverview } from '@/components/domain/risk-overview';
import { AlertCard } from '@/components/domain/alert-card';
import { SectionHeader } from '@/components/ui/section-header';
import { DemoBanner } from '@/components/ui/demo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useRisk } from '@/hooks/useRisk';

export default function RiskPage() {
  const { t } = useTranslation('risk');
  const { data, isLoading, error, isFallback, refetch } = useRisk();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState onRetry={refetch} description={error} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {isFallback && <DemoBanner className="mb-2" />}

      <h1 className="text-xl font-bold text-sand-900 flex items-center gap-2">
        <span>🛡️</span> {t('title')}
      </h1>

      <RiskOverview assessment={data} />

      {data.alerts && data.alerts.length > 0 && (
        <div>
          <SectionHeader title={t('attention.title')} icon={<span>⚠️</span>} />
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <AlertCard key={alert.id} alert={{ ...alert, timestamp: alert.timestamp || data.lastUpdated }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
