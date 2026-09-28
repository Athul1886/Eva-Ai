import * as portfolioService from '../services/portfolio.service.js';
import { validatePortfolioPayload } from '../utils/validators.js';
import { isSupabaseConfigured } from '../config/supabase.js';
import { formatPortfolioItemDTO } from '../utils/provider.dto.js';

/**
 * POST /api/providers/portfolio
 * Add a portfolio item
 */
export const createPortfolioItem = async (req, res) => {
  try {
    if (req.file) {
      req.body.image_url = 'temp-url'; // Bypass validation temporarily
    }

    const validation = validatePortfolioPayload(req.body, false);
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

    if (req.file) {
      const { uploadFileToStorage } = await import('../services/storage.service.js');
      const crypto = await import('crypto');
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `portfolio-${crypto.randomUUID()}.${ext}`;
      // In portfolio controller, we don't have direct provider profile id in req.user,
      // But we can store under user id path which is safe
      const filePath = `providers/${req.user.id}/portfolio/${fileName}`;
      validation.data.image_url = await uploadFileToStorage('provider-media', filePath, req.file.buffer, req.file.mimetype);
    }

    const item = await portfolioService.addPortfolioItem(req.user.id, validation.data);
    const formatted = formatPortfolioItemDTO(item);

    return res.status(201).json({
      success: true,
      message: 'Portfolio item added successfully',
      portfolio: formatted,
      item: formatted,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to add portfolio item',
    });
  }
};

/**
 * GET /api/providers/portfolio
 * View current provider's portfolio items
 */
export const getMyPortfolio = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const items = await portfolioService.getMyPortfolio(req.user.id);
    const formatted = (items || []).map(formatPortfolioItemDTO);

    return res.status(200).json({
      success: true,
      portfolios: formatted,
      portfolio: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: error.message || 'Failed to retrieve portfolio',
    });
  }
};

/**
 * GET /api/providers/portfolio/:id
 * View specific portfolio item
 */
export const getPortfolioItem = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const item = await portfolioService.getPortfolioItemById(req.params.id);
    const formatted = formatPortfolioItemDTO(item);

    return res.status(200).json({
      success: true,
      portfolio: formatted,
      item: formatted,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message || 'Failed to retrieve portfolio item',
    });
  }
};

/**
 * PUT /api/providers/portfolio/:id
 * Update portfolio item - enforces ownership
 */
export const updatePortfolioItem = async (req, res) => {
  try {
    const validation = validatePortfolioPayload(req.body, true);
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

    if (req.file) {
      const { uploadFileToStorage } = await import('../services/storage.service.js');
      const crypto = await import('crypto');
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `portfolio-${crypto.randomUUID()}.${ext}`;
      const filePath = `providers/${req.user.id}/portfolio/${fileName}`;
      validation.data.image_url = await uploadFileToStorage('provider-media', filePath, req.file.buffer, req.file.mimetype);
    }

    const updated = await portfolioService.updatePortfolioItem(req.params.id, req.user.id, validation.data);
    const formatted = formatPortfolioItemDTO(updated);

    return res.status(200).json({
      success: true,
      message: 'Portfolio item updated successfully',
      portfolio: formatted,
      item: formatted,
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
      message: error.message || 'Failed to update portfolio item',
    });
  }
};

/**
 * DELETE /api/providers/portfolio/:id
 * Delete portfolio item - enforces ownership
 */
export const deletePortfolioItem = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Supabase credentials are not configured on the server.',
      });
    }

    const result = await portfolioService.deletePortfolioItem(req.params.id, req.user.id);

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
      message: error.message || 'Failed to delete portfolio item',
    });
  }
};
