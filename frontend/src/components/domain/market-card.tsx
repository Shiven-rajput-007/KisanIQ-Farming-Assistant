import { MapPin, Truck, IndianRupee, TrendingUp, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIndianNumber } from '@/utils/format';
import type { MarketData } from '@/types';

const RISK_BADGE = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'caution' as const,
  critical: 'danger' as const,
};

interface MarketCardProps {
  market: MarketData;
  rank?: number;
  onWhyClick?: () => void;
  onClick?: () => void;
  className?: string;
}

function MarketCard({ market, rank, onWhyClick, onClick, className }: MarketCardProps) {
  const { t } = useTranslation('market');

  return (
    <Card
      className={cn(
        'transition-shadow',
        market.isRecommended && 'border-agri-leaf-300 ring-1 ring-agri-leaf-300/50',
        className
      )}
      onClick={onClick}
    >
      <CardContent>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {rank && (
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                rank === 1 ? 'bg-agri-gold-100 text-agri-gold-700' : 'bg-sand-200 text-sand-600'
              )}>
                {rank}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-sand-900">{market.name}</h3>
              <div className="flex items-center gap-1 text-xs text-sand-500 mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{market.distance} km</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={RISK_BADGE[market.riskLevel]}>
              {t(`common:status.${market.riskLevel}`)}
            </Badge>
            {market.isRecommended && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-agri-leaf-600">
                <Star className="h-3 w-3 fill-current" />
                {t('best_practical')}
              </span>
            )}
          </div>
        </div>

        {/* Price & Range */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div className="flex items-baseline gap-1">
            <IndianRupee className="h-5 w-5 text-sand-900" />
            <span className="text-2xl font-bold text-sand-900">{market.price.toLocaleString('en-IN')}</span>
            <span className="text-sm text-sand-600">/q</span>
            <span className="text-[11px] text-sand-500 font-medium ml-1">({t('card.modal_price')})</span>
          </div>

          {(market.minPrice !== undefined && market.maxPrice !== undefined) && (
            <div className="text-xs text-sand-700 font-medium bg-sand-100 px-2 py-0.5 rounded border border-sand-200">
              {t('card.min_price')}: ₹{market.minPrice.toLocaleString('en-IN')} — {t('card.max_price')}: ₹{market.maxPrice.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Arrival Date */}
        {market.arrivalDate && (
          <div className="flex items-center gap-1.5 text-xs text-sand-500 mb-3">
            <span>📅</span>
            <span>{t('card.arrival_date')}:</span>
            <span className="font-semibold text-sand-700">{market.arrivalDate}</span>
          </div>
        )}

        {/* Details grid */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-sand-600 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              {t('card.transport')}
            </span>
            <span className="font-medium text-sand-900">₹{formatIndianNumber(market.transportCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-600">{t('card.commission')}</span>
            <span className="font-medium text-sand-900">{market.commission}%</span>
          </div>
          <div className="pt-2 border-t border-sand-200 flex justify-between">
            <span className="text-sand-700 font-semibold">{t('card.net_return')}</span>
            <span className="text-lg font-bold text-agri-forest-800">₹{formatIndianNumber(market.netReturn)}</span>
          </div>
        </div>

        {/* Why CTA */}
        {onWhyClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onWhyClick();
            }}
            className="mt-3 w-full text-agri-forest-800"
          >
            {t('card.why_this')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { MarketCard };
