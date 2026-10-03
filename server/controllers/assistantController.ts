import { Response } from 'express';
import { assistantService } from '../services/assistantService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function askAssistant(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || req.userId || 'guest_user';
    const { query, context } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ success: false, error: 'Query is required' });
      return;
    }

    const response = await assistantService.processQuery(farmerId, query, context);
    res.json({ success: true, ...response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function confirmAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || req.userId || 'guest_user';
    const { actionType, payload } = req.body;

    if (!actionType) {
      res.status(400).json({ success: false, error: 'actionType is required' });
      return;
    }

    const result = await assistantService.executeAction(farmerId, actionType, payload);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getChatHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || req.userId || 'guest_user';
    const messages = await assistantService.getHistory(farmerId);
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
