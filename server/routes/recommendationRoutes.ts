import { Router } from 'express';
import { getDailyRecommendations, completeAction } from '../controllers/recommendationController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/daily', optionalAuth, getDailyRecommendations);
router.post('/:id/complete', optionalAuth, completeAction);

export default router;
