import { Router } from 'express';
import { getCrops, getCropById, createCrop } from '../controllers/cropController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getCrops);
router.get('/:id', optionalAuth, getCropById);
router.post('/', optionalAuth, createCrop);

export default router;
