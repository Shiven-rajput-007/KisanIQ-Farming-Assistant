import { Router } from 'express';
import {
  placeMarketplaceOrder,
  getBuyerOrders,
  updateMarketplaceOrderStatus,
  getBuyerProfile,
} from '../controllers/marketplaceController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/orders', optionalAuth, placeMarketplaceOrder);
router.get('/orders/buyer', optionalAuth, getBuyerOrders);
router.put('/orders/:id/status', optionalAuth, updateMarketplaceOrderStatus);
router.get('/profile', optionalAuth, getBuyerProfile);

export default router;
