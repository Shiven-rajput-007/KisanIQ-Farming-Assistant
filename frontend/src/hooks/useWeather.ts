import { useState, useEffect, useCallback } from 'react';
import { weatherApi, type WeatherResponse } from '@/api';
import { useActiveLocation } from '@/context/LocationContext';

export function useWeather() {
  const { location } = useActiveLocation();
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await weatherApi.getWeather(location.latitude, location.longitude);
      setData(res);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useWeather] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load weather data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { data, isLoading, error, isFallback, refetch: fetchWeather };
}
