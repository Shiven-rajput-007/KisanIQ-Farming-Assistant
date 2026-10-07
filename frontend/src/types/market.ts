import type { RiskLevel } from './risk';

export interface MarketData {
  id: string;
  name: string;
  location: string;
  distance: number; // km
  cropName: string;
  price: number; // modal price per quintal
  minPrice?: number;
  maxPrice?: number;
  arrivalDate?: string; // YYYY-MM-DD
  source?: string;
  district?: string;
  state?: string;
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

export interface RiskDimension {
  score: number;
  level: 'low' | 'medium' | 'high';
  note: string;
}

export interface SellingDecision {
  action: 'SELL_NOW' | 'HOLD' | 'WAIT' | 'PARTIAL_SELL' | 'INSUFFICIENT_DATA';
  actionKey: string;
  badgeVariant: 'success' | 'warning' | 'caution' | 'info';
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceNote: string;
  primaryMarketName?: string;
  primaryPrice?: number;
  expectedNetReturn?: number;
  effectiveRealizedPrice?: number;
  timeHorizon?: string;
  reasons: string[];
  suggestedAction: string;
  riskBreakdown?: {
    marketRisk: RiskDimension;
    weatherRisk: RiskDimension;
    storageRisk: RiskDimension;
    volatilityRisk: RiskDimension;
    logisticsRisk: RiskDimension;
  };
  partialSplit?: {
    sellNowPercent: number;
    sellNowQuantity: number;
    holdPercent: number;
    holdQuantity: number;
    sellNowReturn: number;
    holdEstimatedReturn: number;
  };
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
