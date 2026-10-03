import { Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.json({ success: true, notifications: [] });
      return;
    }

    const result = await db.query(
      `SELECT * FROM notifications WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [farmerId]
    );

    const notifications = result.rows.map((n: any) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      titleKey: n.title_key,
      descriptionKey: n.description_key,
      icon: n.icon,
      timestamp: n.created_at,
      read: n.read,
      actionUrl: n.action_url,
    }));

    res.json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    await db.query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND farmer_id = $2`, [id, farmerId]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    await db.query(`UPDATE notifications SET read = TRUE WHERE farmer_id = $1`, [farmerId]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
