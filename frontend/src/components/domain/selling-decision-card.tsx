import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Clock,
  CloudRain,
  Scale,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  IndianRupee,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIndianNumber } from '@/utils/format';
import type { SellingDecision } from '@/types';

interface SellingDecisionCardProps {
  decision: SellingDecision;
  totalQuantity: number;
  onQuickSell?: (quantity: number) => void;
  className?: string;
}

export function SellingDecisionCard({
  decision,
  totalQuantity,
  onQuickSell,
  className,
}: SellingDecisionCardProps) {
  const { t } = useTranslation(['market', 'common']);
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [showWhyDetails, setShowWhyDetails] = useState(true);

  if (!decision) return null;

  // Visual configuration based on Action
  const getActionConfig = (action: SellingDecision['action']) => {
    switch (action) {
      case 'SELL_NOW':
        return {
          icon: TrendingUp,
          bgHeader: 'bg-emerald-600 text-white',
          borderCard: 'border-emerald-300 ring-1 ring-emerald-200',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          label: t('decision.action_sell_now', { defaultValue: 'SELL NOW' }),
          tagline: t('decision.tagline_sell_now', { defaultValue: 'Peak Net Realization' }),
        };
      case 'HOLD':
        return {
          icon: Clock,
          bgHeader: 'bg-amber-600 text-white',
          borderCard: 'border-amber-300 ring-1 ring-amber-200',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
          label: t('decision.action_hold', { defaultValue: 'HOLD' }),
          tagline: t('decision.tagline_hold', { defaultValue: 'Upward Price Momentum' }),
        };
      case 'WAIT':
        return {
          icon: CloudRain,
          bgHeader: 'bg-blue-600 text-white',
          borderCard: 'border-blue-300 ring-1 ring-blue-200',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
          label: t('decision.action_wait', { defaultValue: 'WAIT' }),
          tagline: t('decision.tagline_wait', { defaultValue: 'Transit / Weather Alert' }),
        };
      case 'PARTIAL_SELL':
        return {
          icon: Scale,
          bgHeader: 'bg-teal-700 text-white',
          borderCard: 'border-teal-300 ring-1 ring-teal-200',
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
          label: t('decision.action_partial_sell', { defaultValue: 'PARTIAL SELL (60/40)' }),
          tagline: t('decision.tagline_partial_sell', { defaultValue: 'Balanced Risk Hedge' }),
        };
      case 'INSUFFICIENT_DATA':
      default:
        return {
          icon: AlertCircle,
          bgHeader: 'bg-sand-700 text-white',
          borderCard: 'border-sand-300',
          badgeBg: 'bg-sand-100 text-sand-800 border-sand-300',
          label: t('decision.action_insufficient_data', { defaultValue: 'AWAITING DATA' }),
          tagline: t('decision.tagline_insufficient_data', { defaultValue: 'Synchronizing Agmarknet' }),
        };
    }
  };

  const config = getActionConfig(decision.action);
  const ActionIcon = config.icon;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'high':
      case 'critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-sand-700 bg-sand-50 border-sand-200';
    }
  };

  const split = decision.partialSplit;
  const sellNowQty = split?.sellNowQuantity ?? Math.round(totalQuantity * 0.6);
  const holdQty = split?.holdQuantity ?? (totalQuantity - sellNowQty);

  return (
    <Card className={cn('overflow-hidden shadow-sm transition-all', config.borderCard, className)}>
      {/* Top Banner with Action Badge */}
      <div className={cn('px-4 py-3 flex flex-wrap items-center justify-between gap-3', config.bgHeader)}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
            <ActionIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide uppercase">
                {config.label}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                {config.tagline}
              </span>
            </div>
            {decision.timeHorizon && (
              <p className="text-xs text-white/90 font-medium mt-0.5">
                ⏱️ {decision.timeHorizon}
              </p>
            )}
          </div>
        </div>

        {/* Risk Score Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-sand-900 shadow-2xs">
            🛡️ {t('decision.risk_score', { defaultValue: 'Risk' })}: {decision.riskScore}/100 ({t(`common:status.${decision.overallRisk}`, { defaultValue: decision.overallRisk })})
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            {decision.confidence.toUpperCase()} CONFIDENCE
          </span>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {decision.primaryMarketName && (
            <div className="p-3 bg-sand-50 rounded-xl border border-sand-200">
              <span className="text-xs text-sand-600 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-agri-forest-700" />
                {t('decision.top_mandi', { defaultValue: 'Recommended Mandi' })}
              </span>
              <p className="text-sm font-bold text-sand-900 mt-1 truncate">
                {decision.primaryMarketName}
              </p>
              {decision.primaryPrice && (
                <p className="text-xs text-sand-600 mt-0.5">
                  Modal: <strong>₹{formatIndianNumber(decision.primaryPrice)}/q</strong>
                </p>
              )}
            </div>
          )}

          {decision.effectiveRealizedPrice !== undefined && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 flex items-center gap-1 font-semibold">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-700" />
                {t('decision.net_realization', { defaultValue: 'Net Realization' })}
              </span>
              <p className="text-base font-extrabold text-emerald-900 mt-1">
                ₹{formatIndianNumber(decision.effectiveRealizedPrice)}
                <span className="text-xs font-normal text-emerald-700"> /quintal</span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                (After freight & APMC cess)
              </p>
            </div>
          )}

          {decision.expectedNetReturn !== undefined && (
            <div className="p-3 bg-agri-forest-50 rounded-xl border border-agri-forest-200">
              <span className="text-xs text-agri-forest-800 flex items-center gap-1 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-agri-forest-700" />
                {t('decision.total_net_return', { defaultValue: 'Estimated Total Net' })}
              </span>
              <p className="text-base font-extrabold text-agri-forest-900 mt-1">
                ₹{formatIndianNumber(decision.expectedNetReturn)}
              </p>
              <p className="text-[11px] text-agri-forest-700 mt-0.5">
                for {totalQuantity} quintals
              </p>
            </div>
          )}
        </div>

        {/* Suggested Action Callout */}
        <div className="p-3 bg-agri-gold-50 border border-agri-gold-300 rounded-xl text-xs sm:text-sm text-sand-900">
          <p className="font-bold text-agri-gold-900 flex items-center gap-1.5 mb-1">
            <span>📢</span> {t('decision.action_recommendation', { defaultValue: 'Actionable Guidance' })}
          </p>
          <p className="leading-relaxed font-medium text-sand-800">
            {decision.suggestedAction}
          </p>
        </div>

        {/* 60/40 Partial Selling Interactive Visual (When PARTIAL_SELL) */}
        {decision.action === 'PARTIAL_SELL' && (
          <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-teal-800" />
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                  {t('decision.strategy_6040', { defaultValue: 'Recommended 60/40 Split Strategy' })}
                </span>
              </div>
              <span className="text-xs font-semibold text-teal-700">
                Total: {totalQuantity}q
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 60% Sell Portion */}
              <div className="p-3 bg-white rounded-lg border border-teal-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    🟢 Sell 60% Now
                  </span>
                  <span className="text-xs font-extrabold text-sand-900">
                    {sellNowQty} quintals
                  </span>
                </div>
                <p className="text-xs text-sand-600 mb-2">
                  Locks in immediate liquidity at current auction peak.
                </p>
                {split?.sellNowReturn && (
                  <p className="text-xs font-bold text-emerald-700">
                    Est. Return: ₹{formatIndianNumber(split.sellNowReturn)}
                  </p>
                )}
                {onQuickSell && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full mt-2 text-xs h-8 bg-emerald-700 hover:bg-emerald-800"
                    onClick={() => onQuickSell(sellNowQty)}
                  >
                    Quick Sell {sellNowQty}q <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              {/* 40% Hold Portion */}
              <div className="p-3 bg-white rounded-lg border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-800 uppercase">
                    🟡 Hold 40%
                  </span>
                  <span className="text-xs font-extrabold text-sand-900">
                    {holdQty} quintals
                  </span>
                </div>
                <p className="text-xs text-sand-600 mb-2">
                  Stored in dry aeration to capture potential late-season upside.
                </p>
                {split?.holdEstimatedReturn && (
                  <p className="text-xs font-bold text-amber-700">
                    Est. Value: ₹{formatIndianNumber(split.holdEstimatedReturn)}
                  </p>
                )}
                <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded mt-2 font-medium">
                  Holding duration: 1-2 weeks
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explainable "Why?" Drivers Section */}
        {decision.reasons && decision.reasons.length > 0 && (
          <div className="border-t border-sand-200 pt-3">
            <button
              type="button"
              onClick={() => setShowWhyDetails(!showWhyDetails)}
              className="w-full flex items-center justify-between text-xs font-bold text-sand-800 hover:text-agri-forest-800 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-agri-forest-700" />
                {t('decision.why_drivers_title', { defaultValue: 'Economic & Market Drivers ("Why?")' })}
              </span>
              {showWhyDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showWhyDetails && (
              <ul className="mt-2.5 space-y-1.5 pl-2">
                {decision.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-sand-700 flex items-start gap-2">
                    <span className="text-agri-forest-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 5-Dimensional Risk Score Breakdown Section */}
        {decision.riskBreakdown && (
          <div className="border-t border-sand-200 pt-3">
            <button
              type="button"
              onClick={() => setShowRiskDetails(!showRiskDetails)}
              className="w-full flex items-center justify-between text-xs font-bold text-sand-800 hover:text-agri-forest-800 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>📊</span>
                {t('decision.risk_dimensions_title', { defaultValue: '5-Factor Risk Breakdown' })}
              </span>
              {showRiskDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showRiskDetails && (
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(decision.riskBreakdown).map(([key, dim]) => {
                  const labelMap: Record<string, string> = {
                    marketRisk: 'Market Price Risk',
                    weatherRisk: 'Weather / Rain Risk',
                    storageRisk: 'Storage Rot Risk',
                    volatilityRisk: 'Volatility Risk',
                    logisticsRisk: 'Logistics / Distance Risk',
                  };
                  return (
                    <div
                      key={key}
                      className={cn(
                        'p-2.5 rounded-lg border text-xs flex flex-col justify-between',
                        getRiskColor(dim.level)
                      )}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>{labelMap[key] || key}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/70">
                          {dim.level} ({dim.score}/100)
                        </span>
                      </div>
                      <p className="text-[11px] leading-tight text-sand-700 mt-1">
                        {dim.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
