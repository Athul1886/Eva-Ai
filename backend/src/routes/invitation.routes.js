import { Router } from 'express';
import * as invitationController from '../controllers/invitation.controller.js';
import { authenticate, requireCustomer } from '../middlewares/auth.middleware.js';

const router = Router();

// ==============================================================================
// PUBLIC INVITATION ENDPOINTS (No customer authentication required)
// Used by QR codes and public guests
// ==============================================================================
router.get('/public/:publicToken', invitationController.getPublicInvitation);
router.post('/public/:publicToken/rsvp', invitationController.submitPublicRsvp);

// ==============================================================================
// CUSTOMER AUTHENTICATED ENDPOINTS
// Requires valid JWT and customer role
// ==============================================================================

// Create invitation for customer's event
router.post('/', authenticate, requireCustomer, invitationController.createInvitation);

// Retrieve all invitations belonging to the authenticated customer
router.get('/', authenticate, requireCustomer, invitationController.getMyInvitations);
router.get('/my', authenticate, requireCustomer, invitationController.getMyInvitations);

// Retrieve specific invitation belonging to the authenticated customer
router.get('/:id', authenticate, requireCustomer, invitationController.getInvitationById);

// Update customer's invitation
router.put('/:id', authenticate, requireCustomer, invitationController.updateInvitation);

// Delete customer's invitation
router.delete('/:id', authenticate, requireCustomer, invitationController.deleteInvitation);

// Retrieve live & historical RSVPs for customer's invitation
router.get('/:id/rsvps', authenticate, requireCustomer, invitationController.getInvitationRsvps);

export default router;
