import * as providerService from '../services/provider.service.js';
import { validateProviderProfileUpdate } from '../utils/validators.js';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { formatPortfolioItemDTO } from '../utils/provider.dto.js';

/**
 * GET /api/providers/profile (or /me)
 * Provider views their own profile
 */
export const getMyProfile = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const profile = await providerService.getMyProfile(req.user.id);
    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve profile',
    });
  }
};

/**
 * PUT /api/providers/profile (or /me)
 * Provider updates their own profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const validation = validateProviderProfileUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: validation.message,
      });
    }

    if (req.file) {
      const { uploadFileToStorage } = await import('../services/storage.service.js');
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `avatar-${Date.now()}.${ext}`;
      const filePath = `providers/${req.user.id}/profile/${fileName}`;
      validation.data.avatar_url = await uploadFileToStorage('provider-media', filePath, req.file.buffer, req.file.mimetype);
    }

    const updated = await providerService.updateMyProfile(req.user.id, validation.data);
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to update profile',
    });
  }
};

/**
 * GET /api/providers/categories
 * List all supported provider categories
 */
export const getCategories = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      // If Supabase not yet configured, return the supported category metadata list
      return res.status(200).json({
        success: true,
        categories: providerService.SUPPORTED_CATEGORIES,
      });
    }

    const dbClient = getSupabaseAdmin() || getSupabaseClient();
    const categories = await providerService.getOrSeedCategories(dbClient);

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve categories',
    });
  }
};

/**
 * GET /api/providers
 * Public provider browsing (APPROVED providers only)
 */
export const getPublicProviders = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { category, city, location, minPrice, maxPrice, search, sortBy, page, limit } = req.query;

    const result = await providerService.getPublicProviders({
      category,
      city,
      location,
      minPrice,
      maxPrice,
      search,
      sortBy,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve providers',
    });
  }
};

/**
 * GET /api/providers/:id
 * Public provider details by ID (APPROVED only, unless requested by owner or admin)
 */
export const getPublicProviderDetails = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const provider = await providerService.getPublicProviderById(req.params.id, req.user);

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
 * GET /api/providers/:id/portfolio
 * Public portfolio listing for an approved provider
 */
export const getPublicProviderPortfolio = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const portfolios = await providerService.getProviderPortfolioPublic(req.params.id);
    const formatted = (portfolios || []).map(formatPortfolioItemDTO);

    return res.status(200).json({
      success: true,
      portfolios: formatted,
      portfolio: formatted,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve portfolio',
    });
  }
};

/**
 * GET /api/providers/:id/availability
 * Public availability schedule for an approved provider
 */
export const getPublicProviderAvailability = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const { startDate, endDate } = req.query;
    const availability = await providerService.getProviderAvailabilityPublic(req.params.id, {
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve availability',
    });
  }
};
