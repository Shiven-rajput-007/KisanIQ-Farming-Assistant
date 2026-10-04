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
    return (process.env.WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1').replace(/\/+$/, '');
  }

  public getOpenMeteoBaseUrl(): string {
    let url = (process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com').trim().replace(/\/+$/, '');
    if (url.endsWith('/v1')) {
      url = url.substring(0, url.length - 3);
    }
    return url;
  }

  public isWeatherApiConfigured(): boolean {
    const key = process.env.WEATHER_API_KEY;
    return Boolean(key && key.trim() !== '');
  }

  public isOpenMeteoConfigured(): boolean {
    return true;
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
   * Fetch weather from WeatherAPI.com (Primary provider)
   * Official endpoint: GET /forecast.json?key=...&q=<lat>,<lon>&days=3&aqi=no&alerts=no
   * Timeout: 6000ms. Retries at most once for transient errors. Never retries 4xx.
   */
  private async fetchFromWeatherApi(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
  } | null> {
    const key = process.env.WEATHER_API_KEY?.trim();
    if (!key) return null;

    const baseUrl = this.getWeatherApiBaseUrl();
    const url = `${baseUrl}/forecast.json?key=${encodeURIComponent(key)}&q=${lat},${lon}&days=3&aqi=no&alerts=no`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const startTime = Date.now();
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(6000),
        });
        const duration = Date.now() - startTime;

        if (res.ok) {
          const json: any = await res.json();
          if (json && json.current && json.forecast && Array.isArray(json.forecast.forecastday)) {
            const cond = mapWeatherApiCondition(json.current.condition?.text);
            const currentTemp = json.current.temp_c !== undefined && json.current.temp_c !== null
              ? Math.round(Number(json.current.temp_c))
              : null;
            const feelsLike = json.current.feelslike_c !== undefined && json.current.feelslike_c !== null
              ? Math.round(Number(json.current.feelslike_c))
              : null;
            const humidity = json.current.humidity !== undefined && json.current.humidity !== null
              ? Math.round(Number(json.current.humidity))
              : null;
            const windSpeed = json.current.wind_kph !== undefined && json.current.wind_kph !== null
              ? Math.round(Number(json.current.wind_kph))
              : null;
            const rainProb = json.forecast.forecastday[0]?.day?.daily_chance_of_rain !== undefined
              ? Number(json.forecast.forecastday[0].day.daily_chance_of_rain)
              : null;
            const expectedRain = json.forecast.forecastday[0]?.day?.totalprecip_mm !== undefined
              ? Number(json.forecast.forecastday[0].day.totalprecip_mm)
              : null;
            const uv = json.current.uv !== undefined && json.current.uv !== null ? Number(json.current.uv) : null;

            const current: WeatherData = {
              temperature: currentTemp,
              feelsLike,
              condition: cond.condition,
              conditionKey: cond.conditionKey,
              humidity,
              windSpeed,
              rainProbability: rainProb,
              expectedRainfall: expectedRain,
              uvIndex: uv,
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
                high: fDay.day?.maxtemp_c !== undefined && fDay.day?.maxtemp_c !== null
                  ? Math.round(Number(fDay.day.maxtemp_c))
                  : null,
                low: fDay.day?.mintemp_c !== undefined && fDay.day?.mintemp_c !== null
                  ? Math.round(Number(fDay.day.mintemp_c))
                  : null,
                condition: dayCond.condition,
                conditionKey: dayCond.conditionKey,
                rainProbability: fDay.day?.daily_chance_of_rain !== undefined
                  ? Number(fDay.day.daily_chance_of_rain)
                  : null,
                expectedRainfall: fDay.day?.totalprecip_mm !== undefined
                  ? Number(fDay.day.totalprecip_mm)
                  : null,
                humidity: fDay.day?.avghumidity !== undefined && fDay.day?.avghumidity !== null
                  ? Math.round(Number(fDay.day.avghumidity))
                  : null,
                windSpeed: fDay.day?.maxwind_kph !== undefined && fDay.day?.maxwind_kph !== null
                  ? Math.round(Number(fDay.day.maxwind_kph))
                  : null,
              };
            });

            const tomorrowRainProb = json.forecast.forecastday[1]?.day?.daily_chance_of_rain !== undefined
              ? Number(json.forecast.forecastday[1].day.daily_chance_of_rain)
              : null;
            const tomorrowRainAmount = json.forecast.forecastday[1]?.day?.totalprecip_mm !== undefined
              ? Number(json.forecast.forecastday[1].day.totalprecip_mm)
              : null;

            const implications = this.generateImplications(currentTemp, humidity, tomorrowRainProb, tomorrowRainAmount);
            console.log(`[Weather] WeatherAPI success host=${baseUrl} duration=${duration}ms`);
            return { current, forecast, implications };
          }
        }

        // Handle HTTP error
        console.warn(`[Weather] WeatherAPI failed host=${baseUrl} status=${res.status} duration=${duration}ms`);
        // Permanent 4xx error (e.g. 401 unauthorized, 403 forbidden) — do not retry
        if (res.status >= 400 && res.status < 500) {
          return null;
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
        console.warn(
          `[Weather] WeatherAPI failed host=${baseUrl} type=${isTimeout ? 'timeout' : 'network'} code=${err.code || err.name} duration=${duration}ms`
        );
      }

      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return null;
  }

  /**
   * Fetch weather from Open-Meteo (Secondary provider)
   * Official endpoint: GET /v1/forecast?latitude=...&longitude=...&current=...&daily=...&timezone=Asia/Kolkata
   * Timeout: 6000ms. Retries at most once for transient errors.
   */
  private async fetchFromOpenMeteo(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
    successfulUrl: string;
  } | null> {
    const baseCandidate = this.getOpenMeteoBaseUrl();
    const urls = [
      `${baseCandidate}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata`
    ];
    if (baseCandidate !== 'https://api.open-meteo.com') {
      urls.push(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata`
      );
    }

    for (const testUrl of urls) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const startTime = Date.now();
        try {
          const res = await fetch(testUrl, {
            headers: {
              'User-Agent': 'KisanIQ-Farming-Assistant/2.0 (contact@kisaniq.in)',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(6000),
          });
          const duration = Date.now() - startTime;

          if (res.ok) {
            const data: any = await res.json();
            const currentRaw = data.current || {};
            const dailyRaw = data.daily || {};

            const temp = currentRaw.temperature_2m !== undefined && currentRaw.temperature_2m !== null
              ? Math.round(Number(currentRaw.temperature_2m))
              : null;
            const feelsLike = currentRaw.apparent_temperature !== undefined && currentRaw.apparent_temperature !== null
              ? Math.round(Number(currentRaw.apparent_temperature))
              : null;
            const humidity = currentRaw.relative_humidity_2m !== undefined && currentRaw.relative_humidity_2m !== null
              ? Math.round(Number(currentRaw.relative_humidity_2m))
              : null;
            const windSpeed = currentRaw.wind_speed_10m !== undefined && currentRaw.wind_speed_10m !== null
              ? Math.round(Number(currentRaw.wind_speed_10m))
              : null;
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
                high: dailyRaw.temperature_2m_max?.[i] !== undefined
                  ? Math.round(Number(dailyRaw.temperature_2m_max[i]))
                  : null,
                low: dailyRaw.temperature_2m_min?.[i] !== undefined
                  ? Math.round(Number(dailyRaw.temperature_2m_min[i]))
                  : null,
                condition: dayCond.condition,
                conditionKey: dayCond.conditionKey,
                rainProbability:
                  dailyRaw.precipitation_probability_max?.[i] !== undefined
                    ? Number(dailyRaw.precipitation_probability_max[i])
                    : null,
                expectedRainfall:
                  dailyRaw.precipitation_sum?.[i] !== undefined
                    ? Number(dailyRaw.precipitation_sum[i])
                    : null,
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
            console.log(`[Weather] Open-Meteo success duration=${duration}ms`);
            return { current, forecast, implications, successfulUrl: testUrl };
          }

          console.warn(`[Weather] Open-Meteo failed status=${res.status} duration=${duration}ms`);
          if (res.status >= 400 && res.status < 500) break;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
          console.warn(
            `[Weather] Open-Meteo failed type=${isTimeout ? 'timeout' : 'network'} code=${err.code || err.name} duration=${duration}ms`
          );
        }

        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    return null;
  }

  /**
   * Primary Weather Service Pipeline:
   * 1. Fresh database cache (max 15–30 minutes)
   * 2. WeatherAPI.com (Primary provider)
   * 3. Open-Meteo (Secondary provider)
   * 4. Valid recent cached data (up to 24h archive, clearly marked stale)
   * 5. Explicit WEATHER_UNAVAILABLE
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

    // 3. Primary Provider: WeatherAPI.com (if configured)
    if (this.isWeatherApiConfigured()) {
      const weatherApiData = await this.fetchFromWeatherApi(lat, lon);
      if (weatherApiData) {
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
            [
              cacheKey,
              lat,
              lon,
              JSON.stringify(weatherApiData.current),
              JSON.stringify(weatherApiData.forecast),
              JSON.stringify(weatherApiData.implications),
            ]
          );
        } catch (saveErr) {
          console.warn('[WeatherService] Cache save notice:', saveErr);
        }

        return {
          current: weatherApiData.current,
          forecast: weatherApiData.forecast,
          implications: weatherApiData.implications,
          metadata: {
            dataSource: 'WeatherAPI.com',
            provider: 'weatherapi',
            apiUrl: this.getWeatherApiBaseUrl(),
            lastUpdated: new Date().toISOString(),
            isCached: false,
            isStale: false,
          },
        };
      }
    }

    // 4. Secondary Provider: Open-Meteo API
    const openMeteoData = await this.fetchFromOpenMeteo(lat, lon);
    if (openMeteoData) {
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
          [
            cacheKey,
            lat,
            lon,
            JSON.stringify(openMeteoData.current),
            JSON.stringify(openMeteoData.forecast),
            JSON.stringify(openMeteoData.implications),
          ]
        );
      } catch (saveErr) {
        console.warn('[WeatherService] Cache save notice:', saveErr);
      }

      return {
        current: openMeteoData.current,
        forecast: openMeteoData.forecast,
        implications: openMeteoData.implications,
        metadata: {
          dataSource: 'Open-Meteo Weather API',
          provider: 'open-meteo',
          apiUrl: openMeteoData.successfulUrl,
          lastUpdated: new Date().toISOString(),
          isCached: false,
          isStale: false,
        },
      };
    }

    // 5. Valid Recent Cached Data (up to 24 hours archive)
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

    // 6. Strictly return explicit WEATHER_UNAVAILABLE — zero synthetic weather numbers
    const error = new Error('Weather data is temporarily unavailable from both meteorological providers.');
    (error as any).code = 'WEATHER_UNAVAILABLE';
    throw error;
  }
}

export const weatherService = new WeatherService();
