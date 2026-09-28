import { Router } from 'express';
import * as providerController from '../controllers/provider.controller.js';
import * as portfolioController from '../controllers/portfolio.controller.js';
import * as availabilityController from '../controllers/availability.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  authenticate,
  authenticateOptional,
  requireProvider,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. PUBLIC CATEGORY ENDPOINT
// ==============================================================================

/**
 * @route   GET /api/providers/categories
 * @desc    List all supported provider categories
 * @access  Public
 */
router.get('/categories', providerController.getCategories);

// ==============================================================================
// 2. PROVIDER PROFILE MANAGEMENT (PROVIDER ONLY)
// ==============================================================================

/**
 * @route   GET /api/providers/profile
 * @desc    View authenticated provider's own profile
 * @access  Protected (Provider only)
 */
router.get('/profile', authenticate, requireProvider, providerController.getMyProfile);
router.get('/me', authenticate, requireProvider, providerController.getMyProfile);

/**
 * @route   PUT /api/providers/profile
 * @desc    Update authenticated provider's own profile
 * @access  Protected (Provider only)
 */
router.put('/profile', authenticate, requireProvider, upload.single('profileImage'), providerController.updateMyProfile);
router.put('/me', authenticate, requireProvider, upload.single('profileImage'), providerController.updateMyProfile);

// ==============================================================================
// 3. PROVIDER PORTFOLIO MANAGEMENT (PROVIDER ONLY)
// ==============================================================================

/**
 * @route   POST /api/providers/portfolio
 * @desc    Add a new portfolio item
 * @access  Protected (Provider only)
 */
router.post('/portfolio', authenticate, requireProvider, upload.single('portfolioImage'), portfolioController.createPortfolioItem);

/**
 * @route   GET /api/providers/portfolio
 * @desc    View all portfolio items for authenticated provider
 * @access  Protected (Provider only)
 */
router.get('/portfolio', authenticate, requireProvider, portfolioController.getMyPortfolio);

/**
 * @route   GET /api/providers/portfolio/:id
 * @desc    View a specific portfolio item
 * @access  Protected (Provider only)
 */
router.get('/portfolio/:id', authenticate, requireProvider, portfolioController.getPortfolioItem);

/**
 * @route   PUT /api/providers/portfolio/:id
 * @desc    Update a portfolio item (ownership enforced)
 * @access  Protected (Provider only)
 */
router.put('/portfolio/:id', authenticate, requireProvider, upload.single('portfolioImage'), portfolioController.updatePortfolioItem);
router.patch('/portfolio/:id', authenticate, requireProvider, upload.single('portfolioImage'), portfolioController.updatePortfolioItem);

/**
 * @route   DELETE /api/providers/portfolio/:id
 * @desc    Delete a portfolio item (ownership enforced)
 * @access  Protected (Provider only)
 */
router.delete('/portfolio/:id', authenticate, requireProvider, portfolioController.deletePortfolioItem);

// ==============================================================================
// 4. PROVIDER AVAILABILITY MANAGEMENT (PROVIDER ONLY)
// ==============================================================================

/**
 * @route   POST /api/providers/availability
 * @desc    Add a new availability slot
 * @access  Protected (Provider only)
 */
router.post('/availability', authenticate, requireProvider, availabilityController.createAvailability);

/**
 * @route   GET /api/providers/availability
 * @desc    View availability slots for authenticated provider
 * @access  Protected (Provider only)
 */
router.get('/availability', authenticate, requireProvider, availabilityController.getMyAvailability);

/**
 * @route   GET /api/providers/availability/:id
 * @desc    View a specific availability slot
 * @access  Protected (Provider only)
 */
router.get('/availability/:id', authenticate, requireProvider, availabilityController.getAvailabilityItem);

/**
 * @route   PUT /api/providers/availability/:id
/**
 * @route   PUT /api/providers/availability/sync
 * @desc    Sync provider blackout dates from calendar (Whole-day adapter)
 * @access  Protected (Provider only)
 */
router.put('/availability/sync', authenticate, requireProvider, availabilityController.syncUnavailableDates);

/**
 * @route   PUT /api/providers/availability/:id
 * @desc    Update an availability slot (ownership enforced)
 * @access  Protected (Provider only)
 */
router.put('/availability/:id', authenticate, requireProvider, availabilityController.updateAvailability);

/**
 * @route   DELETE /api/providers/availability/:id
 * @desc    Delete an availability slot (ownership enforced)
 * @access  Protected (Provider only)
 */
router.delete('/availability/:id', authenticate, requireProvider, availabilityController.deleteAvailability);

// ==============================================================================
// 5. PUBLIC PROVIDER BROWSING & DETAILS
// ==============================================================================

/**
 * @route   GET /api/providers
 * @desc    Public provider browsing with filters (APPROVED only)
 * @access  Public
 */
router.get('/', providerController.getPublicProviders);

/**
 * @route   GET /api/providers/:id
 * @desc    Public provider details (APPROVED only, unless owner/admin)
 * @access  Public (Optional Bearer token for owner/admin access)
 */
router.get('/:id', authenticateOptional, providerController.getPublicProviderDetails);

/**
 * @route   GET /api/providers/:id/portfolio
 * @desc    Public portfolio listing for an approved provider
 * @access  Public
 */
router.get('/:id/portfolio', providerController.getPublicProviderPortfolio);

/**
 * @route   GET /api/providers/:id/availability
 * @desc    Public availability calendar for an approved provider
 * @access  Public
 */
router.get('/:id/availability', providerController.getPublicProviderAvailability);

/**
 * @route   GET /api/providers/:id/unavailable-dates
 * @desc    Public list of blackout date strings (YYYY-MM-DD) for whole-day checks
 * @access  Public
 */
router.get('/:id/unavailable-dates', availabilityController.getUnavailableDates);

export default router;
