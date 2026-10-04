import { Cloud, Droplets, Wind, CloudRain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WeatherData } from '@/types';

const WEATHER_ICONS: Record<string, string> = {
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

interface WeatherCardProps {
  weather?: WeatherData | null;
  farmingNote?: string;
  className?: string;
  onClick?: () => void;
}

function WeatherCard({ weather, farmingNote, className, onClick }: WeatherCardProps) {
  const { t } = useTranslation('home');

  if (!weather) {
    return (
      <Card
        className={cn('cursor-pointer border-dashed border-sand-300 bg-sand-50/70 hover:shadow-xs transition-shadow', className)}
        onClick={onClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-sand-200 text-sand-500">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-sand-500 uppercase tracking-wider">{t('weather.title')}</p>
              <p className="text-sm font-bold text-sand-800 mt-0.5">
                {t('weather.unavailable_title', { defaultValue: 'Weather data temporarily unavailable' })}
              </p>
              <p className="text-xs text-sand-500 mt-0.5">
                {t('weather.unavailable_desc', { defaultValue: 'Unable to connect to live meteorological servers. Please try again later.' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onClick}
    >
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-sand-600 mb-1">{t('weather.title')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-sand-900">
                {typeof weather.temperature === 'number' ? `${Math.round(weather.temperature)}°` : '--'}
              </span>
            </div>
            <p className="text-sm text-sand-700 mt-0.5">
              {weather.condition ? t(`weather.conditions.${weather.condition}`, { defaultValue: weather.condition }) : ''}
            </p>
          </div>
          <span className="text-4xl">{WEATHER_ICONS[weather.condition] || '☀️'}</span>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-sand-200">
          <div className="flex items-center gap-1.5 text-sm text-sand-600">
            <CloudRain className="h-4 w-4 text-blue-500" />
            <span>{typeof weather.rainProbability === 'number' ? `${weather.rainProbability}%` : '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-sand-600">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span>{typeof weather.humidity === 'number' ? `${weather.humidity}%` : '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-sand-600">
            <Wind className="h-4 w-4 text-sand-500" />
            <span>{typeof weather.windSpeed === 'number' ? `${weather.windSpeed} km/h` : '--'}</span>
          </div>
        </div>

        {farmingNote && (
          <div className="mt-3 px-3 py-2 bg-agri-gold-50 rounded-lg border border-agri-gold-100">
            <p className="text-xs text-agri-gold-700 flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5" />
              {farmingNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { WeatherCard };
