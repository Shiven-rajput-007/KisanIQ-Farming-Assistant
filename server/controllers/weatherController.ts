import { Response } from 'express';
import { weatherService } from '../services/weatherService.js';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

export async function getCurrentWeather(req: AuthRequest, res: Response): Promise<void> {
  try {
    let lat: number | undefined = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    let lon: number | undefined =
      req.query.lon !== undefined
        ? Number(req.query.lon)
        : req.query.lng !== undefined
        ? Number(req.query.lng)
        : undefined;

    // If coordinates are missing or NaN in query, attempt to read from authenticated farmer profile
    if (lat === undefined || isNaN(lat) || lon === undefined || isNaN(lon)) {
      const farmerId = req.farmerId || (req.userId ? `frm_${req.userId}` : null);
      if (farmerId) {
        try {
          const farmerRes = await db.query(
            'SELECT latitude, longitude FROM farmers WHERE id = $1 OR user_id = $1',
            [farmerId]
          );
          if (farmerRes.rows.length > 0) {
            const row = farmerRes.rows[0];
            const dbLat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : NaN;
            const dbLon = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : NaN;
            if (!isNaN(dbLat) && !isNaN(dbLon)) {
              lat = dbLat;
              lon = dbLon;
            }
          }
        } catch (dbErr) {
          console.warn('[WeatherController] Database farmer lookup note:', dbErr);
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
        message: 'Open-Meteo meteorological feed is temporarily unreachable and no cached forecast is available for these coordinates.',
      });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
}
