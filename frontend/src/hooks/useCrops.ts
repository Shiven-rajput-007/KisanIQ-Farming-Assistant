import { useState, useEffect, useCallback } from 'react';
import { cropApi, type CropsResponse } from '@/api';

export function useCrops() {
  const [data, setData] = useState<CropsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchCrops = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cropApi.getCrops();
      setData(res);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useCrops] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load crops');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  return { data, isLoading, error, isFallback, refetch: fetchCrops };
}
