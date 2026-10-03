import type { RiskLevel } from './risk';

export interface MarketData {
  id: string;
  name: string;
  location: string;
  distance: number; // km
  cropName: string;
  price: number; // per quintal
  priceChange?: number; // percentage change
  priceTrend: 'up' | 'down' | 'stable';
  transportCost: number;
  commission: number; // percentage or flat
  loadingCost?: number;
  storageCost?: number;
  expectedWastage?: number; // percentage
  netReturn: number; // estimated total
  riskLevel: RiskLevel;
  demand: 'high' | 'medium' | 'low';
  isRecommended?: boolean;
  recommendationRank?: number;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface MarketComparison {
  cropName: string;
  availableQuantity: number; // quintals
  markets: MarketData[];
  bestPracticalOption: string; // market ID
  lastUpdated: string;
}

export interface SellingDecision {
  id: string;
  type: 'sell_all' | 'sell_partial' | 'hold';
  cropName: string;
  totalQuantity: number;
  sellNowQuantity?: number;
  holdQuantity?: number;
  recommendedMarketId?: string;
  reasonKeys: string[];
  confidence: number; // 0-100
  estimatedReturn?: number;
}

export interface PartialSelling {
  sellNow: {
    quantity: number;
    marketId: string;
    marketName: string;
    estimatedReturn: number;
    reason: string;
  };
  holdFor: {
    quantity: number;
    reason: string;
    expectedPriceRange?: {
      min: number;
      max: number;
    };
    suggestedDuration?: string;
  };
}

export interface PriceTrend {
  date: string;
  price: number;
  market: string;
}
