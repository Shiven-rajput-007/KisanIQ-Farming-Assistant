import { Router } from 'express';
import {
  getListings,
  getFarmerListings,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/listingController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public / Buyer browsing
router.get('/', getListings);

// Farmer managing their own listings & incoming orders
router.get('/farmer/me', optionalAuth, getFarmerListings);
router.post('/', optionalAuth, createListing);
router.put('/:id', optionalAuth, updateListing);
router.delete('/:id', optionalAuth, deleteListing);

export default router;
