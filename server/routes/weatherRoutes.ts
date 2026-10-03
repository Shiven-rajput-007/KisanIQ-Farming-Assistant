import { Router } from 'express';
import { getCurrentWeather } from '../controllers/weatherController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/current', optionalAuth, getCurrentWeather);
router.get('/forecast', optionalAuth, getCurrentWeather);

export default router;
