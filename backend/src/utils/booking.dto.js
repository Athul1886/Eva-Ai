/**
 * Booking Data Transfer Object (DTO) & Transformer Utilities
 *
 * Bridges the backend database models with the frontend contract confirmed by Athul:
 * - Status Mapping: Frontend uses UPPERCASE ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED').
 *   Database enum uses ('pending', 'confirmed', 'rejected', 'cancelled', 'completed').
 * - Contact Protection: Hides provider direct phone/email when status is PENDING or REJECTED.
 *   Exposes provider contact details strictly when status is ACCEPTED or COMPLETED.
 */

// Frontend-facing status values
export const FRONTEND_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
};

// Database-level status values
export const DB_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACCEPTED: 'accepted', // Future-proof if DB enum is expanded
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

/**
 * Maps a database status string to the frontend status string.
 * @param {string} dbStatus
 * @returns {string} Frontend uppercase status
 */
export const toFrontendStatus = (dbStatus) => {
  if (!dbStatus) return FRONTEND_STATUS.PENDING;
  const normalized = String(dbStatus).toLowerCase().trim();
  switch (normalized) {
    case 'confirmed':
    case 'accepted':
      return FRONTEND_STATUS.ACCEPTED;
    case 'rejected':
      return FRONTEND_STATUS.REJECTED;
    case 'cancelled':
    case 'canceled':
      return FRONTEND_STATUS.CANCELLED;
    case 'completed':
      return FRONTEND_STATUS.COMPLETED;
    case 'pending':
    default:
      return FRONTEND_STATUS.PENDING;
  }
};

/**
 * Maps a frontend status string to the database status string.
 * @param {string} frontendStatus
 * @returns {string} Database lowercase status
 */
export const toDbStatus = (frontendStatus) => {
  if (!frontendStatus) return DB_STATUS.PENDING;
  const normalized = String(frontendStatus).toUpperCase().trim();
  switch (normalized) {
    case FRONTEND_STATUS.ACCEPTED:
      // Map ACCEPTED to 'confirmed' for PostgreSQL booking_status enum compatibility
      return DB_STATUS.CONFIRMED;
    case FRONTEND_STATUS.REJECTED:
      return DB_STATUS.REJECTED;
    case FRONTEND_STATUS.CANCELLED:
      return DB_STATUS.CANCELLED;
    case FRONTEND_STATUS.COMPLETED:
      return DB_STATUS.COMPLETED;
    case FRONTEND_STATUS.PENDING:
    default:
      return DB_STATUS.PENDING;
  }
};

/**
 * Validates whether a proposed status transition is permitted by the state machine.
 *
 * Rules:
 * PENDING  -> ACCEPTED, REJECTED, CANCELLED
 * ACCEPTED -> COMPLETED, CANCELLED
 * Terminal: REJECTED, CANCELLED, COMPLETED cannot transition
 *
 * @param {string} currentStatus Current frontend status
 * @param {string} nextStatus Desired next frontend status
 * @returns {boolean}
 */
export const isValidStatusTransition = (currentStatus, nextStatus) => {
  const current = toFrontendStatus(currentStatus);
  const next = toFrontendStatus(nextStatus);

  if (current === next) return true;

  if (current === FRONTEND_STATUS.PENDING) {
    return (
      next === FRONTEND_STATUS.ACCEPTED ||
      next === FRONTEND_STATUS.REJECTED ||
      next === FRONTEND_STATUS.CANCELLED
    );
  }

  if (current === FRONTEND_STATUS.ACCEPTED) {
    return (
      next === FRONTEND_STATUS.COMPLETED ||
      next === FRONTEND_STATUS.CANCELLED
    );
  }

  // Terminal states cannot be changed
  return false;
};

/**
 * Transforms a raw database booking record into the customer-facing DTO.
 * Applies Contact Protection: Only reveals provider phone/email if status is ACCEPTED or COMPLETED.
 *
 * @param {Object} booking Raw booking record with joined provider, event, service, and user data
 * @returns {Object} Customer booking DTO
 */
