import { Router } from 'express';
import { getOrders, updateShipmentStatus } from '../controllers/orderController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getOrders);
router.put('/shipments/:id/status', optionalAuth, updateShipmentStatus);

export default router;
