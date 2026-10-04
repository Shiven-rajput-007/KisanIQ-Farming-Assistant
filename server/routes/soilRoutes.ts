import { Router } from 'express';
import {
  getLaboratories,
  getLabById,
  createTestRequest,
  getFarmerRequests,
  getRequestById,
  updateRequestStatus,
  getLatestReport,
  getReportsHistory,
  getSensorReading,
} from '../controllers/soilController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Lab directory
router.get('/labs', getLaboratories);
router.get('/labs/:id', getLabById);

// Test requests
router.post('/requests', optionalAuth, createTestRequest);
router.get('/requests', optionalAuth, getFarmerRequests);
router.get('/requests/farmer/:farmerId', optionalAuth, getFarmerRequests);
router.get('/requests/:id', optionalAuth, getRequestById);
router.put('/requests/:id/status', optionalAuth, updateRequestStatus);

// Soil reports
router.get('/reports/latest', optionalAuth, getLatestReport);
router.get('/reports/latest/:farmerId', optionalAuth, getLatestReport);
router.get('/reports/history', optionalAuth, getReportsHistory);
router.get('/reports/history/:farmerId', optionalAuth, getReportsHistory);

// Sensor reading (IoT mode - DEMO)
router.get('/sensors/latest/:fieldId', getSensorReading);

export default router;
