import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. CUSTOMER LIST (ADMIN ONLY)
// ==============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    List all customers (excluding providers and admins)
 * @access  Protected (Admin only)
 */
router.get('/users', authenticate, requireAdmin, adminController.getCustomers);

// ==============================================================================
// 2. ADMIN DASHBOARD STATS (ADMIN ONLY)
// ==============================================================================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get aggregated counts for customers, providers, and approval statuses
 * @access  Protected (Admin only)
 */
router.get('/dashboard/stats', authenticate, requireAdmin, adminController.getDashboardStats);

// ==============================================================================
// 3. PROVIDER APPROVE / REJECT / STATUS (ADMIN ONLY)
// ==============================================================================

/**
 * @route   PATCH /api/admin/providers/:id/status
 * @desc    Update provider approval status (PENDING, APPROVED, REJECTED, SUSPENDED)
 * @access  Protected (Admin only)
 */
router.patch('/providers/:id/status', authenticate, requireAdmin, adminController.updateProviderStatus);

// ==============================================================================
// EXISTING ADMIN PROVIDER MANAGEMENT ROUTES (PRESERVED)
// ==============================================================================

/**
 * @route   GET /api/admin/providers
 * @desc    List all providers (supports ?status=pending|approved|rejected|suspended)
 * @access  Protected (Admin only)
 */
router.get('/providers', authenticate, requireAdmin, adminController.listProviders);

/**
 * @route   GET /api/admin/providers/pending
 * @desc    List all pending provider requests
 * @access  Protected (Admin only)
 */
router.get('/providers/pending', authenticate, requireAdmin, (req, res, next) => {
  req.query.status = 'pending';
  return adminController.listProviders(req, res, next);
});

/**
 * @route   GET /api/admin/pending-providers
 * @desc    Alias to list all pending provider requests
 * @access  Protected (Admin only)
 */
router.get('/pending-providers', authenticate, requireAdmin, (req, res, next) => {
  req.query.status = 'pending';
  return adminController.listProviders(req, res, next);
});

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
