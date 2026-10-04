import { db } from '../db/index.js';

export interface WeatherData {
  temperature: number | null;
  feelsLike: number | null;
  condition: string;
  conditionKey: string;
  humidity: number | null;
  windSpeed: number | null;
  rainProbability: number | null;
  expectedRainfall: number | null;
  uvIndex?: number | null;
  sunrise?: string;
  sunset?: string;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface WeatherForecast {
  date: string;
  dayName: string;
  high: number | null;
  low: number | null;
  condition: string;
  conditionKey: string;
  rainProbability: number | null;
  expectedRainfall?: number | null;
  humidity: number | null;
  windSpeed: number | null;
}

export interface FarmingImplication {
  id: string;
  type: 'irrigation' | 'disease' | 'field' | 'harvest' | 'sowing' | 'general';
  icon: string;
  titleKey: string;
  actionKey: string;
  severity: 'positive' | 'warning' | 'caution';
}

function mapWmoCode(code?: number | null): { condition: string; conditionKey: string } {
  if (code === undefined || code === null || isNaN(code)) {
    return { condition: 'clear', conditionKey: 'clear' };
  }
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
  public getBaseUrl(): string {
    return (process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com').replace(/\/$/, '');
  }

  /**
   * Fetch current weather & forecast for real coordinates from Open-Meteo, with caching
   * Zero fake coordinates and zero synthetic default metrics.
   */
  async getWeather(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
    metadata: {
      dataSource: string;
      apiUrl: string;
      lastUpdated: string | Date;
      isCached: boolean;
      isStale: boolean;
    };
  }> {
    // 1. Strict coordinate validation
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      const err = new Error('Valid geographic coordinates (latitude and longitude) are required.');
      (err as any).code = 'LOCATION_REQUIRED';
      throw err;
    }

    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

    // 2. Check fresh database cache (valid for 30 minutes)
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
        return {
          current,
          forecast,
          implications,
          metadata: {
            dataSource: 'Open-Meteo Weather API (Cache)',
            apiUrl: this.getBaseUrl(),
            lastUpdated: row.cached_at,
            isCached: true,
            isStale: false,
          },
        };
      }
    } catch (e) {
      console.warn('[WeatherService] Cache lookup error, proceeding with live fetch:', e);
    }

