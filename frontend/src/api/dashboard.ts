import { api } from './client';
import type {
  WeatherData,
  WeatherForecast,
  FarmingImplication,
  Crop,
  MarketData,
  Recommendation,
} from '@/types';

export interface DashboardResponse {
  success: boolean;
  farmer: { id: string; name: string; location: string };
  weather: WeatherData;
  forecast: WeatherForecast[];
  farmingImplications: FarmingImplication[];
  recommendations: Recommendation[];
  alerts: any[];
  bestMarket: MarketData;
  crops: Crop[];
  lastUpdated: string;
}

export const dashboardApi = {
  getDashboard: (params?: { lat?: number; lon?: number; district?: string; state?: string }) => {
    const sp = new URLSearchParams();
    if (params?.lat !== undefined) sp.append('lat', params.lat.toString());
    if (params?.lon !== undefined) sp.append('lon', params.lon.toString());
    if (params?.district) sp.append('district', params.district);
    if (params?.state) sp.append('state', params.state);
    const qs = sp.toString();
    return api.get<DashboardResponse>(`/dashboard${qs ? `?${qs}` : ''}`);
  },
};
