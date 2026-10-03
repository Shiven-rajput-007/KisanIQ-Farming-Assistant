import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/types';

const ACTION_ICONS: Record<string, string> = {
  NO_IRRIGATION: '💧',
  IRRIGATE: '💧',
  INSPECT_CROP: '🐛',
  APPLY_FERTILIZER: '🧪',
  APPLY_PESTICIDE: '🛡️',
  CHECK_DRAINAGE: '🌊',
  HARVEST_READY: '🌾',
  COMPARE_MARKETS: '💰',
  SELL_NOW: '💰',
  HOLD_CROP: '📦',
  PREPARE_FIELD: '🚜',
  COVER_CROP: '🛡️',
  GENERAL: '📋',
};

const CATEGORY_LABELS: Record<string, string> = {
  irrigation: 'IRRIGATION',
  crop_health: 'CROP HEALTH',
  market: 'MARKET',
  weather: 'WEATHER',
  general: 'ACTION',
};

interface AajKyaKareinProps {
  actions: Recommendation[];
  onWhyClick?: (action: Recommendation) => void;
  onActionClick?: (action: Recommendation) => void;
  className?: string;
}

function AajKyaKarein({ actions, onWhyClick, onActionClick, className }: AajKyaKareinProps) {
  const { t } = useTranslation('home');

  if (actions.length === 0) return null;

  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1, 3);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section title */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🌱</span>
        <h2 className="text-sm font-bold text-agri-forest-800 uppercase tracking-wide">
          {t('aaj_kya_karein.title')}
        </h2>
      </div>

      {/* Primary action card */}
      <div
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-agri-forest-800 to-agri-forest-900 text-white p-5 shadow-md cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => onActionClick?.(primaryAction)}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl mt-0.5">{ACTION_ICONS[primaryAction.actionCode] || '📋'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-agri-leaf-300 uppercase tracking-wider mb-1">
              {CATEGORY_LABELS[primaryAction.category] || 'ACTION'}
            </p>
            <h3 className="text-lg font-bold leading-snug">
              {t(`actions.${primaryAction.actionCode.toLowerCase()}.title`, { defaultValue: primaryAction.titleKey })}
            </h3>
            <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
              {t(`actions.${primaryAction.actionCode.toLowerCase()}.description`, { defaultValue: primaryAction.descriptionKey })}
            </p>
          </div>
        </div>

        {/* Why CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWhyClick?.(primaryAction);
          }}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-agri-gold-300 hover:text-agri-gold-200 transition-colors min-h-[44px] active:scale-[0.95]"
        >
          {t('common:buttons.why')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Secondary actions */}
      {secondaryActions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action)}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-sand-200 bg-white hover:bg-sand-50 transition-colors text-left active:scale-[0.98] min-h-[56px]"
            >
              <span className="text-xl">{ACTION_ICONS[action.actionCode] || '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sand-500 uppercase tracking-wider">
                  {CATEGORY_LABELS[action.category] || 'ACTION'}
                </p>
                <p className="text-sm font-semibold text-sand-900 truncate">
                  {t(`actions.${action.actionCode.toLowerCase()}.title`, { defaultValue: action.titleKey })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-sand-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { AajKyaKarein };
