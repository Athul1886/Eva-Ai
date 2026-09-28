/**
 * Event Plan Data Transfer Object (DTO) & Budget Aggregator
 *
 * Implements the data contract confirmed with frontend developer Athul:
 * - Event Summary: Event metadata, date, city, budget, guest count.
 * - Shortlisted Services: Selected providers/services in the event plan, enriched with
 *   live booking status ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'),
 *   hasActiveBooking flag, and whole-day date availability.
 * - Budget Overview: Authoritative financial metrics calculated on the backend
 *   (totalBudget, estimatedCost, committedCost, remainingBudget, budgetUsagePercentage, isOverBudget).
 */

import { toFrontendStatus, FRONTEND_STATUS } from './booking.dto.js';

/**
 * Formats an event, its shortlisted cart items, and its existing bookings
 * into the complete Event Plan DTO for /customer/event-plan.
 *
 * @param {Object} event Raw event record from database
 * @param {Array} cartItems Shortlisted services from cart_items joined with services and providers
 * @param {Array} bookings Existing bookings for this event
 * @param {Map<string, boolean>} availabilityMap Map of providerId -> isAvailable on event date
 * @returns {Object} Consolidated Event Plan DTO
 */
export const formatEventPlanDTO = (event, cartItems = [], bookings = [], availabilityMap = new Map()) => {
  if (!event) return null;

  // 1. Build booking maps for fast lookup
  // Active bookings map: providerId -> booking
  const activeBookingsMap = new Map();
  // All bookings map (most recent booking per provider): providerId -> booking
  const latestBookingsMap = new Map();

  (bookings || []).forEach((b) => {
    const feStatus = toFrontendStatus(b.status);
    const bookingInfo = {
      id: b.id,
      bookingReference: b.booking_reference || `EVA-BOOK-${b.id.substring(0, 6).toUpperCase()}`,
      status: feStatus,
      totalAmount: parseFloat(b.total_amount) || 0,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    };

    if (feStatus === FRONTEND_STATUS.PENDING || feStatus === FRONTEND_STATUS.ACCEPTED) {
      activeBookingsMap.set(b.provider_id, bookingInfo);
    }

    if (!latestBookingsMap.has(b.provider_id)) {
      latestBookingsMap.set(b.provider_id, bookingInfo);
    }
  });

  // 2. Format Shortlisted Services with Live Booking Status and Availability
  let calculatedEstimatedCost = 0;

  const selectedServices = (cartItems || []).map((item) => {
    const provider = item.provider || {};
    const service = item.service || {};
    const providerId = item.provider_id;

    const unitPrice = parseFloat(item.unit_price) || parseFloat(service.price) || parseFloat(provider.starting_price) || 0;
    calculatedEstimatedCost += unitPrice * (item.quantity || 1);

    const activeBooking = activeBookingsMap.get(providerId);
    const latestBooking = latestBookingsMap.get(providerId);

    const hasActiveBooking = Boolean(activeBooking);
    const bookingStatus = activeBooking ? activeBooking.status : (latestBooking ? latestBooking.status : null);
    const bookingReference = activeBooking ? activeBooking.bookingReference : (latestBooking ? latestBooking.bookingReference : null);
    const bookingId = activeBooking ? activeBooking.id : (latestBooking ? latestBooking.id : null);

    const isAvailable = availabilityMap.has(providerId) ? availabilityMap.get(providerId) : true;

    return {
      id: item.id,
      cartItemId: item.id,
      eventId: item.event_id,
      providerId: providerId,
      providerName: provider.business_name || 'Service Partner',
      category: service.category?.name || provider.primary_category?.name || 'Service',
      location: provider.city || event.city || null,
      startingPrice: parseFloat(provider.starting_price) || unitPrice,
      price: unitPrice,
      quantity: item.quantity || 1,
      serviceId: item.service_id,
      serviceTitle: service.title || 'Standard Service Package',
      notes: item.notes || null,
      imageUrl: provider.avatar_url || null,
      rating: provider.rating ? parseFloat(provider.rating) : null,
      // Booking State Integration
      hasActiveBooking,
      activeBookingStatus: activeBooking ? activeBooking.status : null,
      bookingStatus,
      bookingReference,
      bookingId,
      // Availability Integration
      isAvailable,
      unavailableReason: !isAvailable ? `Provider is unavailable on ${event.event_date}` : null,
      selectedAt: item.created_at,
    };
  });

  // 3. Compute Live Budget Metrics from Trusted Backend Data
  const totalBudget = parseFloat(event.total_budget) || 0;
  const estimatedCost = calculatedEstimatedCost;

  // Calculate committed cost from ACCEPTED or COMPLETED bookings
  const committedCost = (bookings || []).reduce((sum, b) => {
    const feStatus = toFrontendStatus(b.status);
    if (feStatus === FRONTEND_STATUS.ACCEPTED || feStatus === FRONTEND_STATUS.COMPLETED) {
      return sum + (parseFloat(b.total_amount) || 0);
    }
    return sum;
  }, 0);

  // Calculate pending cost from PENDING bookings
  const pendingCost = (bookings || []).reduce((sum, b) => {
    const feStatus = toFrontendStatus(b.status);
    if (feStatus === FRONTEND_STATUS.PENDING) {
      return sum + (parseFloat(b.total_amount) || 0);
    }
    return sum;
  }, 0);

  const hasValidBudget = totalBudget > 0;
  const remainingBudget = hasValidBudget ? totalBudget - estimatedCost : null;
  const isOverBudget = hasValidBudget && remainingBudget !== null && remainingBudget < 0;

  const budgetUsagePercentage = hasValidBudget
    ? Math.round((estimatedCost / totalBudget) * 100)
    : 0;

  const unavailableServices = selectedServices.filter((s) => !s.isAvailable);

  return {
    event: {
      id: event.id,
      customerId: event.user_id,
      title: event.title,
      eventType: event.event_type,
      eventDate: event.event_date,
      location: event.city,
      city: event.city,
      guestCount: event.estimated_guests,
      budget: totalBudget,
      status: event.status,
      preferences: event.preferences || {},
      additionalNotes: event.additional_notes || '',
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    },
    selectedServices,
    selectedCount: selectedServices.length,
    unavailableCount: unavailableServices.length,
    budgetOverview: {
      totalBudget,
      hasValidBudget,
      estimatedCost,
      committedCost,
      pendingCost,
      remainingBudget,
      budgetUsagePercentage,
      isOverBudget,
      currency: 'INR',
    },
    bookingsCount: (bookings || []).length,
    activeBookingsCount: activeBookingsMap.size,
  };
};
