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

    // 3. Market risk score (computed from commodity price volatility)
    let marketScore = 20;
    try {
      let cropToAssess = 'Wheat';
      if (farmerId && farmerId !== 'guest_user') {
        const cropRes = await db.query('SELECT name FROM crops WHERE farmer_id = $1 LIMIT 1', [farmerId]);
        if (cropRes.rows.length > 0 && cropRes.rows[0].name) {
          cropToAssess = cropRes.rows[0].name;
        }
      }
      const priceStats = await db.query(
        `SELECT min_price, max_price, modal_price FROM market_prices 
         WHERE commodity ILIKE $1 
         ORDER BY arrival_date DESC NULLS LAST, created_at DESC LIMIT 5`,
        [`%${cropToAssess}%`]
      );
      if (priceStats.rows.length > 0) {
        const spreads = priceStats.rows.map((r: any) => {
          const min = Number(r.min_price);
          const max = Number(r.max_price);
          const modal = Number(r.modal_price || min);
          return modal > 0 ? ((max - min) / modal) * 100 : 0;
        });
        const avgSpread = spreads.reduce((a: number, b: number) => a + b, 0) / spreads.length;
        if (avgSpread > 25) {
          marketScore = 55; // high price volatility
        } else if (avgSpread > 15) {
          marketScore = 35; // moderate fluctuation
        } else {
          marketScore = 18; // stable market prices
        }
      }
    } catch (mErr) {
      console.warn('[RiskService] Market risk calc notice:', mErr);
    }
    const marketLevel = marketScore > 60 ? 'high' : marketScore > 30 ? 'medium' : 'low';

    // 4. Water risk score (computed from farmer irrigation type and rainfall deficit)
    let waterScore = 18;
    try {
      let irrigationSource = 'borewell';
      if (farmerId && farmerId !== 'guest_user') {
        const farmRes = await db.query('SELECT irrigation_source FROM farms WHERE farmer_id = $1 LIMIT 1', [farmerId]);
        if (farmRes.rows.length > 0 && farmRes.rows[0].irrigation_source) {
          irrigationSource = String(farmRes.rows[0].irrigation_source).toLowerCase();
        }
      }
      const maxForecastRain = Math.max(
        ...(forecast || []).map((f) => f.rainProbability ?? 0),
        current.rainProbability ?? 0
      );
      if (irrigationSource.includes('rainfed')) {
        if (maxForecastRain < 20) {
          waterScore = 65; // High drought risk for rainfed crops with no rain
        } else if (maxForecastRain < 50) {
          waterScore = 40;
        } else {
          waterScore = 20;
        }
      } else if (irrigationSource.includes('drip') || irrigationSource.includes('sprinkler')) {
        waterScore = 15; // highly efficient irrigation
      } else {
        // Canal or borewell
        waterScore = 22;
      }
    } catch (wErr) {
      console.warn('[RiskService] Water risk calc notice:', wErr);
    }
    const waterLevel = waterScore > 60 ? 'high' : waterScore > 30 ? 'medium' : 'low';

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
