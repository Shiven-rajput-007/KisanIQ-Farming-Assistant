import { Response } from 'express';
import { db } from '../db/index.js';
import { weatherService } from '../services/weatherService.js';
import { decisionEngine } from '../services/decisionEngine.js';
import { marketService } from '../services/marketService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Identify real logged-in farmer or guest
    let farmerId = req.farmerId;
    let farmer: any = null;

    if (req.userId && !farmerId) {
      const fRes = await db.query('SELECT * FROM farmers WHERE user_id = $1', [req.userId]);
      if (fRes.rows.length > 0) {
        farmer = fRes.rows[0];
        farmerId = farmer.id;
      }
    } else if (farmerId) {
      const fRes = await db.query('SELECT * FROM farmers WHERE id = $1', [farmerId]);
      if (fRes.rows.length > 0) {
        farmer = fRes.rows[0];
      }
    }

    // 2. Resolve active coordinates: Query parameter overrides stored coordinates
    let lat: number | undefined = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    let lon: number | undefined =
      req.query.lon !== undefined
        ? Number(req.query.lon)
        : req.query.lng !== undefined
        ? Number(req.query.lng)
        : undefined;

    if (farmer) {
      if ((lat === undefined || isNaN(lat)) && farmer.latitude !== null && farmer.latitude !== undefined) {
        lat = Number(farmer.latitude);
      }
      if ((lon === undefined || isNaN(lon)) && farmer.longitude !== null && farmer.longitude !== undefined) {
        lon = Number(farmer.longitude);
      }
    } else {
      // Guest default without synthetic coordinates
      farmer = {
        id: 'guest',
        name: 'Kisan Mitra',
        district: req.query.district ? String(req.query.district) : '',
        state: req.query.state ? String(req.query.state) : '',
        latitude: lat || null,
        longitude: lon || null,
      };
      farmerId = 'guest';
    }

    const hasCoords =
      typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);

    // Fetch weather, recommendations, crops, and alerts
    let weatherData: any = null;
    let weatherUnavailable = false;
    if (hasCoords) {
      try {
        weatherData = await weatherService.getWeather(lat!, lon!);
      } catch (wErr: any) {
        console.warn('[Dashboard] Weather service notice:', wErr.message);
        weatherUnavailable = true;
      }
    } else {
      weatherUnavailable = true;
    }

    const [recommendations, cropRes, alertRes] = await Promise.all([
      decisionEngine.generateRecommendations(farmerId, lat, lon),
      farmerId !== 'guest'
        ? db.query('SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC', [farmerId])
        : Promise.resolve({ rows: [] }),
      farmerId !== 'guest'
        ? db.query('SELECT * FROM alerts WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [farmerId])
        : Promise.resolve({ rows: [] }),
    ]);

    const crops = cropRes.rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      nameKey: c.name_key,
      variety: c.variety,
      currentStage: c.current_stage,
      daysOld: c.days_old,
      health: {
        overall: c.health_overall,
        weatherRisk: c.health_weather_risk,
        diseaseRisk: c.health_disease_risk,
        waterStatus: c.health_water_status,
      },
      area: Number(c.area),
      expectedYield: Number(c.expected_yield),
      icon: c.icon || '🌾',
    }));

    const primaryCropName = crops[0]?.name || (req.query.crop as string) || 'Wheat';
    const marketComp = await marketService.getMarketComparison(farmerId, primaryCropName, 100, lat, lon);
    const bestMarket = marketComp.markets.find(m => m.isRecommended) || marketComp.markets[0] || null;

    const alerts = alertRes.rows.map((a: any) => ({
      id: a.id,
      severity: a.severity,
      titleKey: a.title_key,
      descriptionKey: a.description_key,
      actionKey: a.action_key || 'details',
      icon: a.icon || '⚠️',
      timestamp: a.created_at,
    }));

    res.json({
      success: true,
      isAuthenticated: Boolean(req.userId || req.farmerId),
      farmer: {
        id: farmer.id,
        name: farmer.name,
        location: farmer.district ? `${farmer.district}${farmer.state ? `, ${farmer.state}` : ''}` : '',
        coordinates: hasCoords ? { lat: lat!, lon: lon! } : null,
      },
      weather: weatherData ? weatherData.current : null,
      weatherUnavailable,
      weatherMessage: weatherUnavailable ? 'Weather data is temporarily unavailable.' : undefined,
      forecast: weatherData ? weatherData.forecast : [],
      farmingImplications: weatherData ? weatherData.implications : [],
      recommendations,
      alerts,
      bestMarket,
      crops,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
