import { useState, useEffect, useCallback } from 'react';
import { farmerApi } from '@/api';
import type { Farmer, FarmProfile } from '@/types';

export function useProfile() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await farmerApi.getProfile();
      setFarmer(res.farmer);
      setFarmProfile(res.farmProfile);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useProfile] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load profile');
      setFarmer(null);
      setFarmProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { farmer, farmProfile, isLoading, error, isFallback, refetch: fetchProfile };
}
