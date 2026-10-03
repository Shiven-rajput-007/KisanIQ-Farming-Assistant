import { CloudRain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeatherForecast } from '@/types';

const CONDITION_EMOJI: Record<string, string> = {
  clear: '☀️', partly_cloudy: '⛅', cloudy: '☁️', rain: '🌧️',
  heavy_rain: '⛈️', thunderstorm: '🌩️', fog: '🌫️', haze: '🌫️',
  hot: '🔥', cold: '❄️',
};

interface ForecastDayCardProps {
  forecast: WeatherForecast;
  isToday?: boolean;
  className?: string;
}

function ForecastDayCard({ forecast, isToday, className }: ForecastDayCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors min-w-[90px]',
      isToday ? 'border-agri-forest-200 bg-agri-forest-50' : 'border-sand-200 bg-white'
    )}>
      <span className={cn('text-xs font-semibold', isToday ? 'text-agri-forest-800' : 'text-sand-600')}>
        {forecast.dayName}
      </span>
      <span className="text-2xl">{CONDITION_EMOJI[forecast.condition] || '☀️'}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold text-sand-900">{forecast.high}°</span>
        <span className="text-xs text-sand-500">{forecast.low}°</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-sand-500">
        <CloudRain className="h-3 w-3" />
        <span>{forecast.rainProbability}%</span>
      </div>
    </div>
  );
}

export { ForecastDayCard };
