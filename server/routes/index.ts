import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import authRoutes from './authRoutes.js';
import farmerRoutes from './farmerRoutes.js';
import cropRoutes from './cropRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import marketRoutes from './marketRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import riskRoutes from './riskRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import orderRoutes from './orderRoutes.js';
import listingRoutes from './listingRoutes.js';
import marketplaceRoutes from './marketplaceRoutes.js';
import soilRoutes from './soilRoutes.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Health check
router.get('/health', async (_req, res) => {
  try {
    const dbTest = await db.query('SELECT 1 as alive');
    res.json({
      success: true,
      message: 'KisanIQ backend is running',
      status: 'ok',
      service: 'KisanIQ Backend API',
      database: db.type,
      databaseConnected: dbTest.rows?.[0]?.alive === 1,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      service: 'KisanIQ Backend API',
      database: db.type,
      error: err.message,
    });
  }
});

// Direct zip download endpoint
router.get('/download', (_req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'KisanIQ-project.zip'),
    path.resolve(process.cwd(), '../KisanIQ-project.zip'),
    'D:\\antigravitry\\KisanIQ-project.zip',
  ];
  for (const zipPath of possiblePaths) {
    if (fs.existsSync(zipPath)) {
      return res.download(zipPath, 'KisanIQ-project.zip');
    }
  }
  res.status(404).json({ error: 'Zip file not found' });
});

// Dashboard briefing
router.get('/dashboard', optionalAuth, getDashboard);

// Sub-routers
router.use('/auth', authRoutes);
router.use('/farmer', farmerRoutes);
router.use('/crops', cropRoutes);
router.use('/weather', weatherRoutes);
router.use('/market', marketRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/risk', riskRoutes);
router.use('/assistant', assistantRoutes);
router.use('/notifications', notificationRoutes);
router.use('/orders', orderRoutes);
router.use('/listings', listingRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/soil', soilRoutes);

export default router;
