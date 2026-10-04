import { db } from '../db/index.js';
import { weatherService, WeatherData, WeatherForecast } from './weatherService.js';
import { marketService } from './marketService.js';
import { soilService } from './soilService.js';

export interface WhyDataPoint {
  icon: string;
  labelKey: string;
  value: string | number;
  unit?: string;
}

export interface WhyExplanation {
  summaryKey: string;
  dataPoints: WhyDataPoint[];
  conclusionKey: string;
  advancedDetails?: string;
}

export interface Recommendation {
  id: string;
  actionCode: string;
  category: 'irrigation' | 'crop_health' | 'market' | 'weather' | 'general';
  icon: string;
  titleKey: string;
  descriptionKey: string;
  status: 'recommended' | 'consider' | 'caution' | 'avoid';
  priority: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timing: string;
  whyExplanation?: WhyExplanation;
  isDemo?: boolean;
}

export class DecisionEngine {
  /**
   * Evaluates real weather, crop state, soil type, and mandi prices to generate actionable, explainable recommendations.
   */
  async generateRecommendations(
    farmerId?: string,
    overrideLat?: number,
    overrideLon?: number
  ): Promise<Recommendation[]> {
    // 1. Fetch Farmer, Farm and Crop information
    const farmerRes = farmerId ? await db.query('SELECT * FROM farmers WHERE id = $1', [farmerId]) : { rows: [] };
    const farmRes = farmerId ? await db.query('SELECT * FROM farms WHERE farmer_id = $1', [farmerId]) : { rows: [] };
    const cropRes = farmerId ? await db.query('SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [farmerId]) : { rows: [] };

    const farmer = farmerRes.rows[0] || null;
    const farm = farmRes.rows[0] || { soil_type: 'alluvial', irrigation_source: 'borewell' };
    const hasCrop = cropRes.rows.length > 0;
    const crop = hasCrop ? cropRes.rows[0] : null;

    // 2. Fetch live weather & forecast using genuine coordinates
    const lat = overrideLat !== undefined && !isNaN(overrideLat)
      ? overrideLat
      : (farmer?.latitude != null && !isNaN(Number(farmer.latitude)) ? Number(farmer.latitude) : undefined);
    const lon = overrideLon !== undefined && !isNaN(overrideLon)
      ? overrideLon
      : (farmer?.longitude != null && !isNaN(Number(farmer.longitude)) ? Number(farmer.longitude) : undefined);

    let weatherData: any = null;
    if (lat !== undefined && lon !== undefined) {
      try {
        weatherData = await weatherService.getWeather(lat, lon);
      } catch (e: any) {
        console.warn('[DecisionEngine] Weather data unavailable for advisory generation:', e.message);
      }
    }

    const recommendations: Recommendation[] = [];

    // If farmer has no crops, prompt them to register their first crop
    if (!hasCrop) {
      recommendations.push({
        id: `rec_setup_${farmerId}`,
        actionCode: 'ADD_CROP',
        category: 'general',
        icon: '🌾',
        titleKey: 'add_crop',
        descriptionKey: 'No active crops registered yet. Add your crop details (sowing date, variety) to unlock personalized irrigation, fertilizer, and disease advisories.',
        status: 'recommended',
        priority: 1,
        riskLevel: 'low',
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Personalized Agronomic Advisory',
          dataPoints: [
            { icon: '📍', labelKey: 'Location', value: farmer.district || 'Gwalior' },
            { icon: '🌱', labelKey: 'Soil type', value: farm.soil_type || 'Alluvial' },
          ],
          conclusionKey: 'Personalized agronomic guidance requires your verified crop type and growth stage.',
        },
      });
    }

    // --- RULE 1: IRRIGATION DECISION (Requires weather and crop) ---
    if (weatherData && crop) {
      const current = weatherData.current;
      const forecast = weatherData.forecast;
      const tomorrowForecast = forecast[1] || forecast[0];
      const rainProbNext48h = Math.max(current.rainProbability || 0, tomorrowForecast?.rainProbability || 0);
      const expectedRainNext48h = (current.expectedRainfall || 0) + (tomorrowForecast?.expectedRainfall || 0);

    if (rainProbNext48h >= 50 || expectedRainNext48h >= 4.0) {
      recommendations.push({
        id: 'rec_irr_1',
        actionCode: 'NO_IRRIGATION',
        category: 'irrigation',
        icon: '💧',
        titleKey: 'no_irrigation',
        descriptionKey: `Rain is expected tomorrow (${rainProbNext48h}% chance, ~${Math.round(expectedRainNext48h)}mm). Your ${crop.name} (${crop.current_stage} stage) has adequate root-zone moisture.`,
        status: 'recommended',
        priority: 1,
        riskLevel: 'low',
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Why skip irrigation today?',
          dataPoints: [
            { icon: '🌧️', labelKey: 'Rain probability', value: rainProbNext48h, unit: '%' },
            { icon: '🌧️', labelKey: 'Expected rainfall', value: Math.round(expectedRainNext48h), unit: 'mm' },
            { icon: '🌾', labelKey: 'Crop & Stage', value: `${crop.name} (${crop.current_stage})` },
            { icon: '🌱', labelKey: 'Soil type', value: farm.soil_type },
          ],
          conclusionKey: 'Rain expected tomorrow and current moisture is adequate. Postponing irrigation prevents root rot and saves water & fuel.',
          advancedDetails: 'Computed via Open-Meteo precipitation model cross-referenced with FAO-56 crop coefficient (Kc) for flowering wheat.',
        },
      });
    } else if (current.temperature >= 35 && current.humidity <= 40) {
      recommendations.push({
        id: 'rec_irr_2',
        actionCode: 'IRRIGATE',
        category: 'irrigation',
        icon: '💧',
        titleKey: 'irrigate',
        descriptionKey: `High temperature (${current.temperature}°C) and low humidity (${current.humidity}%) are creating water deficit. Irrigate your field in the evening or early morning.`,
        status: 'recommended',
        priority: 1,
        riskLevel: 'high',
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Why irrigate now?',
          dataPoints: [
            { icon: '🌡️', labelKey: 'Temperature', value: current.temperature, unit: '°C' },
            { icon: '💧', labelKey: 'Humidity', value: current.humidity, unit: '%' },
            { icon: '🌾', labelKey: 'Crop & Stage', value: `${crop.name} (${crop.current_stage})` },
          ],
          conclusionKey: 'Evapotranspiration deficit detected. Timely irrigation will protect grain development.',
        },
      });
    } else {
      recommendations.push({
        id: 'rec_irr_3',
        actionCode: 'NO_IRRIGATION',
        category: 'irrigation',
        icon: '💧',
        titleKey: 'no_irrigation',
        descriptionKey: 'Soil moisture levels are balanced and weather is stable. No urgent irrigation required today.',
        status: 'recommended',
        priority: 1,
        riskLevel: 'low',
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Moisture status stable',
          dataPoints: [
            { icon: '🌡️', labelKey: 'Temperature', value: current.temperature, unit: '°C' },
            { icon: '💧', labelKey: 'Humidity', value: current.humidity, unit: '%' },
          ],
          conclusionKey: 'Normal growth conditions maintained.',
        },
      });
    }

    // --- RULE 2: CROP HEALTH / DISEASE ADVISORY ---
    if (current.humidity >= 65 && current.temperature >= 20 && current.temperature <= 32) {
      recommendations.push({
        id: 'rec_health_1',
        actionCode: 'INSPECT_CROP',
        category: 'crop_health',
        icon: '🐛',
        titleKey: 'inspect_crop',
        descriptionKey: `High humidity (${current.humidity}%) and moderate temperature (${current.temperature}°C) favor yellow rust development. Check leaf undersides.`,
        status: 'consider',
        priority: 2,
        riskLevel: 'medium',
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Why inspect for rust?',
          dataPoints: [
            { icon: '💧', labelKey: 'Relative humidity', value: current.humidity, unit: '%' },
            { icon: '🌡️', labelKey: 'Temperature', value: current.temperature, unit: '°C' },
            { icon: '🌾', labelKey: 'Crop age', value: `${crop.days_old} days` },
          ],
          conclusionKey: 'Microclimate promotes fungal spores. Early detection prevents widespread yield loss.',
        },
      });
    } else {
      recommendations.push({
        id: 'rec_health_2',
        actionCode: 'INSPECT_CROP',
        category: 'crop_health',
        icon: '🐛',
        titleKey: 'inspect_crop',
        descriptionKey: 'Periodic check: inspect crop for general vegetative vigor and weed density.',
        status: 'consider',
        priority: 2,
        riskLevel: 'low',
        timing: 'today',
      });
    }
    } // end if (weatherData && crop)

    // --- RULE 3: MARKET / SELLING DECISION ---
    const primaryCropName = crop ? crop.name : 'Wheat';
    const marketComp = await marketService.getMarketComparison(farmerId, primaryCropName, 100, lat, lon);
    const topMarket = marketComp.markets && marketComp.markets.length > 0 ? marketComp.markets[0] : null;

    if (topMarket && topMarket.name) {
      recommendations.push({
        id: 'rec_market_1',
        actionCode: 'COMPARE_MARKETS',
        category: 'market',
        icon: '💰',
        titleKey: 'compare_markets',
        descriptionKey: `Selling prices at ${topMarket.name} are favorable today (₹${topMarket.price.toLocaleString('en-IN')}/q). Estimated net return is ₹${topMarket.netReturn.toLocaleString('en-IN')}.`,
        status: 'consider',
        priority: 3,
        riskLevel: topMarket.riskLevel,
        timing: 'today',
        whyExplanation: {
          summaryKey: 'Market opportunity alert',
          dataPoints: [
            { icon: '💰', labelKey: 'Price', value: `₹${topMarket.price.toLocaleString('en-IN')}/q` },
            { icon: '🚛', labelKey: 'Distance', value: topMarket.distance, unit: 'km' },
            { icon: '📊', labelKey: 'Demand', value: topMarket.demand.toUpperCase() },
          ],
          conclusionKey: `${topMarket.name} offers highest net profit after transport and commission costs.`,
        },
      });
    }

    // --- RULE 4: SOIL HEALTH & NUTRIENT GUIDANCE ---
    try {
      const soilReport = await soilService.getLatestReport(farmerId);
      if (soilReport && soilReport.evaluation) {
        const evalSummary = soilReport.evaluation;
        if (evalSummary.deficienciesMr.length > 0) {
          recommendations.push({
            id: 'rec_soil_1',
            actionCode: 'SOIL_NUTRIENT_MANAGEMENT',
            category: 'crop_health',
            icon: '🧪',
            titleKey: 'soil_nutrient_management',
            descriptionKey: `माती परीक्षणानुसार: ${evalSummary.deficienciesMr.join(', ')} आढळली आहे. पिकाच्या पोषणासाठी सेंद्रिय किंवा शिफारस केलेली खते वेळेवर द्या.`,
            status: 'recommended',
            priority: 2,
            riskLevel: 'medium',
            timing: 'today',
            whyExplanation: {
              summaryKey: 'माती आरोग्य अहवाल विश्लेषण (Why soil management?)',
              dataPoints: [
                { icon: '🧪', labelKey: 'मातीचा pH', value: soilReport.ph },
                { icon: '🌿', labelKey: 'नायट्रोजन (N)', value: `${soilReport.nitrogenKgHa} kg/ha` },
                { icon: '🌾', labelKey: 'फॉस्फरस (P)', value: `${soilReport.phosphorusKgHa} kg/ha` },
                { icon: '🌱', labelKey: 'सेंद्रिय कर्ब (OC)', value: `${soilReport.organicCarbon}%` },
              ],
              conclusionKey: evalSummary.recommendationsMr[0] || 'संतुलित खत व्यवस्थापनाने पिकाचे उत्पादन व जमिनीची सुपीकता टिकवून ठेवा.',
              advancedDetails: `प्रयोगशाळा: ${soilReport.labName || 'Accredited Soil Lab'}. नमुना क्रमांक: ${soilReport.requestId || 'MH-SOIL'}.`,
            },
          });
        }
      }
    } catch (err) {
      console.warn('[DecisionEngine] Could not evaluate soil report:', err);
    }

    // Save/update recommendations in database for real registered farmers
    if (farmerId && farmerId !== 'guest' && !farmerId.startsWith('guest')) {
      for (const rec of recommendations) {
      await db.query(
        `INSERT INTO recommendations (
          id, farmer_id, action_code, category, icon, title_key, description_key,
          status, priority, risk_level, timing, why_summary, why_conclusion, data_points, advanced_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          title_key = EXCLUDED.title_key,
          description_key = EXCLUDED.description_key,
          why_summary = EXCLUDED.why_summary,
          why_conclusion = EXCLUDED.why_conclusion,
          data_points = EXCLUDED.data_points`,
        [
          rec.id,
          farmerId,
          rec.actionCode,
          rec.category,
          rec.icon,
          rec.titleKey,
          rec.descriptionKey,
          rec.status,
          rec.priority,
          rec.riskLevel,
          rec.timing,
          rec.whyExplanation?.summaryKey || null,
          rec.whyExplanation?.conclusionKey || null,
          rec.whyExplanation?.dataPoints ? JSON.stringify(rec.whyExplanation.dataPoints) : '[]',
          rec.whyExplanation?.advancedDetails || null,
        ]
      );
      }
    }

    return recommendations;
  }

  async markActionCompleted(actionId: string): Promise<boolean> {
    const res = await db.query(
      `UPDATE recommendations SET completed = TRUE, completed_at = NOW() WHERE id = $1`,
      [actionId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const decisionEngine = new DecisionEngine();
