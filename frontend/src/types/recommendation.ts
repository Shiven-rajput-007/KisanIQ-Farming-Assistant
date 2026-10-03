import type { RiskLevel } from './risk';

export type ActionType =
  | 'NO_IRRIGATION'
  | 'IRRIGATE'
  | 'INSPECT_CROP'
  | 'APPLY_FERTILIZER'
  | 'APPLY_PESTICIDE'
  | 'CHECK_DRAINAGE'
  | 'HARVEST_READY'
  | 'COMPARE_MARKETS'
  | 'SELL_NOW'
  | 'HOLD_CROP'
  | 'PREPARE_FIELD'
  | 'COVER_CROP'
  | 'GENERAL';

export type RecommendationStatus =
  | 'recommended'
  | 'consider'
  | 'caution'
  | 'avoid';

export interface Recommendation {
  id: string;
  actionCode: ActionType;
  category: 'irrigation' | 'crop_health' | 'market' | 'weather' | 'general';
  icon: string;
  titleKey: string;
  descriptionKey: string;
  status: RecommendationStatus;
  priority: number; // 1 = highest
  riskLevel: RiskLevel;
  timing?: string; // "today", "tomorrow", etc.
  whyExplanation?: WhyExplanation;
  isDemo?: boolean;
}

export interface WhyExplanation {
  summaryKey: string;
  dataPoints: WhyDataPoint[];
  conclusionKey: string;
  advancedDetails?: string;
}

export interface WhyDataPoint {
  icon: string;
  labelKey: string;
  value: string | number;
  unit?: string;
}

export interface DailyActions {
  date: string;
  farmerName: string;
  location: string;
  actions: Recommendation[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  titleKey: string;
  descriptionKey: string;
  actionKey?: string;
  icon: string;
  timestamp: string;
}
