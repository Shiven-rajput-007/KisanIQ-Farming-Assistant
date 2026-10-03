import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getNotifications);
router.put('/:id/read', optionalAuth, markAsRead);
router.put('/read-all', optionalAuth, markAllAsRead);

export default router;
