import { Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getCrops(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.json({
        success: true,
        crops: [],
        stages: [],
        actions: [],
      });
      return;
    }

    const cropsRes = await db.query(
      `SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC`,
      [farmerId]
    );

    const crops = cropsRes.rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      nameKey: c.name_key,
      variety: c.variety,
      fieldId: c.field_id,
      sowingDate: c.sowing_date,
      expectedHarvestDate: c.expected_harvest_date,
      currentStage: c.current_stage,
      daysOld: c.days_old,
      health: {
        overall: c.health_overall,
        weatherRisk: c.health_weather_risk,
        diseaseRisk: c.health_disease_risk,
        waterStatus: c.health_water_status,
      },
      area: Number(c.area),
      expectedYield: Number(c.expected_yield),
      icon: c.icon || '🌾',
    }));

    let stages: any[] = [];
    let actions: any[] = [];

    if (crops.length > 0 && crops[0]?.id) {
      // Stages for primary crop
      const stagesRes = await db.query(
        `SELECT * FROM crop_stages WHERE crop_id = $1 ORDER BY sequence_order ASC`,
        [crops[0].id]
      );

      stages = stagesRes.rows.map((s: any) => ({
        stage: s.stage,
        nameKey: s.name_key,
        completed: s.completed,
        active: s.active,
      }));

      // Pending crop actions
      const actionsRes = await db.query(
        `SELECT * FROM crop_actions WHERE crop_id = $1 ORDER BY priority DESC`,
        [crops[0].id]
      );

      actions = actionsRes.rows.map((a: any) => ({
        id: a.id,
        type: a.action_type,
        titleKey: a.title_key,
        descriptionKey: a.description_key,
        priority: a.priority,
        icon: a.icon,
        completed: a.completed,
      }));
    }

    res.json({
      success: true,
      crops,
      stages,
      actions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getCropById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    // Ownership check: Farmer A cannot view Farmer B's crop
    const cropRes = await db.query(
      `SELECT * FROM crops WHERE id = $1 AND ($2::text IS NULL OR farmer_id = $2)`,
      [id, farmerId || null]
    );

    if (cropRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Crop record not found or access denied.' });
      return;
    }

    const c = cropRes.rows[0];
    const stagesRes = await db.query(
      `SELECT * FROM crop_stages WHERE crop_id = $1 ORDER BY sequence_order ASC`,
      [id]
    );

    const stages = stagesRes.rows.map((s: any) => ({
      stage: s.stage,
      nameKey: s.name_key,
      completed: s.completed,
      active: s.active,
    }));

    res.json({
      success: true,
      crop: {
        id: c.id,
        name: c.name,
        nameKey: c.name_key,
        variety: c.variety,
        sowingDate: c.sowing_date,
        expectedHarvestDate: c.expected_harvest_date,
        currentStage: c.current_stage,
        daysOld: c.days_old,
        health: {
          overall: c.health_overall,
          weatherRisk: c.health_weather_risk,
          diseaseRisk: c.health_disease_risk,
          waterStatus: c.health_water_status,
        },
        area: Number(c.area),
        expectedYield: Number(c.expected_yield),
        stages,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createCrop(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.status(401).json({ success: false, error: 'Authentication required. Please log in as a farmer to register crops.' });
      return;
    }

    const { name, variety, sowingDate, expectedHarvestDate, area, currentStage } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Crop name is required.' });
      return;
    }

    const cropId = `crop_${Date.now()}`;
    const nameKey = name.toLowerCase().replace(/\s+/g, '_');

    await db.query(
      `INSERT INTO crops (
        id, farmer_id, name, name_key, variety, sowing_date, expected_harvest_date,
        current_stage, days_old, area, health_overall, icon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        cropId,
        farmerId,
        name.trim(),
        nameKey,
        variety || 'Standard',
        sowingDate || new Date().toISOString().split('T')[0],
        expectedHarvestDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        currentStage || 'sowing',
        1,
        Number(area) || 5.0,
        'low',
        nameKey.includes('rice') ? '🌾' : nameKey.includes('mustard') ? '🌻' : '🌾',
      ]
    );

    res.status(201).json({ success: true, cropId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
