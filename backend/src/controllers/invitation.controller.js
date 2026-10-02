import * as invitationService from '../services/invitation.service.js';
import { validateRSVPPayload } from '../utils/invitation.utils.js';

/**
 * POST /api/invitations
 * Create an invitation for the authenticated customer's event
 */
export const createInvitation = async (req, res) => {
  try {
    const customerId = req.user.id;
    const invitation = await invitationService.createInvitation(customerId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invitation,
      data: invitation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to create invitation',
    });
  }
};

/**
 * GET /api/invitations/my
 * Return all invitations belonging to the authenticated customer
 */
export const getMyInvitations = async (req, res) => {
  try {
    const customerId = req.user.id;
    const invitations = await invitationService.getMyInvitations(customerId);

    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
      data: invitations,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve invitations',
    });
  }
};

/**
 * GET /api/invitations/:id
 * Return an authenticated customer's own invitation by ID
 */
export const getInvitationById = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const invitation = await invitationService.getInvitationById(id, customerId);

    return res.status(200).json({
      success: true,
      invitation,
      data: invitation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve invitation',
    });
  }
};

/**
 * PUT /api/invitations/:id
 * Allow customer to update their own invitation
 */
export const updateInvitation = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const invitation = await invitationService.updateInvitation(id, customerId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Invitation updated successfully',
      invitation,
      data: invitation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to update invitation',
    });
  }
};

/**
 * DELETE /api/invitations/:id
 * Allow customer to delete their own invitation
 */
export const deleteInvitation = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const result = await invitationService.deleteInvitation(id, customerId);

    return res.status(200).json({
      success: true,
      message: result.message || 'Invitation deleted successfully',
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to delete invitation',
    });
  }
};

/**
 * GET /api/invitations/:id/rsvps
 * Return historical and live RSVPs for the customer's own invitation
 */
export const getInvitationRsvps = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const rsvpsData = await invitationService.getInvitationRsvps(id, customerId);

    return res.status(200).json({
      success: true,
      ...rsvpsData,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve RSVPs',
    });
  }
};

/**
 * GET /api/public/invitations/:publicToken
 * Public endpoint to fetch invitation data for QR code / guest viewer
 * Unauthenticated.
 */
export const getPublicInvitation = async (req, res) => {
  try {
    const { publicToken } = req.params;

    const response = await invitationService.getPublicInvitationByToken(publicToken);

    return res.status(200).json(response);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to load public invitation',
    });
  }
};

/**
 * POST /api/public/invitations/:publicToken/rsvp
 * Public guest RSVP submission
 * Unauthenticated.
 */
export const submitPublicRsvp = async (req, res) => {
  try {
    const { publicToken } = req.params;

    // Validate payload strictly
    const validation = validateRSVPPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: validation.message,
      });
    }

    const result = await invitationService.submitPublicRsvp(publicToken, validation.data);

    return res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to submit RSVP',
    });
  }
};
