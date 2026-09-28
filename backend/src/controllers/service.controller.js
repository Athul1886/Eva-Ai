import * as serviceService from '../services/service.service.js';
import { validateServicePayload } from '../utils/validators.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * POST /api/services
 * Create a new service for the authenticated provider
 */
export const createService = async (req, res) => {
  try {
    const validation = validateServicePayload(req.body, false);
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

    const service = await serviceService.createService(req.user.id, validation.data);

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to create service',
    });
  }
};

/**
 * GET /api/services/my
 * View all services of the authenticated provider
 */
export const getMyServices = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const services = await serviceService.getMyServices(req.user.id);

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve services',
    });
  }
};

/**
 * GET /api/services/:id
 * View specific service by ID
 */
export const getServiceById = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const service = await serviceService.getServiceById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to retrieve service',
    });
  }
};

/**
 * PUT /api/services/:id
 * Update service - enforces ownership
 */
export const updateService = async (req, res) => {
  try {
    const validation = validateServicePayload(req.body, true);
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

    const updated = await serviceService.updateService(req.params.id, req.user.id, validation.data);

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service: updated,
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
          : statusCode === 400
          ? 'BadRequest'
          : 'InternalServerError',
      message: error.message || 'Failed to update service',
    });
  }
};

/**
 * DELETE /api/services/:id
 * Delete service - enforces ownership
 */
export const deleteService = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await serviceService.deleteService(req.params.id, req.user.id);

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
      message: error.message || 'Failed to delete service',
    });
  }
};
