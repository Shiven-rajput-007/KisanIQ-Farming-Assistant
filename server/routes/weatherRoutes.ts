import { Router } from 'express';
import { getCurrentWeather, getWeatherStatus } from '../controllers/weatherController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/status', getWeatherStatus);
router.get('/current', optionalAuth, getCurrentWeather);
router.get('/forecast', optionalAuth, getCurrentWeather);

export default router;
