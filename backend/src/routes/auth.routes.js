import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  authenticate,
  requireCustomer,
  requireProvider,
  requireAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. PUBLIC AUTHENTICATION ENDPOINTS
// ==============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a Customer or Provider
 * @access  Public
 */
router.post('/register', authController.register);
router.post('/register/customer', (req, res, next) => {
  req.body.role = 'customer';
  return authController.register(req, res, next);
});
router.post('/register/provider', (req, res, next) => {
  req.body.role = 'provider';
  return authController.register(req, res, next);
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token/session
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh session token using refresh_token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Log out current session
 * @access  Public (Optional Bearer token)
 */
router.post('/logout', authController.logout);

// ==============================================================================
// 2. PROTECTED AUTHENTICATION ENDPOINTS
// ==============================================================================

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Protected (Requires Bearer JWT token)
 */
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, upload.single('profileImage'), authController.updateProfile);
router.get('/profile', authenticate, authController.getMe);
router.put('/profile', authenticate, upload.single('profileImage'), authController.updateProfile);

// ==============================================================================
// 3. ROLE-BASED ACCESS CONTROL VERIFICATION ENDPOINTS
// ==============================================================================

/**
 * @route   GET /api/auth/role-test/customer
 * @desc    Verify role-based access for customer role
 * @access  Protected (customer only)
 */
router.get('/role-test/customer', authenticate, requireCustomer, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to customer-only endpoint.',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName,
    },
  });
});

/**
 * @route   GET /api/auth/role-test/provider
 * @desc    Verify role-based access for provider role
 * @access  Protected (provider only)
 */
router.get('/role-test/provider', authenticate, requireProvider, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to provider-only endpoint.',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName,
      providerProfile: req.user.providerProfile,
    },
  });
});

/**
 * @route   GET /api/auth/role-test/admin
 * @desc    Verify role-based access for admin role
 * @access  Protected (admin only)
 */
router.get('/role-test/admin', authenticate, requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to admin-only endpoint.',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName,
    },
  });
});

export default router;
