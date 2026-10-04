import { useState, useEffect, useCallback } from 'react';
import { weatherApi, type WeatherResponse } from '@/api';
import { useActiveLocation } from '@/context/LocationContext';

export function useWeather() {
  const { location } = useActiveLocation();
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocationRequired, setIsLocationRequired] = useState(false);

  const fetchWeather = useCallback(async () => {
    if (
      location.latitude === null ||
      location.longitude === null ||
      isNaN(location.latitude) ||
      isNaN(location.longitude) ||
      !location.isConfigured
    ) {
      setIsLocationRequired(true);
      setIsLoading(false);
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsLocationRequired(false);
    try {
      const res = await weatherApi.getWeather(location.latitude, location.longitude);
      setData(res);
    } catch (err: any) {
      console.error('[useWeather] API fetch notice:', err.message);
      if (err.data?.code === 'LOCATION_REQUIRED' || err.message?.includes('LOCATION_REQUIRED')) {
        setIsLocationRequired(true);
      } else {
        setError(err.message || 'Failed to load weather data');
      }
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude, location.isConfigured]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { data, isLoading, error, isLocationRequired, refetch: fetchWeather };
}
