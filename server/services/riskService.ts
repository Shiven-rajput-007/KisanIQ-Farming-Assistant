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
  async getRiskAssessment(farmerId?: string, lat?: number, lon?: number): Promise<RiskAssessment> {
    let targetLat = lat;
    let targetLon = lon;

    if ((targetLat === undefined || targetLon === undefined) && farmerId && farmerId !== 'guest_user') {
      try {
        const farmerRes = await db.query('SELECT latitude, longitude FROM farmers WHERE id = $1', [farmerId]);
        if (farmerRes.rows.length > 0 && farmerRes.rows[0].latitude && farmerRes.rows[0].longitude) {
          targetLat = parseFloat(farmerRes.rows[0].latitude);
          targetLon = parseFloat(farmerRes.rows[0].longitude);
        }
      } catch (e) {
        console.warn('[RiskService] Farmer coordinates lookup error:', e);
      }
    }

    if (
      targetLat === undefined ||
      targetLon === undefined ||
      isNaN(targetLat) ||
      isNaN(targetLon) ||
      targetLat < -90 ||
      targetLat > 90 ||
      targetLon < -180 ||
      targetLon > 180
    ) {
      const err = new Error('Valid geographic coordinates (latitude and longitude) are required for risk assessment.');
      (err as any).code = 'LOCATION_REQUIRED';
      throw err;
    }

    const { current, forecast } = await weatherService.getWeather(targetLat, targetLon);

    // 1. Weather risk score (0-100)
    let weatherScore = 15;
    const tomorrowRain = forecast[1]?.rainProbability ?? forecast[0]?.rainProbability ?? 0;
    const currentRain = current.rainProbability ?? 0;
    if (tomorrowRain >= 70 || currentRain >= 70) {
      weatherScore = 45; // Moderate risk due to rain/storm
    }
    if ((current.windSpeed ?? 0) > 25) {
      weatherScore += 20;
    }
    const weatherLevel = weatherScore > 60 ? 'high' : weatherScore > 30 ? 'medium' : 'low';

    // 2. Crop health risk score (0-100)
    let cropHealthScore = 20;
    if ((current.humidity ?? 0) >= 65) {
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
    let alerts: RiskAlert[] = [];
    if (farmerId && farmerId !== 'guest_user') {
      try {
        const alertRes = await db.query(
          `SELECT * FROM alerts WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [farmerId]
        );

        alerts = alertRes.rows.map((row: any) => ({
          id: row.id,
          categoryType: row.severity === 'high' ? 'weather' : 'crop_health',
          severity: row.severity,
          titleKey: row.title_key,
          descriptionKey: row.description_key,
          actionKey: row.action_key || 'details',
          icon: row.icon || '⚠️',
        }));
      } catch (e) {
        console.warn('[RiskService] Alerts lookup error:', e);
      }
    }

    return {
      overallRisk,
      riskScore: overallScore,
      categories,
      alerts,
      lastUpdated: new Date().toISOString(),
      isDemo: false,
    };
  }
}

export const riskService = new RiskService();
