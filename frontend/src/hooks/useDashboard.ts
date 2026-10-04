import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type DashboardResponse } from '@/api';
import { useActiveLocation } from '@/context/LocationContext';

export function useDashboard() {
  const { location } = useActiveLocation();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getDashboard(
        {
          lat: location.latitude ?? undefined,
          lon: location.longitude ?? undefined,
          district: location.district,
          state: location.state,
        },
        { signal }
      );
      if (!signal?.aborted) {
        setData(res);
        setIsFallback(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return;
      }
      console.error('[useDashboard] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load dashboard data');
      setData(null);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [location.latitude, location.longitude, location.district, location.state]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchDashboard]);

  return { data, isLoading, error, isFallback, refetch: () => fetchDashboard() };
}
