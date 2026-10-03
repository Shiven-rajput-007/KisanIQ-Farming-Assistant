import { Response } from 'express';
import { weatherService } from '../services/weatherService.js';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

export async function getCurrentWeather(req: AuthRequest, res: Response): Promise<void> {
  try {
    let lat: number | undefined = req.query.lat ? Number(req.query.lat) : undefined;
    let lon: number | undefined = (req.query.lon || req.query.lng) ? Number(req.query.lon || req.query.lng) : undefined;

    if (lat === undefined || isNaN(lat) || lon === undefined || isNaN(lon)) {
      const farmerId = req.farmerId || (req.userId ? `frm_${req.userId}` : null);
      if (farmerId) {
        const farmerRes = await db.query('SELECT latitude, longitude FROM farmers WHERE id = $1 OR user_id = $1', [farmerId]);
        if (farmerRes.rows.length > 0) {
          lat = Number(farmerRes.rows[0].latitude) || 26.2183;
          lon = Number(farmerRes.rows[0].longitude) || 78.1828;
        }
      }
    }

    if (lat === undefined || isNaN(lat)) lat = 26.2183;
    if (lon === undefined || isNaN(lon)) lon = 78.1828;

    const data = await weatherService.getWeather(lat, lon);
    res.json({
      success: true,
      requestedCoordinates: { lat, lon },
      ...data,
    });
  } catch (error: any) {
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
