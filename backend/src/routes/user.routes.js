import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// User profile management routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.get('/profile', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
