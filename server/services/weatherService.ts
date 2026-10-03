import { db } from '../db/index.js';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionKey: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  expectedRainfall: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface WeatherForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: string;
  conditionKey: string;
  rainProbability: number;
  expectedRainfall?: number;
  humidity: number;
  windSpeed: number;
}

export interface FarmingImplication {
  id: string;
  type: 'irrigation' | 'disease' | 'field' | 'harvest' | 'sowing' | 'general';
  icon: string;
  titleKey: string;
  actionKey: string;
  severity: 'positive' | 'warning' | 'caution';
}

function mapWmoCode(code: number): { condition: string; conditionKey: string } {
  if (code === 0) return { condition: 'clear', conditionKey: 'clear' };
  if (code === 1 || code === 2) return { condition: 'partly_cloudy', conditionKey: 'partly_cloudy' };
  if (code === 3) return { condition: 'cloudy', conditionKey: 'cloudy' };
  if (code === 45 || code === 48) return { condition: 'fog', conditionKey: 'fog' };
  if (code >= 51 && code <= 65) return { condition: 'rain', conditionKey: 'rain' };
  if (code >= 80 && code <= 82) return { condition: 'heavy_rain', conditionKey: 'heavy_rain' };
  if (code >= 95) return { condition: 'thunderstorm', conditionKey: 'thunderstorm' };
  return { condition: 'clear', conditionKey: 'clear' };
}

