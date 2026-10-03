import { api } from './client';
import type { MarketData, PartialSelling } from '@/types';

export const marketApi = {
  getComparison: (params?: { crop?: string; quantity?: number; lat?: number; lon?: number; district?: string }) => {
    const sp = new URLSearchParams();
    if (params?.crop) sp.append('crop', params.crop);
    if (params?.quantity) sp.append('quantity', params.quantity.toString());
    if (params?.lat !== undefined) sp.append('lat', params.lat.toString());
    if (params?.lon !== undefined) sp.append('lon', params.lon.toString());
    if (params?.district) sp.append('district', params.district);
    const qs = sp.toString();
    return api.get<{
      success: boolean;
      markets: MarketData[];
      bestPractical: MarketData;
      highestPrice: MarketData;
      sellingDecision: PartialSelling;
      availableQuantity: number;
    }>(`/market/comparison${qs ? `?${qs}` : ''}`);
  },
  getMarketById: (id: string) =>
    api.get<{ success: boolean; market: MarketData }>(`/market/${id}`),
};
