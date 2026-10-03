import { useState, useEffect, useCallback } from 'react';
import { marketApi, type MarketComparisonResponse } from '@/api';
import { useActiveLocation } from '@/context/LocationContext';

export function useMarket(crop: string = 'Wheat', quantity: number = 100) {
  const { location } = useActiveLocation();
  const [data, setData] = useState<MarketComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchMarket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await marketApi.getComparison(
        crop,
        quantity,
        location.latitude,
        location.longitude,
        location.district,
        location.state
      );
      setData(res);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useMarket] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load market prices');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [crop, quantity, location.latitude, location.longitude, location.district, location.state]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return { data, isLoading, error, isFallback, refetch: fetchMarket };
}
