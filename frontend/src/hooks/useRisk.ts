import { useState, useEffect, useCallback } from 'react';
import { riskApi } from '@/api';
import type { RiskAssessment } from '@/types';
import { useActiveLocation } from '@/context/LocationContext';

export function useRisk() {
  const { location } = useActiveLocation();
  const [data, setData] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchRisk = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await riskApi.getAssessment(
        location.latitude ?? undefined,
        location.longitude ?? undefined
      );
      setData(res.assessment);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useRisk] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load risk assessment');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  return { data, isLoading, error, isFallback, refetch: fetchRisk };
}
