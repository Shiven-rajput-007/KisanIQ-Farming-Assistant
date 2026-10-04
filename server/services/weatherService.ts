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

function mapWeatherApiCondition(conditionText: string = ''): { condition: string; conditionKey: string } {
  const text = conditionText.toLowerCase();
  if (text.includes('thunder') || text.includes('storm')) {
    return { condition: 'thunderstorm', conditionKey: 'thunderstorm' };
  }
  if (text.includes('heavy rain') || text.includes('torrential')) {
    return { condition: 'heavy_rain', conditionKey: 'heavy_rain' };
  }
  if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) {
    return { condition: 'rain', conditionKey: 'rain' };
  }
  if (text.includes('cloud') || text.includes('overcast')) {
    if (text.includes('partly')) return { condition: 'partly_cloudy', conditionKey: 'partly_cloudy' };
    return { condition: 'cloudy', conditionKey: 'cloudy' };
  }
  if (text.includes('fog') || text.includes('mist')) {
    return { condition: 'fog', conditionKey: 'fog' };
  }
  if (text.includes('haze') || text.includes('smoke')) {
    return { condition: 'haze', conditionKey: 'haze' };
  }
  if (text.includes('snow') || text.includes('blizzard') || text.includes('ice') || text.includes('freez')) {
    return { condition: 'cold', conditionKey: 'cold' };
  }
  return { condition: 'clear', conditionKey: 'clear' };
}

export class WeatherService {
  public getWeatherApiBaseUrl(): string {
    return (process.env.WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1').replace(/\/$/, '');
  }

  public getOpenMeteoBaseUrl(): string {
    return (process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com').replace(/\/$/, '');
  }

  /**
   * Generates genuine agricultural implications from real weather measurements
   */
  public generateImplications(
    temp: number | null,
    humidity: number | null,
    tomorrowRainProb: number | null,
    tomorrowRainAmount: number | null
  ): FarmingImplication[] {
    const implications: FarmingImplication[] = [];

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

    return implications;
  }

  /**
   * Two-provider weather architecture:
   * 1. Check fresh cache (30 min)
   * 2. Primary: WeatherAPI.com (if WEATHER_API_KEY configured)
   * 3. Secondary: Open-Meteo API
   * 4. Archived cache fallback (24 hours)
   * 5. Strictly throw WEATHER_UNAVAILABLE — zero fake numbers
   */
  async getWeather(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
    metadata: {
      dataSource: string;
      provider: 'weatherapi' | 'open-meteo' | 'cache';
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
            dataSource: 'KisanIQ Meteorological Cache (Fresh)',
            provider: 'cache',
            apiUrl: 'database',
            lastUpdated: row.cached_at,
            isCached: true,
            isStale: false,
          },
        };
      }
    } catch (e) {
      console.warn('[WeatherService] Cache lookup notice:', e);
    }