export class WeatherService {
  /**
   * Fetch current weather & forecast for coordinates, with caching and fallback
   */
  async getWeather(lat: number = 26.2183, lon: number = 78.1828): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
    metadata?: {
      dataSource: string;
      lastUpdated: string | Date;
      isCached: boolean;
      isStale: boolean;
    };
  }> {
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

    // 1. Check cache (valid for 30 minutes)
    try {
      const cached = await db.query(
        `SELECT * FROM weather_cache WHERE id = $1 AND cached_at > NOW() - INTERVAL '30 minutes'`,
        [cacheKey]
      );
      if (cached.rows.length > 0) {
        const row = cached.rows[0];
        const current = typeof row.current_json === 'string' ? JSON.parse(row.current_json) : row.current_json;
        const forecast = typeof row.forecast_json === 'string' ? JSON.parse(row.forecast_json) : row.forecast_json;
        const implications = typeof row.implications_json === 'string' ? JSON.parse(row.implications_json) : row.implications_json;
        return { current, forecast, implications };
      }
    } catch (e) {
      console.warn('[WeatherService] Cache lookup error, proceeding with live fetch:', e);
    }

    // 2. Live fetch from Open-Meteo API (Free, high precision for India)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }

      const data: any = await response.json();
      const currentRaw = data.current;
      const dailyRaw = data.daily;

      const mappedCurrent = mapWmoCode(currentRaw.weather_code);
      const tomorrowRainProb = dailyRaw.precipitation_probability_max?.[1] ?? 40;
      const tomorrowRainAmount = dailyRaw.precipitation_sum?.[1] ?? 0;

      const current: WeatherData = {
        temperature: Math.round(currentRaw.temperature_2m),
        feelsLike: Math.round(currentRaw.apparent_temperature),
        condition: mappedCurrent.condition,
        conditionKey: mappedCurrent.conditionKey,
        humidity: Math.round(currentRaw.relative_humidity_2m),
        windSpeed: Math.round(currentRaw.wind_speed_10m),
        rainProbability: dailyRaw.precipitation_probability_max?.[0] ?? 10,
        expectedRainfall: dailyRaw.precipitation_sum?.[0] ?? 0,
        lastUpdated: new Date().toISOString(),
        isDemo: false,
      };

      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const forecast: WeatherForecast[] = [];

      for (let i = 0; i < Math.min(3, dailyRaw.time.length); i++) {
        const d = new Date(dailyRaw.time[i]);
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[d.getDay()];
        const mappedDaily = mapWmoCode(dailyRaw.weather_code[i]);

        forecast.push({
          date: dailyRaw.time[i],
          dayName,
          high: Math.round(dailyRaw.temperature_2m_max[i]),
          low: Math.round(dailyRaw.temperature_2m_min[i]),
          condition: mappedDaily.condition,
          conditionKey: mappedDaily.conditionKey,
          rainProbability: dailyRaw.precipitation_probability_max[i] ?? 0,
          expectedRainfall: dailyRaw.precipitation_sum[i] ?? 0,
          humidity: current.humidity,
          windSpeed: current.windSpeed,
        });
      }

      // Generate Agricultural Implications based on real metrics
      const implications: FarmingImplication[] = [];

      if (tomorrowRainProb >= 60 || tomorrowRainAmount >= 5) {
        implications.push({
          id: 'fi_1',
          type: 'irrigation',
          icon: '💧',
          titleKey: 'Postpone',
          actionKey: `Rain expected tomorrow (${tomorrowRainProb}% chance, ~${Math.round(tomorrowRainAmount)}mm). Skip irrigation today.`,
          severity: 'positive',
        });
      } else {
        implications.push({
          id: 'fi_1',
          type: 'irrigation',
          icon: '💧',
          titleKey: 'Adequate',
          actionKey: 'Dry weather expected for the next 48 hours. Irrigate if topsoil is dry.',
          severity: 'positive',
        });
      }

      if (current.humidity >= 65 && current.temperature >= 20 && current.temperature <= 32) {
        implications.push({
          id: 'fi_2',
          type: 'disease',
          icon: '🐛',
          titleKey: 'Medium Risk',
          actionKey: 'High relative humidity favours fungal rust on wheat. Inspect crop leaves today.',
          severity: 'warning',
        });
      } else {
        implications.push({
          id: 'fi_2',
          type: 'disease',
          icon: '🐛',
          titleKey: 'Low Risk',
          actionKey: 'Weather conditions currently unfavorable for rapid pest multiplication.',
          severity: 'positive',
        });
      }

      implications.push({
        id: 'fi_3',
        type: 'field',
        icon: '🌾',
        titleKey: 'Drainage',
        actionKey: 'Check field bunds and drainage outlets to avoid water stagnation.',
        severity: 'caution',
      });

      // Save to cache
      await db.query(
        `INSERT INTO weather_cache (id, latitude, longitude, current_json, forecast_json, implications_json, cached_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           current_json = EXCLUDED.current_json,
           forecast_json = EXCLUDED.forecast_json,
           implications_json = EXCLUDED.implications_json,
           cached_at = NOW()`,
        [cacheKey, lat, lon, JSON.stringify(current), JSON.stringify(forecast), JSON.stringify(implications)]
      );

      const metadata = {
        dataSource: 'Open-Meteo Weather API',
        lastUpdated: new Date().toISOString(),
        isCached: false,
        isStale: false,
      };

      return { current, forecast, implications, metadata };
    } catch (apiError: any) {
      console.warn('[WeatherService] Live weather fetch failed, checking database cache:', apiError.message);

      // Try reading any valid cached record from the last 24 hours
      const anyCached = await db.query(
        `SELECT * FROM weather_cache WHERE id = $1 AND cached_at > NOW() - INTERVAL '24 hours' ORDER BY cached_at DESC LIMIT 1`,
        [cacheKey]
      );

      if (anyCached.rows.length > 0) {
        const row = anyCached.rows[0];
        const current = typeof row.current_json === 'string' ? JSON.parse(row.current_json) : row.current_json;
        const forecast = typeof row.forecast_json === 'string' ? JSON.parse(row.forecast_json) : row.forecast_json;
        const implications = typeof row.implications_json === 'string' ? JSON.parse(row.implications_json) : row.implications_json;
        return {
          current,
          forecast,
          implications,
          metadata: {
            dataSource: 'Open-Meteo Weather API (Cached Archive)',
            lastUpdated: row.cached_at,
            isCached: true,
            isStale: true,
          },
        };
      }

      // No fake weather. Throw clear error code.
      const error = new Error('Weather data is temporarily unavailable.');
      (error as any).code = 'WEATHER_UNAVAILABLE';
      throw error;
    }
  }
}

export const weatherService = new WeatherService();

