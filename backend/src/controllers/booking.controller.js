import * as bookingService from '../services/booking.service.js';

/**
 * POST /api/bookings
 * Create an individual booking request for a provider/service from an event plan
 * Access: Protected (Customer only)
 */
export const createBooking = async (req, res) => {
  try {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      booking,
    });
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
      message: error.message || 'Failed to create booking',
    });
  }
};

/**
 * GET /api/bookings/my
 * View all bookings for the authenticated customer
 * Access: Protected (Customer only)
 */
export const getCustomerBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const bookings = await bookingService.getCustomerBookings(req.user.id, { status });
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to retrieve bookings',
    });
  }
};

/**
 * GET /api/bookings/provider
 * View incoming booking requests for the authenticated provider
 * Access: Protected (Provider only)
 */
export const getProviderBookings = async (req, res) => {
  try {
    const { status, search } = req.query;
    const bookings = await bookingService.getProviderBookings(req.user.id, { status, search });
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'NotFound' : 'InternalServerError',
      message: error.message || 'Failed to retrieve provider bookings',
    });
  }
};

/**
 * GET /api/bookings/:id
 * View specific booking details (ownership enforced)
 * Access: Protected (Customer owner, Assigned provider, or Admin)
 */
export const getBookingById = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      booking,
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
          : 'InternalServerError',
      message: error.message || 'Failed to retrieve booking',
    });
  }
};

/**
 * PATCH /api/bookings/:id/status
 * Update booking status according to the valid state machine
 * Access: Protected (Provider for ACCEPT/REJECT/COMPLETE; Customer/Provider for CANCEL)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Field "status" is required in request body',
      });
    }

    const updated = await bookingService.updateBookingStatus(
      req.params.id,
      req.user,
      status
    );

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${updated.status}`,
      booking: updated,
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
      message: error.message || 'Failed to update booking status',
    });
  }
};
