import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/ai/chat
// Customer-only event planning AI chatbot assistant
router.post('/chat', authenticate, authorizeRoles('customer'), aiController.chat);

export default router;
