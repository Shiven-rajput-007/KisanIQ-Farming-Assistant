import { api } from './client';
import type { WeatherData, WeatherForecast, FarmingImplication } from '@/types';

export const weatherApi = {
  getCurrent: (lat?: number, lon?: number) => {
    const qs = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
    return api.get<{
      success: boolean;
      weather: WeatherData;
      forecast: WeatherForecast[];
      farmingImplications: FarmingImplication[];
      farmingNote: string;
      source: string;
      cached: boolean;
    }>(`/weather/current${qs}`);
  },
  getForecast: (days = 3) =>
    api.get<{ success: boolean; forecast: WeatherForecast[] }>(`/weather/forecast?days=${days}`),
  getImplications: () =>
    api.get<{ success: boolean; implications: FarmingImplication[] }>('/weather/implications'),
};
