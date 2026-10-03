import { useTranslation } from 'react-i18next';
import { Droplets, Wind, CloudRain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionHeader } from '@/components/ui/section-header';
import { DemoBanner } from '@/components/ui/demo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ForecastDayCard } from '@/components/domain/forecast-day-card';
import { useWeather } from '@/hooks/useWeather';

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️', partly_cloudy: '⛅', cloudy: '☁️', rain: '🌧️',
  heavy_rain: '⛈️', thunderstorm: '🌩️', fog: '🌫️', haze: '🌫️',
  hot: '🔥', cold: '❄️',
};

const IMPACT_BADGE = {
  positive: 'success' as const,
  warning: 'warning' as const,
  caution: 'caution' as const,
};

export default function WeatherPage() {
  const { t } = useTranslation('weather');
  const { data, isLoading, error, isFallback, refetch } = useWeather();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState onRetry={refetch} description={error} />;
  }

  if (!data) return null;
  const { current, forecast, implications } = data;

  return (
    <div className="space-y-5">
      {isFallback && <DemoBanner className="mb-2" />}

      <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>

      {/* Current Real Weather */}
      <Card>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-5xl font-bold text-sand-900">{current.temperature}°</span>
              <p className="text-base text-sand-700 mt-1">
                {t(`home:weather.conditions.${current.conditionKey || current.condition}`, { defaultValue: current.condition })}
              </p>
            </div>
            <span className="text-5xl">{WEATHER_EMOJI[current.conditionKey || current.condition] || '☀️'}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-sand-200">
            <MetricCard
              icon={<CloudRain className="h-4 w-4 text-blue-500" />}
              label={t('labels.rain')}
              value={current.rainProbability}
              unit="%"
            />
            <MetricCard
              icon={<Droplets className="h-4 w-4 text-blue-400" />}
              label={t('labels.humidity')}
              value={current.humidity}
              unit="%"
            />
            <MetricCard
              icon={<Wind className="h-4 w-4 text-sand-500" />}
              label={t('labels.wind')}
              value={current.windSpeed}
              unit="km/h"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3-day Forecast */}
      <div>
        <SectionHeader title={t('forecast_title')} icon={<span>📅</span>} />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {forecast.map((day, i) => (
            <ForecastDayCard
              key={day.date}
              forecast={day}
              isToday={i === 0}
            />
          ))}
        </div>
      </div>

      {/* Farming Impact */}
      <div>
        <SectionHeader title={t('farming_impact.title')} icon={<span>🌾</span>} />
        <div className="space-y-3">
          {implications.map((impl) => (
            <Card key={impl.id}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{impl.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-sand-900">
                        {t(`farming_impact.${impl.type}`, { defaultValue: impl.type })}
                      </p>
                      <p className="text-xs text-sand-600 mt-0.5">{impl.actionKey}</p>
                    </div>
                  </div>
                  <Badge variant={IMPACT_BADGE[impl.severity]}>
                    {impl.titleKey}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
