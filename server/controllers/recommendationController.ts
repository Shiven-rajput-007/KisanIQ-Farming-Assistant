import { Response } from 'express';
import { decisionEngine } from '../services/decisionEngine.js';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

export async function getDailyRecommendations(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      // Guest or unauthenticated user: generate baseline location guidance
      farmerId = 'guest';
    }

    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lon = (req.query.lon || req.query.lng) ? Number(req.query.lon || req.query.lng) : undefined;

    const recommendations = await decisionEngine.generateRecommendations(farmerId, lat, lon);
    res.json({ success: true, recommendations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function completeAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const success = await decisionEngine.markActionCompleted(id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }
    res.json({ success: true, message: 'Action marked as completed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
