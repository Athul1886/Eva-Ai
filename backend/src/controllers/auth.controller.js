import * as authService from '../services/auth.service.js';
import { validateCustomerPayload, validateProviderPayload } from '../utils/validators.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * Register endpoint handler - supports both Customer and Provider
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { role, businessName, business_name, category, providerCategory, categoryId } = req.body;

    // Detect if this is provider registration
    const isProvider =
      role === 'provider' ||
      Boolean(businessName || business_name || category || providerCategory || categoryId);

    if (isProvider) {
      const validation = validateProviderPayload(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: validation.message,
          missingFields: validation.missingFields || [],
        });
      }

      if (!isSupabaseConfigured()) {
        return res.status(500).json({
          success: false,
          error: 'ConfigurationError',
          message: 'Supabase credentials are not configured on the server. Please populate SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
        });
      }

      const result = await authService.registerProvider(validation.data);
      return res.status(201).json(result);
    } else {
      // Customer registration
      const validation = validateCustomerPayload(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: validation.message,
          missingFields: validation.missingFields || [],
        });
      }

      if (!isSupabaseConfigured()) {
        return res.status(500).json({
          success: false,
          error: 'ConfigurationError',
          message: 'Supabase credentials are not configured on the server. Please populate SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
        });
      }

      const result = await authService.registerCustomer(validation.data);
      return res.status(201).json(result);
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorType =
      statusCode === 409
        ? 'Conflict'
        : statusCode === 400
        ? 'Bad Request'
        : statusCode === 401
        ? 'Unauthorized'
        : statusCode === 403
        ? 'Forbidden'
        : 'Internal Server Error';

    return res.status(statusCode).json({
      success: false,
      error: errorType,
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * Login endpoint handler
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[Login Debug] Body received:', { email, passwordLength: password ? password.length : 0 });

    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server. Please populate SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
      });
    }

    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorType =
      statusCode === 401
        ? 'Unauthorized'
        : statusCode === 403
        ? 'Forbidden'
        : statusCode === 400
        ? 'Bad Request'
        : 'Internal Server Error';

    return res.status(statusCode).json({
      success: false,
      error: errorType,
      message: error.message || 'Login failed',
    });
  }
};

/**
 * Logout endpoint handler
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token && isSupabaseConfigured()) {
      await authService.logout(token);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
};

/**
 * Refresh token endpoint handler
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const token = req.body.refreshToken || req.body.refresh_token;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'refreshToken is required',
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await authService.refreshSession(token);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 401 ? 'Unauthorized' : statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: error.message || 'Token refresh failed',
    });
  }
};

/**
 * Get current logged in user endpoint handler
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
      data: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve current user',
    });
  }
};

/**
 * Update authenticated user profile handler
 * PUT /api/auth/me or PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, location } = req.body;
    let { avatarUrl } = req.body;

    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    if (req.file) {
      const { uploadFileToStorage } = await import('../services/storage.service.js');
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `avatar-${Date.now()}.${ext}`;
      const filePath = `providers/${req.user.id}/profile/${fileName}`;
      avatarUrl = await uploadFileToStorage('provider-media', filePath, req.file.buffer, req.file.mimetype);
    }

    const updatedUser = await authService.updateUserProfile(
      req.user.id,
      { fullName, phone, location, avatarUrl },
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      data: updatedUser,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: error.message || 'Failed to update profile',
    });
  }
};
