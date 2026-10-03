import { db } from '../db/index.js';
import { weatherService } from './weatherService.js';

export interface RiskCategory {
  id: string;
  type: 'weather' | 'crop_health' | 'market' | 'water' | 'pest' | 'nutrient';
  nameKey: string;
  icon: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface RiskAlert {
  id: string;
  categoryType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  icon: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  categories: RiskCategory[];
  alerts: RiskAlert[];
  lastUpdated: string;
  isDemo?: boolean;
}

export class RiskService {
  async getRiskAssessment(farmerId: string = 'farmer_ramesh'): Promise<RiskAssessment> {
    const { current, forecast } = await weatherService.getWeather();

    // 1. Weather risk score (0-100)
    let weatherScore = 15;
    const tomorrowRain = forecast[1]?.rainProbability || 0;
    if (tomorrowRain >= 70 || current.rainProbability >= 70) {
      weatherScore = 45; // Moderate risk due to rain/storm
    }
    if (current.windSpeed > 25) {
      weatherScore += 20;
    }
    const weatherLevel = weatherScore > 60 ? 'high' : weatherScore > 30 ? 'medium' : 'low';

    // 2. Crop health risk score (0-100)
    let cropHealthScore = 20;
    if (current.humidity >= 65) {
      cropHealthScore = 38; // Disease risk due to humidity
    }
    const cropHealthLevel = cropHealthScore > 60 ? 'high' : cropHealthScore > 30 ? 'medium' : 'low';

    // 3. Market risk score (0-100)
    const marketScore = 14;
    const marketLevel = 'low';

    // 4. Water risk score (0-100)
    const waterScore = 12;
    const waterLevel = 'low';

    // Overall weighted score
    const overallScore = Math.round(
      weatherScore * 0.35 + cropHealthScore * 0.35 + marketScore * 0.15 + waterScore * 0.15
    );
    const overallRisk = overallScore > 60 ? 'high' : overallScore > 30 ? 'medium' : 'low';

    const categories: RiskCategory[] = [
      { id: 'rc_1', type: 'weather', nameKey: 'weather', icon: '🌦️', level: weatherLevel, score: weatherScore },
      { id: 'rc_2', type: 'crop_health', nameKey: 'crop_health', icon: '🐛', level: cropHealthLevel, score: cropHealthScore },
      { id: 'rc_3', type: 'market', nameKey: 'market', icon: '💰', level: marketLevel, score: marketScore },
      { id: 'rc_4', type: 'water', nameKey: 'water', icon: '💧', level: waterLevel, score: waterScore },
    ];

    // Fetch alerts from database
    const alertRes = await db.query(
      `SELECT * FROM alerts WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [farmerId]
    );

    const alerts: RiskAlert[] = alertRes.rows.map((row: any) => ({
      id: row.id,
      categoryType: row.severity === 'high' ? 'weather' : 'crop_health',
      severity: row.severity,
      titleKey: row.title_key,
      descriptionKey: row.description_key,
      actionKey: row.action_key || 'details',
      icon: row.icon || '⚠️',
    }));

    return {
      overallRisk,
      riskScore: overallScore,
      categories,
      alerts,
      lastUpdated: new Date().toISOString(),
      isDemo: current.isDemo ?? false,
    };
  }
}

export const riskService = new RiskService();
