import { Router } from 'express';
import { getRiskAssessment } from '../controllers/riskController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/assessment', optionalAuth, getRiskAssessment);

export default router;
