import * as availabilityService from '../services/availability.service.js';
import { validateAvailabilityPayload } from '../utils/validators.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * POST /api/providers/availability
 * Add an availability slot
 */
export const createAvailability = async (req, res) => {
  try {
    const validation = validateAvailabilityPayload(req.body, false);
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

    const slot = await availabilityService.addAvailability(req.user.id, validation.data);

    return res.status(201).json({
      success: true,
      message: 'Availability slot added successfully',
      availability: slot,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 409
          ? 'Conflict'
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to add availability slot',
    });
  }
};

/**
 * GET /api/providers/availability
 * View current provider's availability slots
 */
export const getMyAvailability = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { startDate, endDate } = req.query;
    const slots = await availabilityService.getMyAvailability(req.user.id, {
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      availability: slots,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve availability slots',
    });
  }
};

/**
 * GET /api/providers/availability/:id
 * View specific availability slot
 */
export const getAvailabilityItem = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const slot = await availabilityService.getAvailabilityById(req.params.id);

    return res.status(200).json({
      success: true,
      availability: slot,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to retrieve availability slot',
    });
  }
};

/**
 * PUT /api/providers/availability/:id
 * Update availability slot - enforces ownership
 */
export const updateAvailability = async (req, res) => {
  try {
    const validation = validateAvailabilityPayload(req.body, true);
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

    const updated = await availabilityService.updateAvailability(req.params.id, req.user.id, validation.data);

    return res.status(200).json({
      success: true,
      message: 'Availability slot updated successfully',
      availability: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 403
          ? 'Forbidden'
          : statusCode === 404
          ? 'NotFound'
          : statusCode === 409
          ? 'Conflict'
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to update availability slot',
    });
  }
};

/**
 * DELETE /api/providers/availability/:id
 * Delete availability slot - enforces ownership
 */
export const deleteAvailability = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await availabilityService.deleteAvailability(req.params.id, req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 403
          ? 'Forbidden'
          : statusCode === 404
          ? 'NotFound'
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to delete availability slot',
    });
  }
};

/**
 * GET /api/providers/:id/unavailable-dates
 * Public endpoint: returns list of unavailable YYYY-MM-DD date strings for calendar checks
 */
export const getUnavailableDates = async (req, res) => {
  try {
    const { id } = req.params;
    const unavailableDates = await availabilityService.getProviderUnavailableDates(id);
    return res.status(200).json({
      success: true,
      providerId: id,
      unavailableDates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve unavailable dates',
    });
  }
};

/**
 * PUT /api/providers/availability/sync
 * Provider endpoint: Syncs unavailable dates list from schedule calendar
 */
export const syncUnavailableDates = async (req, res) => {
  try {
    const { unavailableDates } = req.body;
    if (!Array.isArray(unavailableDates)) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'unavailableDates must be an array of YYYY-MM-DD date strings',
      });
    }

    const result = await availabilityService.syncProviderUnavailableDates(req.user.id, unavailableDates);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to sync availability dates',
    });
  }
};
