import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { farmerApi } from '@/api';
import { useAuth } from './AuthContext';

export interface ActiveLocation {
  country: string;
  state: string;
  district: string;
  city?: string;
  village?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export const DEFAULT_LOCATION: ActiveLocation = {
  country: 'India',
  state: 'Madhya Pradesh',
  district: 'Gwalior',
  city: 'Gwalior',
  village: 'Morar',
  latitude: 26.2183,
  longitude: 78.1828,
};

interface LocationContextType {
  location: ActiveLocation;
  isLoading: boolean;
  error: string | null;
  setLocation: (newLoc: Partial<ActiveLocation>, saveToBackend?: boolean) => Promise<void>;
  detectGPS: () => Promise<ActiveLocation>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { farmer, isAuthenticated, updateFarmerLocation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from Auth user location, or localStorage, or default
  const [location, setLocationState] = useState<ActiveLocation>(() => {
    const cached = localStorage.getItem('kisaniq_active_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.latitude && parsed.longitude && parsed.district) {
          return { ...DEFAULT_LOCATION, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to parse cached location:', e);
      }
    }
    return DEFAULT_LOCATION;
  });

  // Keep synchronized with authenticated farmer profile
  useEffect(() => {
    const coords = farmer?.location?.coordinates;
    if (coords && coords.lat != null && coords.lng != null) {
      setLocationState((prev) => ({
        ...prev,
        district: farmer?.location?.district || prev.district,
        state: farmer?.location?.state || prev.state,
        village: farmer?.location?.village || prev.village,
        latitude: Number(coords.lat),
        longitude: Number(coords.lng),
      }));
    }
  }, [farmer]);

  const setLocation = useCallback(
    async (newLoc: Partial<ActiveLocation>, saveToBackend: boolean = true) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated: ActiveLocation = {
          ...location,
          ...newLoc,
          country: 'India',
          latitude: newLoc.latitude !== undefined ? Number(newLoc.latitude) : location.latitude,
          longitude: newLoc.longitude !== undefined ? Number(newLoc.longitude) : location.longitude,
          district: newLoc.district || location.district,
          state: newLoc.state || location.state,
        };

        setLocationState(updated);
        localStorage.setItem('kisaniq_active_location', JSON.stringify(updated));

        // Save to backend database if authenticated
        if (saveToBackend && isAuthenticated) {
          try {
            await farmerApi.updateLocation({
              latitude: updated.latitude,
              longitude: updated.longitude,
              district: updated.district,
              state: updated.state,
              village: updated.village,
            });
            updateFarmerLocation(updated);
          } catch (apiErr: any) {
            console.warn('Backend location sync notice:', apiErr.message);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update active location');
      } finally {
        setIsLoading(false);
      }
    },
    [location, isAuthenticated, updateFarmerLocation]
  );

  const detectGPS = useCallback(async (): Promise<ActiveLocation> => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      setError(msg);
      throw new Error(msg);
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          let detectedDistrict = location.district;
          let detectedState = location.state;
          let detectedVillage = location.village || '';

          // Reverse geocode via free public OSM Nominatim
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
              {
                headers: { 'User-Agent': 'KisanIQ-FullStack/2.0' },
                signal: AbortSignal.timeout(4000),
              }
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              detectedDistrict = addr.state_district || addr.county || addr.city || detectedDistrict;
              detectedState = addr.state || detectedState;
              if (addr.village || addr.suburb || addr.town) {
                detectedVillage = addr.village || addr.suburb || addr.town;
              }
            }
          } catch (geoErr) {
            console.warn('Reverse geocode fallback:', geoErr);
          }

          const resolved: ActiveLocation = {
            country: 'India',
            state: detectedState,
            district: detectedDistrict,
            village: detectedVillage,
            latitude: lat,
            longitude: lng,
          };

          await setLocation(resolved, true);
          setIsLoading(false);
          resolve(resolved);
        },
        (err) => {
          setIsLoading(false);
          const errMsg =
            err.code === 1
              ? 'Location permission was denied. Please select your district from the list.'
              : err.code === 2
              ? 'GPS position is currently unavailable. Please select your district from the list.'
              : 'GPS detection timed out. Please select your district from the list.';
          setError(errMsg);
          reject(new Error(errMsg));
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    });
  }, [location, setLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        setLocation,
        detectGPS,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useActiveLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useActiveLocation must be used within a LocationProvider');
  }
  return context;
}
