export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  categories: RiskCategory[];
  alerts: RiskAlert[];
  lastUpdated: string;
  isDemo?: boolean;
}

export interface RiskCategory {
  id: string;
  type: 'weather' | 'crop_health' | 'market' | 'water' | 'pest' | 'nutrient';
  nameKey: string;
  icon: string;
  level: RiskLevel;
  score: number; // 0-100
  descriptionKey?: string;
}

export interface RiskAlert {
  id: string;
  categoryType: string;
  severity: RiskLevel;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  icon: string;
  timestamp?: string;
}
