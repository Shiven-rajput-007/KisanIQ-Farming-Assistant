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
  pressure?: number | null;
  cloudCover?: number | null;
  precipitation?: number | null;
  weatherCode?: number | null;
  uvIndex?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
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

/**
 * Maps WMO weather codes (Open-Meteo) to standard KisanIQ condition keys
 */
function mapWmoCode(code?: number | null, temp?: number | null): { condition: string; conditionKey: string } {
  if (temp !== undefined && temp !== null && temp >= 42) {
    return { condition: 'hot', conditionKey: 'hot' };
  }
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

/**
 * Maps OpenWeather condition IDs to standard KisanIQ condition keys
 */
function mapOpenWeatherCondition(id?: number | null, mainText: string = '', temp?: number | null): { condition: string; conditionKey: string } {
  if (temp !== undefined && temp !== null && temp >= 42) {
    return { condition: 'hot', conditionKey: 'hot' };
  }
  if (!id) {
    const text = mainText.toLowerCase();
    if (text.includes('thunder') || text.includes('storm')) return { condition: 'thunderstorm', conditionKey: 'thunderstorm' };
    if (text.includes('heavy') || text.includes('torrential')) return { condition: 'heavy_rain', conditionKey: 'heavy_rain' };
    if (text.includes('rain') || text.includes('drizzle')) return { condition: 'rain', conditionKey: 'rain' };
    if (text.includes('cloud')) return { condition: 'cloudy', conditionKey: 'cloudy' };
    if (text.includes('snow') || text.includes('ice')) return { condition: 'cold', conditionKey: 'cold' };
    if (text.includes('fog') || text.includes('mist')) return { condition: 'fog', conditionKey: 'fog' };
    if (text.includes('haze') || text.includes('smoke') || text.includes('dust')) return { condition: 'haze', conditionKey: 'haze' };
    return { condition: 'clear', conditionKey: 'clear' };
  }

  // 2xx Thunderstorm
  if (id >= 200 && id < 300) {
    return { condition: 'thunderstorm', conditionKey: 'thunderstorm' };
  }
  // 3xx Drizzle
  if (id >= 300 && id < 400) {
    return { condition: 'rain', conditionKey: 'rain' };
  }
  // 5xx Rain
  if (id >= 500 && id < 600) {
    if (id === 502 || id === 503 || id === 504 || id === 522) {
      return { condition: 'heavy_rain', conditionKey: 'heavy_rain' };
    }
    return { condition: 'rain', conditionKey: 'rain' };
  }
  // 6xx Snow
  if (id >= 600 && id < 700) {
    return { condition: 'cold', conditionKey: 'cold' };
  }
  // 7xx Atmosphere
  if (id >= 700 && id < 800) {
    if (id === 701 || id === 741) return { condition: 'fog', conditionKey: 'fog' };
    if (id === 711 || id === 721) return { condition: 'haze', conditionKey: 'haze' };
    if (id === 781) return { condition: 'heavy_rain', conditionKey: 'heavy_rain' };
    return { condition: 'fog', conditionKey: 'fog' };
  }
  // 800 Clear
  if (id === 800) {
    return { condition: 'clear', conditionKey: 'clear' };
  }
  // 80x Clouds
  if (id === 801 || id === 802) {
    return { condition: 'partly_cloudy', conditionKey: 'partly_cloudy' };
  }
  if (id === 803 || id === 804) {
    return { condition: 'cloudy', conditionKey: 'cloudy' };
  }

  return { condition: 'clear', conditionKey: 'clear' };
}

export class WeatherService {
  public getOpenWeatherBaseUrl(): string {
    return (process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org').trim().replace(/\/+$/, '');
  }

  public getOpenMeteoBaseUrl(): string {
    let url = (process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com').trim().replace(/\/+$/, '');
    if (url.endsWith('/v1')) {
      url = url.substring(0, url.length - 3);
    }
    return url;
  }

  public isOpenWeatherConfigured(): boolean {
    const key = process.env.OPENWEATHER_API_KEY;
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
   * Fetch weather from OpenWeatherMap (Primary provider)
   * Official endpoints:
   * Current: GET /data/2.5/weather?lat=<lat>&lon=<lon>&appid=<key>&units=metric
   * Forecast: GET /data/2.5/forecast?lat=<lat>&lon=<lon>&appid=<key>&units=metric&cnt=24
   * Timeout: 6000ms. Retries at most once for transient errors. Never retries 4xx.
   */
  private async fetchFromOpenWeather(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
  } | null> {
    const key = process.env.OPENWEATHER_API_KEY?.trim();
    if (!key) return null;

    const baseUrl = this.getOpenWeatherBaseUrl();
    const currentUrl = `${baseUrl}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(key)}&units=metric`;
    const forecastUrl = `${baseUrl}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(key)}&units=metric&cnt=24`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const startTime = Date.now();
      try {
        // Fetch current and forecast in parallel with 6s timeout
        const [currentRes, forecastRes] = await Promise.all([
          fetch(currentUrl, { signal: AbortSignal.timeout(6000) }),
          fetch(forecastUrl, { signal: AbortSignal.timeout(6000) }),
        ]);

        const duration = Date.now() - startTime;

        if (currentRes.ok) {
          const currentJson: any = await currentRes.json();
          const forecastJson: any = forecastRes.ok ? await forecastRes.json() : null;

          const temp = currentJson.main?.temp !== undefined && currentJson.main?.temp !== null
            ? Math.round(Number(currentJson.main.temp))
            : null;
          const feelsLike = currentJson.main?.feels_like !== undefined && currentJson.main?.feels_like !== null
            ? Math.round(Number(currentJson.main.feels_like))
            : null;
          const humidity = currentJson.main?.humidity !== undefined && currentJson.main?.humidity !== null
            ? Math.round(Number(currentJson.main.humidity))
            : null;
          // OpenWeather wind.speed is in m/s (metric) -> convert to km/h (multiply by 3.6)
          const windSpeed = currentJson.wind?.speed !== undefined && currentJson.wind?.speed !== null
            ? Math.round(Number(currentJson.wind.speed) * 3.6)
            : null;
          const pressure = currentJson.main?.pressure !== undefined && currentJson.main?.pressure !== null
            ? Math.round(Number(currentJson.main.pressure))
            : null;
          const cloudCover = currentJson.clouds?.all !== undefined && currentJson.clouds?.all !== null
            ? Math.round(Number(currentJson.clouds.all))
            : null;
          const precipitation = currentJson.rain?.['1h'] !== undefined
            ? Number(currentJson.rain['1h'])
            : (currentJson.rain?.['3h'] !== undefined ? Number(currentJson.rain['3h']) : null);
          const weatherId = currentJson.weather?.[0]?.id !== undefined
            ? Number(currentJson.weather[0].id)
            : null;
          const mainText = currentJson.weather?.[0]?.main || '';
          const conditionInfo = mapOpenWeatherCondition(weatherId, mainText, temp);

          const sunrise = currentJson.sys?.sunrise
            ? new Date(currentJson.sys.sunrise * 1000).toISOString()
            : null;
          const sunset = currentJson.sys?.sunset
            ? new Date(currentJson.sys.sunset * 1000).toISOString()
            : null;

          // Parse forecast items into 3 daily buckets
          const forecast: WeatherForecast[] = [];
          let tomorrowRainProb: number | null = null;
          let tomorrowRainAmount: number | null = null;

          if (forecastJson && Array.isArray(forecastJson.list)) {
            // Group 3-hour forecasts by calendar date
            const daysMap = new Map<string, any[]>();
            for (const item of forecastJson.list) {
              const dateStr = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
              if (!daysMap.has(dateStr)) {
                daysMap.set(dateStr, []);
              }
              daysMap.get(dateStr)!.push(item);
            }

            const sortedDates = Array.from(daysMap.keys()).sort();
            // Up to 3 forecast days
            for (let i = 0; i < Math.min(sortedDates.length, 3); i++) {
              const dStr = sortedDates[i];
              const items = daysMap.get(dStr)!;
              const dateObj = new Date(dStr);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

              let maxTemp = -Infinity;
              let minTemp = Infinity;
              let maxPop = 0;
              let totalRain = 0;
              let avgHum = 0;
              let maxWind = 0;
              let middayItem = items[Math.floor(items.length / 2)] || items[0];

              for (const it of items) {
                const t = it.main?.temp !== undefined ? Number(it.main.temp) : 0;
                if (t > maxTemp) maxTemp = t;
                if (t < minTemp) minTemp = t;
                if (it.pop !== undefined && Number(it.pop) > maxPop) {
                  maxPop = Number(it.pop);
                }
                if (it.rain?.['3h']) {
                  totalRain += Number(it.rain['3h']);
                }
                if (it.main?.humidity) {
                  avgHum += Number(it.main.humidity);
                }
                if (it.wind?.speed) {
                  const ws = Number(it.wind.speed) * 3.6;
                  if (ws > maxWind) maxWind = ws;
                }
              }

              avgHum = items.length > 0 ? Math.round(avgHum / items.length) : (humidity || 50);
              const dayWeatherId = middayItem.weather?.[0]?.id;
              const dayMain = middayItem.weather?.[0]?.main || '';
              const dayCond = mapOpenWeatherCondition(dayWeatherId, dayMain, maxTemp !== -Infinity ? Math.round(maxTemp) : null);

              forecast.push({
                date: dStr,
                dayName,
                high: maxTemp !== -Infinity ? Math.round(maxTemp) : null,
                low: minTemp !== Infinity ? Math.round(minTemp) : null,
                condition: dayCond.condition,
                conditionKey: dayCond.conditionKey,
                rainProbability: Math.round(maxPop * 100),
                expectedRainfall: Math.round(totalRain * 10) / 10,
                humidity: avgHum,
                windSpeed: Math.round(maxWind),
              });
            }

            if (forecast.length > 1) {
              tomorrowRainProb = forecast[1].rainProbability;
              tomorrowRainAmount = forecast[1].expectedRainfall ?? null;
            }
          }

          const current: WeatherData = {
            temperature: temp,
            feelsLike,
            condition: conditionInfo.condition,
            conditionKey: conditionInfo.conditionKey,
            humidity,
            windSpeed,
            rainProbability: forecast[0]?.rainProbability ?? null,
            expectedRainfall: precipitation,
            pressure,
            cloudCover,
            precipitation,
            weatherCode: weatherId,
            sunrise,
            sunset,
            lastUpdated: new Date().toISOString(),
          };

          const implications = this.generateImplications(temp, humidity, tomorrowRainProb, tomorrowRainAmount);
          console.log(`[Weather] provider=OpenWeatherMap status=200 duration=${duration}ms`);
          return { current, forecast, implications };
        }

        // Safe logging of OpenWeather error without exposing API key
        console.warn(`[Weather] provider=OpenWeatherMap status=${currentRes.status} duration=${duration}ms`);

        // Permanent 4xx error (e.g. 401 unauthorized, 403 forbidden, 404 not found) — do NOT retry
        if (currentRes.status >= 400 && currentRes.status < 500) {
          return null;
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.warn(
          `[Weather] provider=OpenWeatherMap network_error code=${err.code || err.name || 'NETWORK_ERROR'} duration=${duration}ms`
        );
      }

      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return null;
  }

  /**
   * Fetch weather from Open-Meteo (Secondary fallback provider)
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
    const queryParams = 'current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata';

    const urls = [
      `${baseCandidate}/v1/forecast?latitude=${lat}&longitude=${lon}&${queryParams}`
    ];
    if (baseCandidate !== 'https://api.open-meteo.com') {
      urls.push(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${queryParams}`
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
            const pressure = currentRaw.surface_pressure !== undefined && currentRaw.surface_pressure !== null
              ? Math.round(Number(currentRaw.surface_pressure))
              : null;
            const cloudCover = currentRaw.cloud_cover !== undefined && currentRaw.cloud_cover !== null
              ? Math.round(Number(currentRaw.cloud_cover))
              : null;
            const rainProbability =
              dailyRaw.precipitation_probability_max?.[0] !== undefined
                ? Number(dailyRaw.precipitation_probability_max[0])
                : null;
            const expectedRainfall =
              currentRaw.precipitation !== undefined ? Number(currentRaw.precipitation) : null;
            const weatherCode = currentRaw.weather_code !== undefined ? Number(currentRaw.weather_code) : null;

            const conditionInfo = mapWmoCode(weatherCode, temp);

            const current: WeatherData = {
              temperature: temp,
              feelsLike,
              condition: conditionInfo.condition,
              conditionKey: conditionInfo.conditionKey,
              humidity,
              windSpeed,
              rainProbability,
              expectedRainfall,
              pressure,
              cloudCover,
              precipitation: expectedRainfall,
              weatherCode,
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
            console.log(`[Weather] provider=Open-Meteo status=200 duration=${duration}ms`);
            return { current, forecast, implications, successfulUrl: testUrl };
          }

          console.warn(`[Weather] provider=Open-Meteo status=${res.status} duration=${duration}ms`);
          if (res.status >= 400 && res.status < 500) break;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          console.warn(
            `[Weather] provider=Open-Meteo network_error code=${err.code || err.name || 'NETWORK_ERROR'} duration=${duration}ms`
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
   * Final Weather Service Pipeline:
   * 1. Fresh database cache (max 15–30 minutes)
   * 2. OpenWeatherMap (Primary provider)
   * 3. Open-Meteo (Secondary fallback provider)
   * 4. Valid recent cached data (up to 24h archive, clearly marked stale)
   * 5. Explicit WEATHER_UNAVAILABLE
   */
  async getWeather(lat: number, lon: number): Promise<{
    current: WeatherData;
    forecast: WeatherForecast[];
    implications: FarmingImplication[];
    metadata: {
      dataSource: string;
      provider: 'openweathermap' | 'open-meteo' | 'cache';
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

    // 3. Primary Provider: OpenWeatherMap (if configured)
    if (this.isOpenWeatherConfigured()) {
      const openWeatherData = await this.fetchFromOpenWeather(lat, lon);
      if (openWeatherData) {
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
              JSON.stringify(openWeatherData.current),
              JSON.stringify(openWeatherData.forecast),
              JSON.stringify(openWeatherData.implications),
            ]
          );
        } catch (saveErr) {
          console.warn('[WeatherService] Cache save notice:', saveErr);
        }

        return {
          current: openWeatherData.current,
          forecast: openWeatherData.forecast,
          implications: openWeatherData.implications,
          metadata: {
            dataSource: 'OpenWeatherMap API',
            provider: 'openweathermap',
            apiUrl: this.getOpenWeatherBaseUrl(),
            lastUpdated: new Date().toISOString(),
            isCached: false,
            isStale: false,
          },
        };
      }
    }

    // 4. Secondary Fallback Provider: Open-Meteo API
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
    const error = new Error('Weather data is temporarily unavailable from all meteorological providers.');
    (error as any).code = 'WEATHER_UNAVAILABLE';
    throw error;
  }
}

export const weatherService = new WeatherService();
