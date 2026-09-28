import * as eventService from '../services/event.service.js';
import { validateEventPayload, validateEventServicePayload } from '../utils/validators.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * POST /api/events
 * Create a new customer event
 */
export const createEvent = async (req, res) => {
  try {
    const validation = validateEventPayload(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: validation.message,
        missingFields: validation.missingFields || [],
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const event = await eventService.createEvent(req.user.id, validation.data);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
      data: event,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to create event',
    });
  }
};

/**
 * GET /api/events or GET /api/events/my
 * View all events belonging to the authenticated customer
 */
export const getMyEvents = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const events = await eventService.getMyEvents(req.user.id);

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve events',
    });
  }
};

/**
 * GET /api/events/:id
 * Retrieve a specific customer event with its selected services
 */
export const getEventById = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const event = await eventService.getEventById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      event,
      data: event,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 403 ? 'Forbidden' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to retrieve event',
    });
  }
};

/**
 * PUT /api/events/:id
 * Update an existing customer event
 */
export const updateEvent = async (req, res) => {
  try {
    const validation = validateEventPayload(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: validation.message,
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const updated = await eventService.updateEvent(req.params.id, req.user.id, validation.data);

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: updated,
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to update event',
    });
  }
};

/**
 * DELETE /api/events/:id
 * Delete an event belonging to the authenticated customer
 */
export const deleteEvent = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await eventService.deleteEvent(req.params.id, req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to delete event',
    });
  }
};

/**
 * GET /api/events/:id/services
 * Retrieve all selected services shortlisted for an event
 */
export const getEventServices = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const services = await eventService.getEventServices(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
      data: services,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve event services',
    });
  }
};

/**
 * POST /api/events/:id/services
 * Add a provider service to an event shortlist
 */
export const addServiceToEvent = async (req, res) => {
  try {
    const validation = validateEventServicePayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: validation.message,
        missingFields: validation.missingFields || [],
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const selectedService = await eventService.addServiceToEvent(req.params.id, req.user.id, validation.data);

    return res.status(201).json({
      success: true,
      message: 'Service added to event successfully',
      service: selectedService,
      data: selectedService,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to add service to event',
    });
  }
};

/**
 * DELETE /api/events/:id/services/:serviceId
 * Remove a selected service from an event
 */
export const removeServiceFromEvent = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await eventService.removeServiceFromEvent(req.params.id, req.user.id, req.params.serviceId);

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to remove service from event',
    });
  }
};

/**
 * PUT /api/events/:id/services/:cartItemId
 * Update quantity/notes for a selected service in an event
 */
export const updateEventService = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const updated = await eventService.updateEventService(req.params.id, req.user.id, req.params.cartItemId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Event service updated successfully',
      service: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to update event service',
    });
  }
};

/**
 * GET /api/events/:id/plan
 * Consolidated Event Plan endpoint for /customer/event-plan
 * Returns event details, shortlisted services with live booking status and availability,
 * and live authoritative financial/budget calculations.
 */
export const getEventPlan = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const plan = await eventService.getEventPlan(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      plan,
      data: plan,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 404
          ? 'NotFound'
          : statusCode === 403
          ? 'Forbidden'
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to retrieve event plan',
    });
  }
};

/**
 * POST /api/events/:id/bookings
 * Multi-Provider Booking Request Dispatch from the Event Plan
 * Dispatches individual booking requests for each shortlisted provider in the plan.
 */
export const dispatchBookingRequests = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await eventService.dispatchBookingRequests(
      req.params.id,
      req.user.id,
      req.body || {}
    );

    return res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 409
          ? 'Conflict'
          : statusCode === 404
          ? 'NotFound'
          : statusCode === 403
          ? 'Forbidden'
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to dispatch booking requests',
    });
  }
};

