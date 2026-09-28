import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import {
  authenticate,
  requireCustomer,
  requireProvider,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. CUSTOMER BOOKING MANAGEMENT
// ==============================================================================

/**
 * @route   POST /api/bookings
 * @desc    Create an individual booking request for an event & provider
 * @access  Protected (Customer only)
 */
router.post('/', authenticate, requireCustomer, bookingController.createBooking);

/**
 * @route   GET /api/bookings/my
 * @desc    View all bookings belonging to the authenticated customer
 * @access  Protected (Customer only)
 */
router.get('/my', authenticate, requireCustomer, bookingController.getCustomerBookings);
router.get('/', authenticate, requireCustomer, bookingController.getCustomerBookings);

// ==============================================================================
// 2. PROVIDER BOOKING MANAGEMENT
// ==============================================================================

/**
 * @route   GET /api/bookings/provider
 * @desc    View all incoming booking requests for the authenticated provider
 * @access  Protected (Provider only)
 */
router.get('/provider', authenticate, requireProvider, bookingController.getProviderBookings);

// ==============================================================================
// 3. BOOKING DETAILS & STATUS TRANSITIONS
// ==============================================================================

/**
 * @route   GET /api/bookings/:id
 * @desc    View single booking details (ownership enforced: customer or provider)
 * @access  Protected (Customer, Provider, or Admin)
 */
router.get('/:id', authenticate, bookingController.getBookingById);

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Update booking status (enforces state machine & ownership)
 * @access  Protected (Provider for ACCEPT/REJECT/COMPLETE; Customer/Provider for CANCEL)
 */
router.patch('/:id/status', authenticate, bookingController.updateBookingStatus);
router.put('/:id/status', authenticate, bookingController.updateBookingStatus);

export default router;
