import { Router } from 'express';
import { getFarmerProfile, updateFarmerProfile, updateFarmerLocation, saveOnboarding } from '../controllers/farmerController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/profile', optionalAuth, getFarmerProfile);
router.put('/profile', optionalAuth, updateFarmerProfile);
router.put('/location', optionalAuth, updateFarmerLocation);
router.post('/onboarding', optionalAuth, saveOnboarding);

export default router;
