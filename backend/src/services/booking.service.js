import crypto from 'crypto';
import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { isProviderAvailableOnDate } from './availability.service.js';
import { getProviderProfileByUserId } from './provider.service.js';
import {
  FRONTEND_STATUS,
  toFrontendStatus,
  toDbStatus,
  isValidStatusTransition,
  formatCustomerBookingDTO,
  formatProviderBookingDTO,
} from '../utils/booking.dto.js';

/**
 * Generate a unique, professional booking reference: e.g. "EVA-BOOK-A7C92F"
 */
export const generateBookingReference = () => {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EVA-BOOK-${randomHex}`;
};

/**
 * Common join select string for complete booking queries
 */
const BOOKING_SELECT_QUERY = `
  id,
  booking_reference,
  event_id,
  customer_id,
  provider_id,
  service_id,
  booking_date,
  start_time,
  end_time,
  total_amount,
  status,
  payment_status,
  special_instructions,
  created_at,
  updated_at,
  event:events(id, title, event_type, event_date, city, estimated_guests, total_budget),
  customer:users!customer_id(id, full_name, email, phone, avatar_url),
  provider:provider_profiles!provider_id(
    id,
    user_id,
    business_name,
    city,
    address,
    starting_price,
    rating,
    reviews_count,
    approval_status,
    primary_category:categories(id, name, slug),
    user:users!user_id(id, full_name, email, phone, avatar_url)
  ),
  service:services(id, title, description, price, pricing_model, duration_hours, category:categories(id, name, slug))
`;

/**
 * CREATE A NEW BOOKING (Customer only)
 *
 * @param {string} customerId Authenticated customer's user ID from JWT
 * @param {Object} payload Booking creation payload
 */
export const createBooking = async (customerId, payload) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const { eventId, providerId, serviceId, bookingDate, amount, notes } = payload;

  if (!eventId) {
    const error = new Error('eventId is required to create a booking');
    error.statusCode = 400;
    throw error;
  }

  if (!providerId) {
    const error = new Error('providerId is required to create a booking');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify Event ownership
  const { data: event, error: eventError } = await dbClient
    .from('events')
    .select('id, user_id, title, event_type, event_date, city, estimated_guests')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (event.user_id !== customerId) {
    const error = new Error('Unauthorized: You can only create bookings for your own events');
    error.statusCode = 403;
    throw error;
  }

  // 2. Validate booking date matches event date and is not in the past
  const targetDate = bookingDate || event.event_date;
  if (!targetDate || typeof targetDate !== 'string') {
    const error = new Error('Booking date is required');
    error.statusCode = 400;
    throw error;
  }

  if (bookingDate && bookingDate !== event.event_date) {
    const error = new Error(
      `Booking date (${bookingDate}) must match your event date (${event.event_date})`
    );
    error.statusCode = 400;
    throw error;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (targetDate < todayStr) {
    const error = new Error(`Cannot book an event on a past date (${targetDate})`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Verify Provider eligibility
  const { data: provider, error: provError } = await dbClient
    .from('provider_profiles')
    .select('id, business_name, approval_status, starting_price, primary_category_id')
    .eq('id', providerId)
    .maybeSingle();

  if (provError || !provider) {
    const error = new Error('Provider not found');
    error.statusCode = 404;
    throw error;
  }

  if (provider.approval_status !== 'approved') {
    const error = new Error('This provider is not currently approved for bookings');
    error.statusCode = 400;
    throw error;
  }

  // 4. Verify Service (if specified) belongs to this provider, or resolve provider's active service
  let verifiedService = null;
  if (serviceId) {
    const { data: srv, error: srvError } = await dbClient
      .from('services')
      .select('id, provider_id, title, price, is_active')
      .eq('id', serviceId)
      .maybeSingle();

    if (srvError || !srv) {
      const error = new Error('Selected service not found');
      error.statusCode = 404;
      throw error;
    }

    if (srv.provider_id !== providerId) {
      const error = new Error('The selected service does not belong to this provider');
      error.statusCode = 400;
      throw error;
    }

    if (!srv.is_active) {
      const error = new Error('The selected service is currently inactive');
      error.statusCode = 400;
      throw error;
    }

    verifiedService = srv;
  } else {
    // Look up an existing active service for this provider
    const { data: existingSrv } = await dbClient
      .from('services')
      .select('id, provider_id, title, price')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingSrv) {
      verifiedService = existingSrv;
    } else {
      // Auto-create standard primary service for provider if none exists
      const { data: newSrv, error: newSrvErr } = await dbClient
        .from('services')
        .insert({
          provider_id: providerId,
          category_id: provider.primary_category_id,
          title: 'Standard Service Package',
          description: `${provider.business_name} Core Event Service`,
          price: provider.starting_price || 0,
          pricing_model: 'fixed',
          is_active: true,
        })
        .select('id, provider_id, title, price')
        .maybeSingle();

      if (!newSrvErr && newSrv) {
        verifiedService = newSrv;
      }
    }
  }

  // 5. Duplicate Booking Request Guard: Check for existing active booking (PENDING or ACCEPTED only)
  const { data: existingActive } = await dbClient
    .from('bookings')
    .select('id, booking_reference, status')
    .eq('customer_id', customerId)
    .eq('event_id', eventId)
    .eq('provider_id', providerId)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle();

  if (existingActive) {
    const currentFeStatus = toFrontendStatus(existingActive.status);
    const error = new Error(
      `An active booking (${existingActive.booking_reference}) with status ${currentFeStatus} already exists for this provider on this event`
    );
    error.statusCode = 409;
    throw error;
  }

  // 6. Check Provider whole-day availability on target date
  const isAvailable = await isProviderAvailableOnDate(providerId, targetDate);
  if (!isAvailable) {
    const error = new Error(
      `Provider '${provider.business_name}' is not available on ${targetDate}`
    );
    error.statusCode = 409;
    throw error;
  }

  // 7. Calculate authoritative total amount from trusted backend service/starting_price data
  const trustedAmount = verifiedService
    ? Number(verifiedService.price)
    : Number(provider.starting_price) || 0;
  const resolvedAmount = trustedAmount;

  // 8. Generate unique booking reference with retry if collided
  let reference = generateBookingReference();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existingRef } = await dbClient
      .from('bookings')
      .select('id')
      .eq('booking_reference', reference)
      .maybeSingle();

    if (!existingRef) break;
    reference = generateBookingReference();
  }

  // 9. Insert new booking
  const insertPayload = {
    booking_reference: reference,
    event_id: eventId,
    customer_id: customerId,
    provider_id: providerId,
    service_id: verifiedService?.id || null,
    booking_date: targetDate,
    total_amount: resolvedAmount,
    status: 'pending',
    payment_status: 'unpaid',
    special_instructions: notes ? notes.trim() : null,
  };

  const { data: inserted, error: insertError } = await dbClient
    .from('bookings')
    .insert(insertPayload)
    .select(BOOKING_SELECT_QUERY)
    .single();

  if (insertError) {
    console.error('[BookingService] Error inserting booking:', insertError);
    const error = new Error('Failed to create booking: ' + insertError.message);
    error.statusCode = 500;
    throw error;
  }

  return formatCustomerBookingDTO(inserted);
};

/**
 * GET CUSTOMER'S OWN BOOKINGS
 *
 * @param {string} customerId Authenticated customer's user ID
 * @param {Object} options Filter options: { status }
 */
export const getCustomerBookings = async (customerId, { status } = {}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  let query = dbClient
    .from('bookings')
    .select(BOOKING_SELECT_QUERY)
    .eq('customer_id', customerId);

  // Status filtering
  if (status && status.toUpperCase() !== 'ALL') {
    const feStatus = status.toUpperCase().trim();
    query = query.eq('status', toDbStatus(feStatus));
  }

  query = query.order('created_at', { ascending: false });

  const { data: bookings, error } = await query;

  if (error) {
    console.error('[BookingService] Error fetching customer bookings:', error);
    const err = new Error('Failed to retrieve bookings: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return (bookings || []).map(formatCustomerBookingDTO);
};

/**
 * GET PROVIDER'S INBOX BOOKINGS
 *
 * @param {string} providerUserId Authenticated provider's user ID from JWT
 * @param {Object} options Filter options: { status, search }
 */
export const getProviderBookings = async (providerUserId, { status, search } = {}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // Resolve provider profile
  const provider = await getProviderProfileByUserId(providerUserId);
  if (!provider) {
    const error = new Error('Provider profile not found for this user account');
    error.statusCode = 404;
    throw error;
  }

  let query = dbClient
    .from('bookings')
    .select(BOOKING_SELECT_QUERY)
    .eq('provider_id', provider.id);

  // Status filtering
  if (status && status.toUpperCase() !== 'ALL') {
    const feStatus = status.toUpperCase().trim();
    query = query.eq('status', toDbStatus(feStatus));
  }

  query = query.order('created_at', { ascending: false });

  const { data: bookings, error } = await query;

  if (error) {
    console.error('[BookingService] Error fetching provider bookings:', error);
    const err = new Error('Failed to retrieve provider bookings: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  let list = (bookings || []).map(formatProviderBookingDTO);

  // In-memory text search filtering if search parameter provided
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter((b) => {
      const matchType = (b.eventType || '').toLowerCase().includes(q);
      const matchLoc = (b.location || '').toLowerCase().includes(q);
      const matchClient = (b.customerName || '').toLowerCase().includes(q);
      const matchId = (b.bookingId || '').toLowerCase().includes(q);
      return matchType || matchLoc || matchClient || matchId;
    });
  }

  return list;
};

/**
 * GET A SINGLE BOOKING BY ID OR REFERENCE
 *
 * @param {string} bookingIdOrRef UUID or booking_reference string
 * @param {Object} requestingUser User object from JWT { id, role }
 */
export const getBookingById = async (bookingIdOrRef, requestingUser) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    bookingIdOrRef
  );

  let query = dbClient.from('bookings').select(BOOKING_SELECT_QUERY);
  if (isUUID) {
    query = query.eq('id', bookingIdOrRef);
  } else {
    query = query.ilike('booking_reference', bookingIdOrRef);
  }

  const { data: booking, error } = await query.maybeSingle();

  if (error || !booking) {
    const notFoundError = new Error('Booking not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Authorization check
  const isCustomerOwner = booking.customer_id === requestingUser.id;
  const isProviderOwner = booking.provider?.user_id === requestingUser.id;
  const isAdmin = requestingUser.role === 'admin';

  if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
    const forbiddenError = new Error(
      'Unauthorized: You do not have permission to view this booking'
    );
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  if (isProviderOwner) {
    return formatProviderBookingDTO(booking);
  }

  return formatCustomerBookingDTO(booking);
};

/**
 * UPDATE BOOKING STATUS (State machine & role enforcement)
 *
 * State Machine Rules:
 * PENDING  -> ACCEPTED | REJECTED | CANCELLED
 * ACCEPTED -> COMPLETED | CANCELLED
 * Terminal: REJECTED, CANCELLED, COMPLETED cannot be changed.
 *
 * Role Rules:
 * Provider can ACCEPT, REJECT, or COMPLETE only their own bookings.
 * Customer can CANCEL only their own bookings (PENDING or ACCEPTED).
 * Provider can CANCEL only their own bookings.
 * Customer CANNOT ACCEPT, REJECT, or COMPLETE.
 *
 * @param {string} bookingIdOrRef UUID or booking reference
 * @param {Object} requestingUser User object from JWT { id, role }
 * @param {string} newStatus Proposed next status ('ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED')
 */
export const updateBookingStatus = async (bookingIdOrRef, requestingUser, newStatus) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  if (!newStatus) {
    const error = new Error('Status is required');
    error.statusCode = 400;
    throw error;
  }

  const nextFeStatus = toFrontendStatus(newStatus);

  // 1. Fetch booking record
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    bookingIdOrRef
  );

  let query = dbClient.from('bookings').select(BOOKING_SELECT_QUERY);
  if (isUUID) {
    query = query.eq('id', bookingIdOrRef);
  } else {
    query = query.ilike('booking_reference', bookingIdOrRef);
  }

  const { data: booking, error: fetchError } = await query.maybeSingle();

  if (fetchError || !booking) {
    const notFoundError = new Error('Booking not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const currentFeStatus = toFrontendStatus(booking.status);

  // 2. Validate state machine transition
  if (!isValidStatusTransition(currentFeStatus, nextFeStatus)) {
    const error = new Error(
      `Disallowed status transition: cannot change booking from ${currentFeStatus} to ${nextFeStatus}`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate Role & Ownership
  const isCustomerOwner = booking.customer_id === requestingUser.id;
  const isProviderOwner = booking.provider?.user_id === requestingUser.id;
  const isAdmin = requestingUser.role === 'admin';

  if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
    const forbiddenError = new Error('Unauthorized: You do not own this booking');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // Enforce specific action permissions
  if (nextFeStatus === FRONTEND_STATUS.ACCEPTED || nextFeStatus === FRONTEND_STATUS.REJECTED || nextFeStatus === FRONTEND_STATUS.COMPLETED) {
    if (!isProviderOwner && !isAdmin) {
      const error = new Error(`Only the assigned provider can set booking status to ${nextFeStatus}`);
      error.statusCode = 403;
      throw error;
    }
  }

  if (nextFeStatus === FRONTEND_STATUS.CANCELLED) {
    if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
      const error = new Error('Only the customer or assigned provider can cancel this booking');
      error.statusCode = 403;
      throw error;
    }
  }

  // 4. Update status in database
  const dbStatusValue = toDbStatus(nextFeStatus);

  const { data: updated, error: updateError } = await dbClient
    .from('bookings')
    .update({ status: dbStatusValue, updated_at: new Date().toISOString() })
    .eq('id', booking.id)
    .select(BOOKING_SELECT_QUERY)
    .single();

  if (updateError) {
    console.error('[BookingService] Error updating booking status:', updateError);
    const error = new Error('Failed to update booking status: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  if (isProviderOwner) {
    return formatProviderBookingDTO(updated);
  }
  return formatCustomerBookingDTO(updated);
};
