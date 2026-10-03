import type { RiskLevel } from './risk';

export interface Crop {
  id: string;
  name: string;
  nameKey: string; // i18n key
  variety?: string;
  fieldId: string;
  sowingDate: string;
  expectedHarvestDate: string;
  currentStage: CropStage;
  daysOld: number;
  health: CropHealth;
  area: number; // acres
  expectedYield?: number; // quintals
  icon: string;
}

export type CropStage =
  | 'land_preparation'
  | 'sowing'
  | 'germination'
  | 'vegetative'
  | 'flowering'
  | 'grain_filling'
  | 'maturity'
  | 'harvest';

export interface CropStageInfo {
  stage: CropStage;
  nameKey: string;
  completed: boolean;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CropHealth {
  overall: RiskLevel;
  weatherRisk: RiskLevel;
  diseaseRisk: RiskLevel;
  waterStatus: RiskLevel;
  nutrientStatus?: RiskLevel;
}

export interface CropAction {
  id: string;
  type: CropActionType;
  titleKey: string;
  descriptionKey: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  completed?: boolean;
}

export type CropActionType =
  | 'irrigation'
  | 'fertilizer'
  | 'pesticide'
  | 'inspection'
  | 'harvest'
  | 'general';
