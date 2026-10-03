import { ChevronRight, TrendingUp, IndianRupee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPricePerQuintal } from '@/utils/format';
import type { RiskLevel } from '@/types';

const RISK_BADGE_VARIANT = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'caution' as const,
  critical: 'danger' as const,
};

interface FasalBechniCardProps {
  cropName: string;
  bestMarketName: string;
  bestPrice: number;
  riskLevel: RiskLevel;
  onClick?: () => void;
  className?: string;
}

function FasalBechniCard({ cropName, bestMarketName, bestPrice, riskLevel, onClick, className }: FasalBechniCardProps) {
  const { t } = useTranslation('home');

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow border-agri-gold-300/50', className)}
      onClick={onClick}
    >
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h3 className="text-base font-bold text-sand-900">{t('selling.title')}</h3>
          </div>
          <Badge variant={RISK_BADGE_VARIANT[riskLevel]}>
            {t(`common:status.${riskLevel}`)} Risk
          </Badge>
        </div>

        <p className="text-sm text-sand-600 mb-3">{t('selling.subtitle')}</p>

        <div className="flex items-center justify-between p-3 bg-agri-leaf-50 rounded-lg border border-agri-leaf-300/50">
          <div>
            <p className="text-xs text-sand-600">{t('selling.best_option')}</p>
            <p className="text-sm font-semibold text-sand-900">{bestMarketName}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-agri-leaf-600">
              <IndianRupee className="h-4 w-4" />
              <span className="text-lg font-bold">{bestPrice.toLocaleString('en-IN')}</span>
              <span className="text-xs text-sand-600">/q</span>
            </div>
          </div>
        </div>

        <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-agri-forest-800 hover:text-agri-forest-600 transition-colors min-h-[44px] active:scale-[0.97]">
          {t('selling.compare_cta')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}

export { FasalBechniCard };
