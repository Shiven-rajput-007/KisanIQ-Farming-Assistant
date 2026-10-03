import { Router } from 'express';
import { askAssistant, confirmAction, getChatHistory } from '../controllers/assistantController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/chat', optionalAuth, askAssistant);
router.post('/action/confirm', optionalAuth, confirmAction);
router.get('/history', optionalAuth, getChatHistory);

export default router;