    // 3. Primary Provider: WeatherAPI.com (if WEATHER_API_KEY is present)
    const weatherApiKey = process.env.WEATHER_API_KEY;
    if (weatherApiKey && weatherApiKey.trim() !== '') {
      try {
        const wApiBase = this.getWeatherApiBaseUrl();
        const url = `${wApiBase}/forecast.json?key=${encodeURIComponent(weatherApiKey.trim())}&q=${lat},${lon}&days=3&aqi=no&alerts=no`;

        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const json: any = await response.json();
          if (json && json.current && json.forecast && Array.isArray(json.forecast.forecastday)) {
            const cond = mapWeatherApiCondition(json.current.condition?.text);
            const currentTemp = json.current.temp_c !== undefined ? Math.round(Number(json.current.temp_c)) : null;
            const feelsLike = json.current.feelslike_c !== undefined ? Math.round(Number(json.current.feelslike_c)) : null;
            const humidity = json.current.humidity !== undefined ? Math.round(Number(json.current.humidity)) : null;
            const windSpeed = json.current.wind_kph !== undefined ? Math.round(Number(json.current.wind_kph)) : null;
            const rainProb = json.forecast.forecastday[0]?.day?.daily_chance_of_rain !== undefined
              ? Number(json.forecast.forecastday[0].day.daily_chance_of_rain)
              : null;
            const expectedRain = json.forecast.forecastday[0]?.day?.totalprecip_mm !== undefined
              ? Number(json.forecast.forecastday[0].day.totalprecip_mm)
              : null;

            const current: WeatherData = {
              temperature: currentTemp,
              feelsLike,
              condition: cond.condition,
              conditionKey: cond.conditionKey,
              humidity,
              windSpeed,
              rainProbability: rainProb,
              expectedRainfall: expectedRain,
              uvIndex: json.current.uv !== undefined ? Number(json.current.uv) : null,
              lastUpdated: new Date().toISOString(),
            };

            const forecast: WeatherForecast[] = json.forecast.forecastday.map((fDay: any) => {
              const dayDate = fDay.date;
              const dateObj = new Date(dayDate);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayCond = mapWeatherApiCondition(fDay.day?.condition?.text);

              return {
                date: dayDate,
                dayName,
                high: fDay.day?.maxtemp_c !== undefined ? Math.round(Number(fDay.day.maxtemp_c)) : null,
                low: fDay.day?.mintemp_c !== undefined ? Math.round(Number(fDay.day.mintemp_c)) : null,
                condition: dayCond.condition,
                conditionKey: dayCond.conditionKey,
                rainProbability: fDay.day?.daily_chance_of_rain !== undefined ? Number(fDay.day.daily_chance_of_rain) : null,
                expectedRainfall: fDay.day?.totalprecip_mm !== undefined ? Number(fDay.day.totalprecip_mm) : null,
                humidity: fDay.day?.avghumidity !== undefined ? Math.round(Number(fDay.day.avghumidity)) : null,
                windSpeed: fDay.day?.maxwind_kph !== undefined ? Math.round(Number(fDay.day.maxwind_kph)) : null,
              };
            });

            const tomorrowRainProb = json.forecast.forecastday[1]?.day?.daily_chance_of_rain !== undefined
              ? Number(json.forecast.forecastday[1].day.daily_chance_of_rain)
              : null;
            const tomorrowRainAmount = json.forecast.forecastday[1]?.day?.totalprecip_mm !== undefined
              ? Number(json.forecast.forecastday[1].day.totalprecip_mm)
              : null;

            const implications = this.generateImplications(currentTemp, humidity, tomorrowRainProb, tomorrowRainAmount);

            // Save to cache
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
            } catch (err) {
              console.warn('[WeatherService] Cache save notice:', err);
            }

            return {
              current,
              forecast,
              implications,
              metadata: {
                dataSource: 'WeatherAPI.com',
                provider: 'weatherapi',
                apiUrl: wApiBase,
                lastUpdated: new Date().toISOString(),
                isCached: false,
                isStale: false,
              },
            };
          }
        }
      } catch (wApiErr: any) {
        console.warn('[WeatherService] Primary WeatherAPI.com failed, attempting secondary provider:', wApiErr.message);
      }
    }

    // 4. Secondary Provider: Open-Meteo API
    const openMeteoBase = this.getOpenMeteoBaseUrl();
    const openMeteoUrl = `${openMeteoBase}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata`;

    let openMeteoResponse: Response | null = null;
    let openMeteoError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        openMeteoResponse = await fetch(openMeteoUrl, { signal: AbortSignal.timeout(12000) });
        if (openMeteoResponse.ok) {
          openMeteoError = null;
          break;
        } else {
          openMeteoError = new Error(`Open-Meteo returned status ${openMeteoResponse.status}`);
        }
      } catch (err: any) {
        openMeteoError = err;
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (openMeteoResponse && openMeteoResponse.ok) {
      try {
        const data: any = await openMeteoResponse.json();
        const currentRaw = data.current || {};
        const dailyRaw = data.daily || {};

        const temp = currentRaw.temperature_2m !== undefined ? Math.round(Number(currentRaw.temperature_2m)) : null;
        const feelsLike = currentRaw.apparent_temperature !== undefined ? Math.round(Number(currentRaw.apparent_temperature)) : null;
        const humidity = currentRaw.relative_humidity_2m !== undefined ? Math.round(Number(currentRaw.relative_humidity_2m)) : null;
        const windSpeed = currentRaw.wind_speed_10m !== undefined ? Math.round(Number(currentRaw.wind_speed_10m)) : null;
        const rainProbability =
          dailyRaw.precipitation_probability_max?.[0] !== undefined
            ? Number(dailyRaw.precipitation_probability_max[0])
            : null;
        const expectedRainfall =
          currentRaw.precipitation !== undefined ? Number(currentRaw.precipitation) : null;

        const conditionInfo = mapWmoCode(currentRaw.weather_code);

        const current: WeatherData = {
          temperature: temp,
          feelsLike,
          condition: conditionInfo.condition,
          conditionKey: conditionInfo.conditionKey,
          humidity,
          windSpeed,
          rainProbability,
          expectedRainfall,
          lastUpdated: new Date().toISOString(),
        };

        const forecast: WeatherForecast[] = [];
        const dates: string[] = dailyRaw.time || [];
        for (let i = 0; i < Math.min(dates.length, 3); i++) {
          const dStr = dates[i];
          const dateObj = new Date(dStr);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayCode = dailyRaw.weather_code?.[i];
          const dayCond = mapWmoCode(dayCode);

          forecast.push({
            date: dStr,
            dayName,
            high: dailyRaw.temperature_2m_max?.[i] !== undefined ? Math.round(Number(dailyRaw.temperature_2m_max[i])) : null,
            low: dailyRaw.temperature_2m_min?.[i] !== undefined ? Math.round(Number(dailyRaw.temperature_2m_min[i])) : null,
            condition: dayCond.condition,
            conditionKey: dayCond.conditionKey,
            rainProbability:
              dailyRaw.precipitation_probability_max?.[i] !== undefined
                ? Number(dailyRaw.precipitation_probability_max[i])
                : null,
            expectedRainfall:
              dailyRaw.precipitation_sum?.[i] !== undefined ? Number(dailyRaw.precipitation_sum[i]) : null,
            humidity,
            windSpeed,
          });
        }

        const tomorrowRainProb = dailyRaw.precipitation_probability_max?.[1] !== undefined
          ? Number(dailyRaw.precipitation_probability_max[1])
          : null;
        const tomorrowRainAmount = dailyRaw.precipitation_sum?.[1] !== undefined
          ? Number(dailyRaw.precipitation_sum[1])
          : null;

        const implications = this.generateImplications(temp, humidity, tomorrowRainProb, tomorrowRainAmount);

        // Save to cache
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

        return {
          current,
          forecast,
          implications,
          metadata: {
            dataSource: 'Open-Meteo Weather API',
            provider: 'open-meteo',
            apiUrl: openMeteoBase,
            lastUpdated: new Date().toISOString(),
            isCached: false,
            isStale: false,
          },
        };
      } catch (parseErr: any) {
        console.warn('[WeatherService] Open-Meteo parsing error:', parseErr.message);
      }
    }

    // 5. Check for archived cache from the last 24 hours
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
            dataSource: 'KisanIQ Meteorological Cache (24h Archive)',
            provider: 'cache',
            apiUrl: 'database',
            lastUpdated: row.cached_at,
            isCached: true,
            isStale: true,
          },
        };
      }
    } catch (cacheErr) {
      console.warn('[WeatherService] Archive cache lookup error:', cacheErr);
    }

    // 6. Strictly return explicit unavailable error — ZERO synthetic weather numbers
    const error = new Error('Weather data is temporarily unavailable from both meteorological providers.');
    (error as any).code = 'WEATHER_UNAVAILABLE';
    throw error;
  }
}

export const weatherService = new WeatherService();
