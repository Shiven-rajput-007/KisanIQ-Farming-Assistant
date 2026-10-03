import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { WhyExplanation as WhyExplanationType } from '@/types';
import { ExpandableSection } from '@/components/ui/expandable-section';

interface WhyExplanationProps {
  explanation: WhyExplanationType;
  className?: string;
}

function WhyExplanation({ explanation, className }: WhyExplanationProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('rounded-xl border border-sand-200 bg-white p-4', className)}>
      <h3 className="text-sm font-bold text-sand-900 mb-4">
        {t('common:buttons.why')} — {explanation.summaryKey}
      </h3>

      {/* Data points */}
      <div className="space-y-3 mb-4">
        {explanation.dataPoints.map((dp, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{dp.icon}</span>
              <span className="text-sm text-sand-600">{dp.labelKey}</span>
            </div>
            <span className="text-sm font-semibold text-sand-900">
              {dp.value}{dp.unit ? ` ${dp.unit}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      <div className="p-3 rounded-lg bg-agri-forest-50 border border-agri-forest-200">
        <p className="text-sm font-semibold text-agri-forest-800">
          KisanIQ: {explanation.conclusionKey}
        </p>
      </div>

      {/* Advanced details */}
      {explanation.advancedDetails && (
        <ExpandableSection
          trigger={<span className="text-xs text-sand-500">Advanced details</span>}
          className="mt-3"
        >
          <p className="text-xs text-sand-500 p-2">{explanation.advancedDetails}</p>
        </ExpandableSection>
      )}
    </div>
  );
}

export { WhyExplanation };
