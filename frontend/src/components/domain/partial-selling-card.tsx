import { ArrowRight, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIndianNumber } from '@/utils/format';
import type { PartialSelling } from '@/types';

interface PartialSellingCardProps {
  data: PartialSelling;
  onSeeCalculation?: () => void;
  className?: string;
}

function PartialSellingCard({ data, onSeeCalculation, className }: PartialSellingCardProps) {
  const { t } = useTranslation('market');

  return (
    <Card className={cn('border-agri-gold-300/50', className)}>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💡</span>
          <h3 className="text-base font-bold text-sand-900">{t('partial.title')}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Sell Now */}
          <div className="p-3 rounded-xl bg-agri-leaf-50 border border-agri-leaf-300/50">
            <p className="text-xs font-bold text-agri-leaf-700 uppercase tracking-wider mb-1">
              {data.sellNow.quantity}q <ArrowRight className="inline h-3 w-3" /> {t('partial.sell_now')}
            </p>
            <p className="text-sm font-semibold text-sand-900">{data.sellNow.marketName}</p>
            <p className="text-xs text-sand-600 mt-1">
              ≈ ₹{formatIndianNumber(data.sellNow.estimatedReturn)}
            </p>
          </div>

          {/* Hold */}
          <div className="p-3 rounded-xl bg-agri-gold-50 border border-agri-gold-300/50">
            <p className="text-xs font-bold text-agri-gold-700 uppercase tracking-wider mb-1">
              {data.holdFor.quantity}q <ArrowRight className="inline h-3 w-3" /> {t('partial.hold')}
            </p>
            <p className="text-sm text-sand-700">{data.holdFor.reason}</p>
            {data.holdFor.expectedPriceRange && (
              <p className="text-xs text-sand-600 mt-1">
                ₹{formatIndianNumber(data.holdFor.expectedPriceRange.min)}-{formatIndianNumber(data.holdFor.expectedPriceRange.max)}/q
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-sand-600 italic mb-3">{t('partial.reason_attractive')}</p>

        {onSeeCalculation && (
          <Button variant="ghost" size="sm" onClick={onSeeCalculation} className="w-full">
            <Calculator className="h-4 w-4" />
            {t('partial.see_calculation')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { PartialSellingCard };
