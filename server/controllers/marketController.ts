import { Response } from 'express';
import { marketService } from '../services/marketService.js';
import { mandiService } from '../services/mandiService.js';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

/**
 * GET /api/market/prices
 * Real Agmarknet prices with filtering & pagination
 */
export async function getMarketPrices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      state,
      district,
      market,
      commodity,
      variety,
      dateFrom,
      dateTo,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await mandiService.getPrices({
      state: state ? String(state) : undefined,
      district: district ? String(district) : undefined,
      market: market ? String(market) : undefined,
      commodity: commodity ? String(commodity) : undefined,
      variety: variety ? String(variety) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      page: parseInt(String(page), 10) || 1,
      limit: parseInt(String(limit), 10) || 20,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/market/mandis
 * List distinct verified mandis and markets
 */
export async function getMandis(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { state, district } = req.query;
    const where: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (state && String(state) !== 'all') {
      where.push(`state ILIKE $${pIdx}`);
      params.push(`%${String(state).trim()}%`);
      pIdx++;
    }
    if (district && String(district) !== 'all') {
      where.push(`district ILIKE $${pIdx}`);
      params.push(`%${String(district).trim()}%`);
      pIdx++;
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const resDb = await db.query(
      `SELECT DISTINCT COALESCE(market_name, name) as name, district, state
       FROM (
         SELECT market_name, district, state FROM market_prices WHERE market_name IS NOT NULL
         UNION
         SELECT name as market_name, district, state FROM markets
       ) combined
       ${whereSql}
       ORDER BY state, district, name ASC`,
      params
    );

    res.json({
      success: true,
      mandis: resDb.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/market/decision
 * Transparent Net Return Calculation & Comparison
 */
export async function getMarketDecision(req: AuthRequest, res: Response): Promise<void> {
  try {
    const modalPrice = Number(req.query.modalPrice);
    const quantity = Number(req.query.quantity) || 100;
    const distanceKm = req.query.distance ? Number(req.query.distance) : undefined;
    const commission = req.query.commission ? Number(req.query.commission) : undefined;
    const loading = req.query.loading ? Number(req.query.loading) : undefined;
    const wastage = req.query.wastage ? Number(req.query.wastage) : undefined;
    const manualTransport = req.query.manualTransport ? Number(req.query.manualTransport) : undefined;

    if (!modalPrice || isNaN(modalPrice) || modalPrice <= 0) {
      res.status(400).json({
        success: false,
        error: 'A valid numeric modalPrice in ₹/quintal is required.',
      });
      return;
    }

    const netReturnCalc = mandiService.calculateNetReturn({
      modalPrice,
      quantityQuintals: quantity,
      distanceKm,
      commissionPercent: commission,
      loadingPerQuintal: loading,
      wastagePercent: wastage,
      manualTransportCost: manualTransport,
    });

    res.json({
      success: true,
      decision: netReturnCalc,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/market/comparison
 * Full comparative market options ranked by net return
 */
export async function getMarketComparison(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || (req.userId ? `frm_${req.userId}` : undefined);
    const cropName = (req.query.crop as string) || 'Wheat';
    const quantity = Number(req.query.quantity) || 100;
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lon = (req.query.lon || req.query.lng) ? Number(req.query.lon || req.query.lng) : undefined;
    const district = req.query.district ? String(req.query.district) : undefined;
    const state = req.query.state ? String(req.query.state) : undefined;

    const data = await marketService.getMarketComparison(
      farmerId,
      cropName,
      quantity,
      lat,
      lon,
      district,
      state
    );
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/market/sync-status
 * Observability endpoint for synchronization history
 */
export async function getSyncStatus(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = await mandiService.getSyncStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/market/sync
 * Protected endpoint for triggering CEDA Agmarknet ingestion
 */
export async function triggerMandiSync(req: AuthRequest, res: Response): Promise<void> {
  try {
    const syncSecret = process.env.MANDI_SYNC_SECRET;
    const providedSecret = req.headers['x-sync-secret'] || req.query.secret;

    // Strict security check
    if (!syncSecret || syncSecret.trim() === '' || providedSecret !== syncSecret) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid x-sync-secret header or secret query parameter is required to trigger mandi sync.',
      });
      return;
    }

    const { state, district, commodity, fromDate, toDate, limit = 100 } = req.body || {};
    const result = await mandiService.syncFromCedaApi({
      state,
      district,
      commodity,
      fromDate,
      toDate,
      limit: Number(limit) || 100,
    });

    if (result.status === 'failed') {
      res.status(502).json({
        success: false,
        message: 'Mandi sync failed',
        result,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Mandi prices synchronized successfully from CEDA Agmarknet',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/market/orders
 */
export async function createSellOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || (req.userId ? `frm_${req.userId}` : undefined);
    if (!farmerId) {
      res.status(401).json({ success: false, error: 'Authentication required to create a sell order.' });
      return;
    }

    const { marketId, cropName = 'Wheat', quantity, agreedPrice } = req.body;

    if (!marketId || !quantity || !agreedPrice) {
      res.status(400).json({ success: false, error: 'marketId, quantity, and agreedPrice are required' });
      return;
    }

    const order = await marketService.createOrder(
      farmerId,
      marketId,
      cropName,
      Number(quantity),
      Number(agreedPrice)
    );

    res.status(201).json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
