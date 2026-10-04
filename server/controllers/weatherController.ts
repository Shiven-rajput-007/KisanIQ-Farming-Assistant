import { Response } from 'express';
import { weatherService } from '../services/weatherService.js';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

async function geocodeLocation(district?: string, state?: string): Promise<{ lat: number; lon: number } | null> {
  const parts = [district?.trim(), state?.trim(), 'India'].filter(Boolean);
  if (parts.length <= 1) return null;
  const q = parts.join(', ');

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'KisanIQ-Farming-Assistant/2.0 (agri-tech@kisaniq.in)',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
    }
  } catch (err: any) {
    console.warn('[WeatherController] Nominatim geocoding notice:', err.message);
  }
  return null;
}

export async function getCurrentWeather(req: AuthRequest, res: Response): Promise<void> {
  try {
    let lat: number | undefined = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    let lon: number | undefined =
      req.query.lon !== undefined
        ? Number(req.query.lon)
        : req.query.lng !== undefined
        ? Number(req.query.lng)
        : undefined;

    let farmerDistrict: string | undefined = typeof req.query.district === 'string' ? req.query.district : undefined;
    let farmerState: string | undefined = typeof req.query.state === 'string' ? req.query.state : undefined;
    let authenticatedFarmerId: string | null = null;

    // If coordinates are missing or NaN in query, attempt to read from authenticated farmer profile
    if (lat === undefined || isNaN(lat) || lon === undefined || isNaN(lon)) {
      const farmerId = req.farmerId || (req.userId ? `frm_${req.userId}` : null);
      if (farmerId) {
        try {
          const farmerRes = await db.query(
            'SELECT id, district, state, latitude, longitude FROM farmers WHERE id = $1 OR user_id = $1',
            [farmerId]
          );
          if (farmerRes.rows.length > 0) {
            const row = farmerRes.rows[0];
            authenticatedFarmerId = row.id;
            const dbLat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : NaN;
            const dbLon = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : NaN;
            if (!isNaN(dbLat) && !isNaN(dbLon)) {
              lat = dbLat;
              lon = dbLon;
            }
            if (!farmerDistrict && row.district) farmerDistrict = row.district;
            if (!farmerState && row.state) farmerState = row.state;
          }
        } catch (dbErr) {
          console.warn('[WeatherController] Database farmer lookup note:', dbErr);
        }
      }
    }

    // Geocoding fallback if textual district/state exists but coordinates are absent
    if ((lat === undefined || isNaN(lat) || lon === undefined || isNaN(lon)) && (farmerDistrict || farmerState)) {
      const geocoded = await geocodeLocation(farmerDistrict, farmerState);
      if (geocoded) {
        lat = geocoded.lat;
        lon = geocoded.lon;

        // Persist geocoded coordinates to farmer profile if authenticated
        if (authenticatedFarmerId) {
          try {
            await db.query(
              'UPDATE farmers SET latitude = $1, longitude = $2 WHERE id = $3',
              [lat, lon, authenticatedFarmerId]
            );
          } catch (updateErr) {
            console.warn('[WeatherController] Could not save geocoded coordinates:', updateErr);
          }
        }
      }
    }

    // Strict validation: coordinates must be genuine valid numbers in geographical range
    if (
      lat === undefined ||
      isNaN(lat) ||
      lon === undefined ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      res.status(400).json({
        success: false,
        code: 'LOCATION_REQUIRED',
        error: 'Valid farm latitude and longitude coordinates are required.',
        message: 'Farm location must be configured or GPS coordinates provided to retrieve real weather data.',
      });
      return;
    }

    const data = await weatherService.getWeather(lat, lon);
    res.json({
      success: true,
      requestedCoordinates: { lat, lon },
      ...data,
    });
  } catch (error: any) {
    if (error.code === 'LOCATION_REQUIRED') {
      res.status(400).json({
        success: false,
        code: 'LOCATION_REQUIRED',
        error: error.message,
      });
      return;
    }
    if (error.code === 'WEATHER_UNAVAILABLE') {
      res.status(503).json({
        success: false,
        code: 'WEATHER_UNAVAILABLE',
        error: 'Weather data is temporarily unavailable.',
        message: error.message || 'Meteorological feeds are temporarily unreachable and no cached forecast is available for these coordinates.',
      });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
}
