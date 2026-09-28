import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// ADMIN PROVIDER MANAGEMENT ROUTES (ADMIN ONLY)
// ==============================================================================

/**
 * @route   GET /api/admin/providers
 * @desc    List all providers (supports ?status=pending|approved|rejected|suspended)
 * @access  Protected (Admin only)
 */
router.get('/providers', authenticate, requireAdmin, adminController.listProviders);

/**
 * @route   GET /api/admin/providers/:id
 * @desc    Get detailed provider information for admin review
 * @access  Protected (Admin only)
 */
router.get('/providers/:id', authenticate, requireAdmin, adminController.getProviderDetails);

/**
 * @route   POST /api/admin/providers/:id/approve
 * @desc    Approve a provider profile
 * @access  Protected (Admin only)
 */
router.post('/providers/:id/approve', authenticate, requireAdmin, adminController.approveProvider);

/**
 * @route   POST /api/admin/providers/:id/reject
 * @desc    Reject a provider profile
 * @access  Protected (Admin only)
 */
router.post('/providers/:id/reject', authenticate, requireAdmin, adminController.rejectProvider);

/**
 * @route   POST /api/admin/providers/:id/suspend
 * @desc    Suspend an approved provider profile
 * @access  Protected (Admin only)
 */
router.post('/providers/:id/suspend', authenticate, requireAdmin, adminController.suspendProvider);

export default router;
