import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api';
import type { Farmer } from '@/types';

interface AuthContextType {
  farmer: Farmer | null;
  user: any | null;
  role: 'farmer' | 'buyer';
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  updateFarmerLocation: (loc: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kisaniq_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('kisaniq_token');
      if (storedToken) {
        try {
          const res: any = await authApi.getMe();
          if (res.farmer) setFarmer(res.farmer);
          if (res.user) setUser(res.user);
          if (res.role) setRole(res.role);
          if (res.buyer) setUser((prev: any) => ({ ...prev, ...res.buyer }));
        } catch (e) {
          console.warn('Session expired or invalid token:', e);
          localStorage.removeItem('kisaniq_token');
          setToken(null);
          setFarmer(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (phone: string, password: string) => {
    const res: any = await authApi.login(phone, password);
    localStorage.setItem('kisaniq_token', res.token);
    setToken(res.token);
    if (res.farmer) setFarmer(res.farmer);
    if (res.user) setUser(res.user);
    if (res.role) setRole(res.role);
    if (res.buyer) setUser((prev: any) => ({ ...prev, ...res.buyer }));
    return res;
  };

  const register = async (data: any) => {
    const res: any = await authApi.register(data);
    localStorage.setItem('kisaniq_token', res.token);
    setToken(res.token);
    if (res.farmer) setFarmer(res.farmer);
    if (res.user) setUser(res.user);
    if (res.role) setRole(res.role || data.role || 'farmer');
    if (res.buyer) setUser((prev: any) => ({ ...prev, ...res.buyer }));
    return res;
  };

  const updateFarmerLocation = (loc: any) => {
    setFarmer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        location: {
          village: loc.village ?? prev.location?.village,
          district: loc.district ?? prev.location?.district,
          state: loc.state ?? prev.location?.state,
          pincode: loc.pincode ?? prev.location?.pincode,
          coordinates: {
            lat: loc.latitude ?? prev.location?.coordinates?.lat ?? 26.2183,
            lng: loc.longitude ?? prev.location?.coordinates?.lng ?? 78.1828,
          },
        },
      };
    });
  };

  const logout = () => {
    localStorage.removeItem('kisaniq_token');
    setToken(null);
    setFarmer(null);
    setUser(null);
    setRole('farmer');
  };

  return (
    <AuthContext.Provider
      value={{
        farmer,
        user,
        role,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        updateFarmerLocation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