export const formatCustomerBookingDTO = (booking) => {
  if (!booking) return null;

  const feStatus = toFrontendStatus(booking.status);
  const isAcceptedOrCompleted =
    feStatus === FRONTEND_STATUS.ACCEPTED || feStatus === FRONTEND_STATUS.COMPLETED;

  const provider = booking.provider || {};
  const providerUser = provider.user || {};
  const event = booking.event || {};
  const service = booking.service || {};

  // Formatted booking reference e.g. "EVA-BOOK-A7C92F"
  const displayBookingId =
    booking.booking_reference || `EVA-BOOK-${booking.id.substring(0, 6).toUpperCase()}`;

  // Contact Protection: Revealed ONLY when booking is ACCEPTED or COMPLETED
  // Hidden (null) when PENDING, REJECTED, or CANCELLED
  const providerContact = isAcceptedOrCompleted
    ? {
        name: providerUser.full_name || provider.business_name || 'Service Partner',
        manager: providerUser.full_name || provider.business_name || 'Service Partner',
        phone: providerUser.phone || null,
        email: providerUser.email || null,
        address: provider.address || provider.city || null,
      }
    : null;

  return {
    id: booking.id,
    bookingId: displayBookingId,
    bookingReference: displayBookingId,
    providerId: booking.provider_id,
    providerName: provider.business_name || 'Service Provider',
    category: service.category?.name || provider.primary_category?.name || 'Service',
    serviceId: booking.service_id || null,
    serviceTitle: service.title || null,
    eventId: booking.event_id,
    eventType: event.event_type || 'Event',
    eventDate: booking.booking_date,
    location: event.city || provider.city || null,
    guestCount: event.estimated_guests || null,
    startingPrice: provider.starting_price ? parseFloat(provider.starting_price) : 0,
    amount: parseFloat(booking.total_amount) || 0,
    status: feStatus,
    paymentStatus: booking.payment_status || 'unpaid',
    notes: booking.special_instructions || '',
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    providerContact,
    isContactUnlocked: isAcceptedOrCompleted,
  };
};

/**
 * Transforms a raw database booking record into the provider-facing DTO.
 * Exposes customer contact details for booking fulfillment strictly when ACCEPTED or COMPLETED.
 * When PENDING, REJECTED, or CANCELLED, private customer phone/email remain protected.
 *
 * @param {Object} booking Raw booking record with joined customer, event, service
 * @returns {Object} Provider booking DTO
 */
export const formatProviderBookingDTO = (booking) => {
  if (!booking) return null;

  const feStatus = toFrontendStatus(booking.status);
  const isAcceptedOrCompleted =
    feStatus === FRONTEND_STATUS.ACCEPTED || feStatus === FRONTEND_STATUS.COMPLETED;

  const customer = booking.customer || {};
  const event = booking.event || {};
  const service = booking.service || {};

  const displayBookingId =
    booking.booking_reference || `EVA-BOOK-${booking.id.substring(0, 6).toUpperCase()}`;

  // Contact Protection for Provider view:
  // Customer's private contact details (phone, email) are locked (null) unless ACCEPTED or COMPLETED
  const customerContact = isAcceptedOrCompleted
    ? {
        name: customer.full_name || 'Client',
        phone: customer.phone || null,
        email: customer.email || null,
      }
    : null;

  return {
    id: booking.id,
    bookingId: displayBookingId,
    bookingReference: displayBookingId,
    providerId: booking.provider_id,
    serviceId: booking.service_id || null,
    serviceTitle: service.title || null,
    eventId: booking.event_id,
    eventType: event.event_type || 'Event',
    eventDate: booking.booking_date,
    location: event.city || null,
    guestCount: event.estimated_guests || null,
    amount: parseFloat(booking.total_amount) || 0,
    status: feStatus,
    paymentStatus: booking.payment_status || 'unpaid',
    notes: booking.special_instructions || '',
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    customerId: booking.customer_id,
    customerName: customer.full_name || 'Client',
    customerPhone: isAcceptedOrCompleted ? (customer.phone || null) : null,
    customerEmail: isAcceptedOrCompleted ? (customer.email || null) : null,
    customerContact,
    isContactUnlocked: isAcceptedOrCompleted,
  };
};
