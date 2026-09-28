import { Router } from 'express';
import * as serviceController from '../controllers/service.controller.js';
import {
  authenticate,
  authenticateOptional,
  requireProvider,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. PROVIDER SERVICE MANAGEMENT
// ==============================================================================

/**
 * @route   POST /api/services
 * @desc    Create a new service
 * @access  Protected (Provider only)
 */
router.post('/', authenticate, requireProvider, serviceController.createService);

/**
 * @route   GET /api/services/my
 * @desc    View authenticated provider's own services
 * @access  Protected (Provider only)
 */
router.get('/my', authenticate, requireProvider, serviceController.getMyServices);

/**
 * @route   GET /api/services/:id
 * @desc    View service details
 * @access  Public / Authenticated
 */
router.get('/:id', authenticateOptional, serviceController.getServiceById);

/**
 * @route   PUT /api/services/:id
 * @desc    Update service (ownership enforced)
 * @access  Protected (Provider only)
 */
router.put('/:id', authenticate, requireProvider, serviceController.updateService);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service (ownership enforced)
 * @access  Protected (Provider only)
 */
router.delete('/:id', authenticate, requireProvider, serviceController.deleteService);

export default router;
