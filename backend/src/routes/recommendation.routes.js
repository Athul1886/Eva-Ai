import { Router } from 'express';
import * as recommendationController from '../controllers/recommendation.controller.js';
import { authenticateOptional } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/recommendations
router.get('/', authenticateOptional, recommendationController.getRecommendations);

// POST /api/recommendations
router.post('/', authenticateOptional, recommendationController.getRecommendations);

export default router;