    // 3. Live fetch from Open-Meteo API using configured OPEN_METEO_BASE_URL
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata`;

    let response: Response | null = null;
    let fetchError: any = null;

    // Retry once on transient network failure or timeout
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (response.ok) {
          fetchError = null;
          break;
        } else {
          fetchError = new Error(`Open-Meteo responded with HTTP status ${response.status}: ${response.statusText}`);
        }
      } catch (err: any) {
        fetchError = err;
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (!response || !response.ok) {
      console.warn('[WeatherService] Live Open-Meteo fetch failed:', fetchError?.message);

      // Check for archived cache from the last 24 hours
      try {
        const archive = await db.query(
          `SELECT * FROM weather_cache WHERE id = $1 AND cached_at > NOW() - INTERVAL '24 hours' ORDER BY cached_at DESC LIMIT 1`,
          [cacheKey]
        );
        if (archive.rows.length > 0) {
          const row = archive.rows[0];
          const current = typeof row.current_json === 'string' ? JSON.parse(row.current_json) : row.current_json;
          const forecast = typeof row.forecast_json === 'string' ? JSON.parse(row.forecast_json) : row.forecast_json;
          const implications = typeof row.implications_json === 'string' ? JSON.parse(row.implications_json) : row.implications_json;
          return {
            current,
            forecast,
            implications,
            metadata: {
              dataSource: 'Open-Meteo Weather API (Cached Archive)',
              apiUrl: baseUrl,
              lastUpdated: row.cached_at,
              isCached: true,
              isStale: true,
            },
          };
        }
      } catch (cacheErr) {
        console.warn('[WeatherService] Archive cache lookup error:', cacheErr);
      }

      // Strictly return explicit unavailable error — ZERO synthetic weather numbers
      const error = new Error('Weather data is temporarily unavailable.');
      (error as any).code = 'WEATHER_UNAVAILABLE';
      throw error;
    }

    const data: any = await response.json();
    const currentRaw = data?.current;
    const dailyRaw = data?.daily;

    if (!currentRaw || !dailyRaw) {
      const error = new Error('Malformed response received from meteorological provider.');
      (error as any).code = 'WEATHER_UNAVAILABLE';
      throw error;
    }

    const mappedCurrent = mapWmoCode(currentRaw.weather_code);

    // Extract genuine values without synthetic fallbacks
    const temp = typeof currentRaw.temperature_2m === 'number' ? Math.round(currentRaw.temperature_2m) : null;
    const feelsLike = typeof currentRaw.apparent_temperature === 'number' ? Math.round(currentRaw.apparent_temperature) : null;
    const humidity = typeof currentRaw.relative_humidity_2m === 'number' ? Math.round(currentRaw.relative_humidity_2m) : null;
    const windSpeed = typeof currentRaw.wind_speed_10m === 'number' ? Math.round(currentRaw.wind_speed_10m) : null;
    const rainProbability = Array.isArray(dailyRaw.precipitation_probability_max) && dailyRaw.precipitation_probability_max[0] !== undefined
      ? Number(dailyRaw.precipitation_probability_max[0])
      : null;
    const expectedRainfall = Array.isArray(dailyRaw.precipitation_sum) && dailyRaw.precipitation_sum[0] !== undefined
      ? Math.round(Number(dailyRaw.precipitation_sum[0]) * 10) / 10
      : null;

    const current: WeatherData = {
      temperature: temp,
      feelsLike,
      condition: mappedCurrent.condition,
      conditionKey: mappedCurrent.conditionKey,
      humidity,
      windSpeed,
      rainProbability,
      expectedRainfall,
      lastUpdated: new Date().toISOString(),
      isDemo: false,
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const forecast: WeatherForecast[] = [];

    const numDays = Math.min(3, Array.isArray(dailyRaw.time) ? dailyRaw.time.length : 0);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(dailyRaw.time[i]);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[d.getDay()];
      const mappedDaily = mapWmoCode(dailyRaw.weather_code?.[i]);

      forecast.push({
        date: dailyRaw.time[i],
        dayName,
        high: typeof dailyRaw.temperature_2m_max?.[i] === 'number' ? Math.round(dailyRaw.temperature_2m_max[i]) : null,
        low: typeof dailyRaw.temperature_2m_min?.[i] === 'number' ? Math.round(dailyRaw.temperature_2m_min[i]) : null,
        condition: mappedDaily.condition,
        conditionKey: mappedDaily.conditionKey,
        rainProbability: dailyRaw.precipitation_probability_max?.[i] !== undefined ? Number(dailyRaw.precipitation_probability_max[i]) : null,
        expectedRainfall: dailyRaw.precipitation_sum?.[i] !== undefined ? Math.round(Number(dailyRaw.precipitation_sum[i]) * 10) / 10 : null,
        humidity,
        windSpeed,
      });
    }

    // Generate Agricultural Implications based strictly on real metrics
    const implications: FarmingImplication[] = [];
    const tomorrowRainProb = dailyRaw.precipitation_probability_max?.[1] !== undefined ? Number(dailyRaw.precipitation_probability_max[1]) : null;
    const tomorrowRainAmount = dailyRaw.precipitation_sum?.[1] !== undefined ? Number(dailyRaw.precipitation_sum[1]) : null;

    if (tomorrowRainProb !== null && (tomorrowRainProb >= 60 || (tomorrowRainAmount !== null && tomorrowRainAmount >= 5))) {
      implications.push({
        id: 'fi_1',
        type: 'irrigation',
        icon: '💧',
        titleKey: 'Postpone',
        actionKey: `Rain expected tomorrow (${tomorrowRainProb}% chance${tomorrowRainAmount !== null ? `, ~${Math.round(tomorrowRainAmount)}mm` : ''}). Skip irrigation today.`,
        severity: 'positive',
      });
    } else if (tomorrowRainProb !== null) {
      implications.push({
        id: 'fi_1',
        type: 'irrigation',
        icon: '💧',
        titleKey: 'Adequate',
        actionKey: 'Dry weather expected for the next 48 hours. Irrigate if topsoil is dry.',
        severity: 'positive',
      });
    }

    if (humidity !== null && temp !== null && humidity >= 65 && temp >= 20 && temp <= 32) {
      implications.push({
        id: 'fi_2',
        type: 'disease',
        icon: '🐛',
        titleKey: 'Medium Risk',
        actionKey: 'High relative humidity favours fungal infections. Inspect crop leaves today.',
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

    // Save to PostgreSQL cache
    try {
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
    } catch (saveErr) {
      console.warn('[WeatherService] Cache save notice:', saveErr);
    }

    const metadata = {
      dataSource: 'Open-Meteo Weather API',
      apiUrl: baseUrl,
      lastUpdated: new Date().toISOString(),
      isCached: false,
      isStale: false,
    };

    return { current, forecast, implications, metadata };
  }
}

export const weatherService = new WeatherService();
