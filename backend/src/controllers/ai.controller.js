import * as aiService from '../services/ai.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/ai/chat
 * Customer AI event planning assistant
 */
export const chat = async (req, res) => {
  try {
    const { message, eventId, conversationId } = req.body || {};

    // 1. Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Message is required and must be a non-empty string',
      });
    }

    // 2. Validate eventId format if supplied
    if (eventId !== undefined && eventId !== null && eventId !== '') {
      if (typeof eventId !== 'string' || !UUID_REGEX.test(eventId.trim())) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'Invalid eventId format. Must be a valid UUID',
        });
      }
    }

    // 3. Process chat through AI service
    const result = await aiService.processChat({
      message: message.trim(),
      eventId: eventId ? eventId.trim() : null,
      conversationId: conversationId ? String(conversationId).trim() : null,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      recommendations: result.recommendations,
      actions: result.actions,
    });
  } catch (error) {
    console.error('[AiController] Error processing chat request:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'BadRequest' : (statusCode === 403 ? 'Forbidden' : (statusCode === 404 ? 'NotFound' : 'InternalServerError')),
      message: error.message || 'An unexpected error occurred while processing your request',
    });
  }
};
