import { Router } from 'express';
import {
  getMarketPrices,
  getMandis,
  getMarketDecision,
  getMarketComparison,
  getSyncStatus,
  triggerMandiSync,
  createSellOrder,
  getMarketDiagnostics,
} from '../controllers/marketController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Official Agmarknet verified prices
router.get('/prices', optionalAuth, getMarketPrices);

// Safe live CEDA diagnostics probe
router.get('/diagnostics', optionalAuth, getMarketDiagnostics);

// List of physical APMC mandis
router.get('/mandis', optionalAuth, getMandis);

// Transparent Net Return Calculator
router.get('/decision', optionalAuth, getMarketDecision);

// Full comparative ranking
router.get('/comparison', optionalAuth, getMarketComparison);

// Ingestion observability
router.get('/sync-status', optionalAuth, getSyncStatus);

// Protected trigger for daily sync
router.post('/sync', triggerMandiSync);

// Orders
router.post('/orders', optionalAuth, createSellOrder);

export default router;
