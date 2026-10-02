import * as recommendationService from '../services/recommendation.service.js';

/**
 * Controller to handle recommendation requests
 * Supports both POST /api/recommendations and GET /api/recommendations
 */
export const getRecommendations = async (req, res) => {
  try {
    const params = {
      ...req.query,
      ...req.body,
      user: req.user || null,
    };

    const result = await recommendationService.getRecommendations(params);

    return res.status(200).json({
      success: true,
      total: result.total,
      recommendations: result.recommendations,
      eventContext: result.eventContext,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : (statusCode === 403 ? 'Forbidden' : (statusCode === 404 ? 'NotFound' : 'InternalServerError')),
      message: error.message || 'Failed to generate recommendations',
    });
  }
};
