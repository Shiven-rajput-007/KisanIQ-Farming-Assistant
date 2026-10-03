import { Response } from 'express';
import { riskService } from '../services/riskService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getRiskAssessment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';
    const assessment = await riskService.getRiskAssessment(farmerId);
    res.json({ success: true, assessment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
