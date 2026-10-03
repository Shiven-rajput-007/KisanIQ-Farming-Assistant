import { ShieldCheck, ShieldAlert, Cloud, Bug, IndianRupee, Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskAssessment, RiskLevel } from '@/types';

const RISK_BADGE = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'caution' as const,
  critical: 'danger' as const,
};

const RISK_BG = {
  low: 'bg-agri-leaf-50 border-agri-leaf-300',
  medium: 'bg-agri-gold-50 border-agri-gold-300',
  high: 'bg-risk-amber-50 border-risk-amber-500/30',
  critical: 'bg-risk-red-50 border-risk-red-500/30',
};

const RISK_ICON_MAP: Record<string, typeof Cloud> = {
  weather: Cloud,
  crop_health: Bug,
  market: IndianRupee,
  water: Droplets,
};

interface RiskOverviewProps {
  assessment: RiskAssessment;
  className?: string;
}

function RiskOverview({ assessment, className }: RiskOverviewProps) {
  const { t } = useTranslation('risk');

  const OverallIcon = assessment.overallRisk === 'low' || assessment.overallRisk === 'medium'
    ? ShieldCheck : ShieldAlert;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall risk */}
      <Card className={cn('border', RISK_BG[assessment.overallRisk])}>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OverallIcon className={cn('h-8 w-8', assessment.overallRisk === 'low' ? 'text-agri-leaf-600' : 'text-risk-amber-500')} />
              <div>
                <p className="text-sm text-sand-600">{t('overall')}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={RISK_BADGE[assessment.overallRisk]} className="text-sm px-4 py-1">
                    {t(`common:status.${assessment.overallRisk}`)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-sand-500">{t('risk_index')}</p>
              <p className="text-2xl font-bold text-sand-900">{assessment.riskScore}<span className="text-sm text-sand-500">/100</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {assessment.categories.map((cat) => {
          const IconComp = RISK_ICON_MAP[cat.type] || Cloud;
          return (
            <div
              key={cat.id}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-sand-200"
            >
              <IconComp className="h-4 w-4 text-sand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sand-600 truncate">{t(`categories.${cat.type}`)}</p>
                <Badge variant={RISK_BADGE[cat.level]} className="mt-1">
                  {t(`common:status.${cat.level}`)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { RiskOverview };
