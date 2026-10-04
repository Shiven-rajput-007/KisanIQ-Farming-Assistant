import { Response } from 'express';
import { riskService } from '../services/riskService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getRiskAssessment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const farmerId = req.farmerId;
    const assessment = await riskService.getRiskAssessment(farmerId, lat, lon);
    res.json({ success: true, assessment });
  } catch (error: any) {
    if (error.code === 'LOCATION_REQUIRED') {
      res.status(400).json({
        success: false,
        code: 'LOCATION_REQUIRED',
        message: 'Farm location is required to calculate real risk assessment.',
      });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
}
