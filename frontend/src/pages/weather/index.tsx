import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, Wind, CloudRain, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ForecastDayCard } from '@/components/domain/forecast-day-card';
import { LocationModal } from '@/components/domain/location-modal';
import { useWeather } from '@/hooks/useWeather';
import { useActiveLocation } from '@/context/LocationContext';

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  heavy_rain: '⛈️',
  thunderstorm: '🌩️',
  fog: '🌫️',
  haze: '🌫️',
  hot: '🔥',
  cold: '❄️',
};

const IMPACT_BADGE = {
  positive: 'success' as const,
  warning: 'warning' as const,
  caution: 'caution' as const,
};

export default function WeatherPage() {
  const { t } = useTranslation('weather');
  const { location, setLocation } = useActiveLocation();
  const { data, isLoading, error, isLocationRequired, refetch } = useWeather();
  const [showLocationModal, setShowLocationModal] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // Location Required Prompt
  if (isLocationRequired || !location.isConfigured) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
        <Card className="p-8 text-center border-dashed border-2 border-agri-forest-300 bg-sand-50/50">
          <div className="w-16 h-16 rounded-full bg-agri-forest-100 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-agri-forest-800" />
          </div>
          <h2 className="text-lg font-bold text-sand-900 mb-2">{t('location_required_title')}</h2>
          <p className="text-sm text-sand-600 max-w-md mx-auto mb-6">
            {t('location_required_desc')}
          </p>
          <Button
            variant="primary"
            onClick={() => setShowLocationModal(true)}
            className="font-semibold shadow-sm"
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            {t('btn_set_location')}
          </Button>
        </Card>

        {showLocationModal && (
          <LocationModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onLocationUpdated={(newLoc) => {
              setLocation(newLoc);
              setShowLocationModal(false);
            }}
          />
        )}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
        <ErrorState onRetry={refetch} description={error} />
      </div>
    );
  }

  if (!data) return null;
  const { current, forecast, implications } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
          {location.district && (
            <p className="text-xs text-sand-600 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-agri-forest-700" />
              {location.district}, {location.state}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLocationModal(true)}
            className="text-xs font-semibold text-agri-forest-800"
          >
            {t('btn_change')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs text-sand-600 p-2"
            title={t('btn_refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Real Weather Card */}
      <Card>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-5xl font-bold text-sand-900">
                {current.temperature !== null ? `${current.temperature}°` : '—'}
              </span>
              <p className="text-base text-sand-700 mt-1">
                {t(`home:weather.conditions.${current.conditionKey || current.condition}`, {
                  defaultValue: current.condition || 'Clear',
                })}
              </p>
              {current.feelsLike !== null && (
                <p className="text-xs text-sand-500 mt-0.5">
                  {t('feels_like', { temp: current.feelsLike })}
                </p>
              )}
            </div>
            <span className="text-5xl">
              {WEATHER_EMOJI[current.conditionKey || current.condition] || '☀️'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-sand-200">
            <MetricCard
              icon={<CloudRain className="h-4 w-4 text-blue-500" />}
              label={t('labels.rain')}
              value={current.rainProbability !== null ? current.rainProbability : '—'}
              unit={current.rainProbability !== null ? '%' : ''}
            />
            <MetricCard
              icon={<Droplets className="h-4 w-4 text-blue-400" />}
              label={t('labels.humidity')}
              value={current.humidity !== null ? current.humidity : '—'}
              unit={current.humidity !== null ? '%' : ''}
            />
            <MetricCard
              icon={<Wind className="h-4 w-4 text-sand-500" />}
              label={t('labels.wind')}
              value={current.windSpeed !== null ? current.windSpeed : '—'}
              unit={current.windSpeed !== null ? 'km/h' : ''}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3-day Forecast */}
      {forecast && forecast.length > 0 && (
        <div>
          <SectionHeader title={t('forecast_title')} icon={<span>📅</span>} />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {forecast.map((day, i) => (
              <ForecastDayCard
                key={day.date}
                forecast={{
                  ...day,
                  high: day.high !== null ? day.high : 0,
                  low: day.low !== null ? day.low : 0,
                  rainProbability: day.rainProbability !== null ? day.rainProbability : 0,
                  humidity: day.humidity !== null ? day.humidity : 0,
                  windSpeed: day.windSpeed !== null ? day.windSpeed : 0,
                }}
                isToday={i === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Farming Impact Advisories */}
      {implications && implications.length > 0 && (
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
      )}

      {showLocationModal && (
        <LocationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onLocationUpdated={(newLoc) => {
            setLocation(newLoc);
            setShowLocationModal(false);
          }}
        />
      )}
    </div>
  );
}
