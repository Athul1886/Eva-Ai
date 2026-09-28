import * as adminService from '../services/admin.service.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * GET /api/admin/providers
 * Admin lists all providers (pending, approved, rejected, suspended)
 */
export const listProviders = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { status, page, limit, search } = req.query;
    const result = await adminService.listAllProviders({ status, page, limit, search });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to list providers',
    });
  }
};

/**
 * GET /api/admin/providers/:id
 * Admin views any provider in full
 */
export const getProviderDetails = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const provider = await adminService.getAdminProviderById(req.params.id);

    return res.status(200).json({
      success: true,
      provider,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to retrieve provider details',
    });
  }
};

/**
 * POST /api/admin/providers/:id/approve
 * Admin approves provider
 */
export const approveProvider = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const approved = await adminService.approveProvider(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Provider approved successfully',
      provider: approved,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to approve provider',
    });
  }
};

/**
 * POST /api/admin/providers/:id/reject
 * Admin rejects provider
 */
export const rejectProvider = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { reason, rejection_reason } = req.body || {};
    const rejectionReason = reason || rejection_reason;

    const rejected = await adminService.rejectProvider(req.params.id, req.user.id, rejectionReason);

    return res.status(200).json({
      success: true,
      message: 'Provider rejected successfully',
      provider: rejected,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to reject provider',
    });
  }
};

/**
 * POST /api/admin/providers/:id/suspend
 * Admin suspends provider
 */
export const suspendProvider = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { reason, rejection_reason } = req.body || {};
    const suspensionReason = reason || rejection_reason;

    const suspended = await adminService.suspendProvider(req.params.id, req.user.id, suspensionReason);

    return res.status(200).json({
      success: true,
      message: 'Provider suspended successfully',
      provider: suspended,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to suspend provider',
    });
  }
};
