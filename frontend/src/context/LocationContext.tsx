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
  latitude: number | null;
  longitude: number | null;
  isConfigured: boolean;
}

export const UNCONFIGURED_LOCATION: ActiveLocation = {
  country: 'India',
  state: '',
  district: '',
  city: '',
  village: '',
  latitude: null,
  longitude: null,
  isConfigured: false,
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

  // Initialize from localStorage if explicitly set, or unconfigured
  const [location, setLocationState] = useState<ActiveLocation>(() => {
    const cached = localStorage.getItem('kisaniq_active_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed.latitude != null &&
          parsed.longitude != null &&
          !isNaN(Number(parsed.latitude)) &&
          !isNaN(Number(parsed.longitude)) &&
          parsed.district
        ) {
          return {
            ...UNCONFIGURED_LOCATION,
            ...parsed,
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            isConfigured: true,
          };
        }
      } catch (e) {
        console.warn('Failed to parse cached location:', e);
      }
    }
    return UNCONFIGURED_LOCATION;
  });

  // Keep synchronized with authenticated farmer profile
  useEffect(() => {
    const coords = farmer?.location?.coordinates;
    if (
      coords &&
      coords.lat != null &&
      coords.lng != null &&
      !isNaN(Number(coords.lat)) &&
      !isNaN(Number(coords.lng))
    ) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      setLocationState((prev) => ({
        ...prev,
        district: farmer?.location?.district || prev.district,
        state: farmer?.location?.state || prev.state,
        village: farmer?.location?.village || prev.village,
        latitude: lat,
        longitude: lng,
        isConfigured: true,
      }));
    }
  }, [farmer]);

  const setLocation = useCallback(
    async (newLoc: Partial<ActiveLocation>, saveToBackend: boolean = true) => {
      setIsLoading(true);
      setError(null);
      try {
        const lat = newLoc.latitude !== undefined && newLoc.latitude !== null ? Number(newLoc.latitude) : location.latitude;
        const lon = newLoc.longitude !== undefined && newLoc.longitude !== null ? Number(newLoc.longitude) : location.longitude;
        const isConfigured = lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);

        const updated: ActiveLocation = {
          ...location,
          ...newLoc,
          country: 'India',
          latitude: lat,
          longitude: lon,
          district: newLoc.district || location.district,
          state: newLoc.state || location.state,
          village: newLoc.village || location.village,
          isConfigured,
        };

        setLocationState(updated);
        localStorage.setItem('kisaniq_active_location', JSON.stringify(updated));

        // Save to backend database if authenticated
        if (saveToBackend && isAuthenticated && isConfigured) {
          try {
            await farmerApi.updateLocation({
              latitude: updated.latitude!,
              longitude: updated.longitude!,
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

          let detectedDistrict = location.district || 'India';
          let detectedState = location.state || '';
          let detectedVillage = location.village || '';

          // Reverse geocode via free public OSM Nominatim
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
              {
                headers: { 'User-Agent': 'KisanIQ-FullStack/2.0' },
                signal: AbortSignal.timeout(6000),
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
            console.warn('Reverse geocoding notice:', geoErr);
          }

          const newLoc: ActiveLocation = {
            country: 'India',
            state: detectedState,
            district: detectedDistrict,
            village: detectedVillage,
            latitude: lat,
            longitude: lng,
            isConfigured: true,
          };

          await setLocation(newLoc, true);
          setIsLoading(false);
          resolve(newLoc);
        },
        (posErr) => {
          setIsLoading(false);
          const errMsg = posErr.message || 'GPS location detection failed';
          setError(errMsg);
          reject(new Error(errMsg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
