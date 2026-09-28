import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import {
  authenticate,
  requireCustomer,
} from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// 1. CUSTOMER EVENT MANAGEMENT ROUTES
// ==============================================================================

/**
 * @route   POST /api/events
 * @desc    Create a new event for the authenticated customer
 * @access  Protected (Customer only)
 */
router.post('/', authenticate, requireCustomer, eventController.createEvent);

/**
 * @route   GET /api/events
 * @desc    View all events belonging to the authenticated customer
 * @access  Protected (Customer only)
 */
router.get('/', authenticate, requireCustomer, eventController.getMyEvents);
router.get('/my', authenticate, requireCustomer, eventController.getMyEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get detailed event by ID with selected services (ownership enforced)
 * @access  Protected (Owner or Admin)
 */
router.get('/:id', authenticate, eventController.getEventById);

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event (ownership enforced)
 * @access  Protected (Customer only)
 */
router.put('/:id', authenticate, requireCustomer, eventController.updateEvent);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event (ownership enforced)
 * @access  Protected (Customer only)
 */
router.delete('/:id', authenticate, requireCustomer, eventController.deleteEvent);

// ==============================================================================
// 2. EVENT SELECTED SERVICES (CART / SHORTLIST)
// ==============================================================================

/**
 * @route   GET /api/events/:id/services
 * @desc    Get all selected services shortlisted for an event
 * @access  Protected (Owner or Admin)
 */
router.get('/:id/services', authenticate, eventController.getEventServices);

/**
 * @route   POST /api/events/:id/services
 * @desc    Add a provider's package/service to an event
 * @access  Protected (Customer only)
 */
router.post('/:id/services', authenticate, requireCustomer, eventController.addServiceToEvent);

/**
 * @route   DELETE /api/events/:id/services/:serviceId
 * @desc    Remove a service from an event
 * @access  Protected (Customer only)
 */
router.delete('/:id/services/:serviceId', authenticate, requireCustomer, eventController.removeServiceFromEvent);

/**
 * @route   PUT /api/events/:id/services/:cartItemId
 * @desc    Update quantity or notes of a selected service in an event
 * @access  Protected (Customer only)
 */
router.put('/:id/services/:cartItemId', authenticate, requireCustomer, eventController.updateEventService);

// ==============================================================================
// 3. EVENT PLAN & MULTI-PROVIDER BOOKING DISPATCH
// ==============================================================================

/**
 * @route   GET /api/events/:id/plan
 * @desc    Get consolidated event plan with live booking statuses & budget metrics
 * @access  Protected (Customer owner or Admin)
 */
router.get('/:id/plan', authenticate, requireCustomer, eventController.getEventPlan);

/**
 * @route   POST /api/events/:id/bookings
 * @desc    Dispatch individual booking requests for shortlisted providers in event plan
 * @access  Protected (Customer owner)
 */
router.post('/:id/bookings', authenticate, requireCustomer, eventController.dispatchBookingRequests);

export default router;
