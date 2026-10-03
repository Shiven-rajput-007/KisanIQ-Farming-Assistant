import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { soilService, SoilRequestStatus } from '../services/soilService.js';
import { db } from '../db/index.js';

export async function getLaboratories(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const labs = await soilService.getLaboratories();
    res.json({ success: true, laboratories: labs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLabById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const lab = await soilService.getLabById(id);
    if (!lab) {
      res.status(404).json({ success: false, error: 'Laboratory not found' });
      return;
    }
    res.json({ success: true, laboratory: lab });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createTestRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (!farmerId) {
      res.status(401).json({ success: false, error: 'Authentication required to book a soil test.' });
      return;
    }

    const { farmId, fieldId, cropName, labId, sampleCollectionDate, testTypes, testingMode, trackingNotes } = req.body;

    if (!cropName || !labId) {
      res.status(400).json({ success: false, error: 'cropName and labId are required' });
      return;
    }

    const request = await soilService.createRequest({
      farmerId,
      farmId,
      fieldId,
      cropName,
      labId,
      sampleCollectionDate: sampleCollectionDate || new Date().toISOString(),
      testTypes: testTypes || ['pH', 'EC', 'OC', 'N', 'P', 'K'],
      testingMode: testingMode || 'LAB_TEST',
      trackingNotes: trackingNotes || 'Soil sample pickup requested by farmer.',
    });

    res.status(201).json({
      success: true,
      message: 'Soil test request created successfully',
      request,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFarmerRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    // Allow looking up by route param if admin or self
    if (req.params.farmerId && req.params.farmerId === farmerId) {
      farmerId = req.params.farmerId;
    }

    if (!farmerId) {
      res.json({ success: true, requests: [] });
      return;
    }

    const requests = await soilService.getFarmerRequests(farmerId);
    res.json({ success: true, requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRequestById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    const request = await soilService.getRequestById(id);
    if (!request) {
      res.status(404).json({ success: false, error: 'Soil test request not found.' });
      return;
    }

    // Ownership verification
    if (farmerId && request.farmerId !== farmerId) {
      res.status(403).json({ success: false, error: 'Access denied: You do not own this soil test request.' });
      return;
    }

    res.json({ success: true, request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateRequestStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStages: SoilRequestStatus[] = [
      'REQUESTED',
      'SAMPLE_COLLECTED',
      'IN_TRANSIT',
      'RECEIVED_AT_LAB',
      'TESTING_IN_PROGRESS',
      'REPORT_GENERATED',
      'DELIVERED',
    ];

    if (!status || !validStages.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Allowed 7 stages are: ${validStages.join(', ')}`,
      });
      return;
    }

    const updated = await soilService.updateStatus(id, status, notes);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Soil test request not found' });
      return;
    }

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      request: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLatestReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (req.params.farmerId && req.params.farmerId === farmerId) {
      farmerId = req.params.farmerId;
    }

    if (!farmerId) {
      res.json({ success: true, report: null });
      return;
    }

    const report = await soilService.getLatestReport(farmerId);
    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getReportsHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    let farmerId = req.farmerId;
    if (!farmerId && req.userId) {
      const fRes = await db.query('SELECT id FROM farmers WHERE user_id = $1', [req.userId]);
      farmerId = fRes.rows[0]?.id;
    }

    if (req.params.farmerId && req.params.farmerId === farmerId) {
      farmerId = req.params.farmerId;
    }

    if (!farmerId) {
      res.json({ success: true, history: [] });
      return;
    }

    const history = await soilService.getReportsHistory(farmerId);
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getSensorReading(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fieldId = req.params.fieldId;
    if (!fieldId) {
      res.status(400).json({ success: false, error: 'fieldId is required' });
      return;
    }
    const sensor = await soilService.getSensorReading(fieldId);
    res.json({ success: true, sensor, reading: sensor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
