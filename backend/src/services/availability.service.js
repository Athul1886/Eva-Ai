import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { getProviderProfileByUserId } from './provider.service.js';

/**
 * Add a new availability slot for the authenticated provider
 */
export const addAvailability = async (userId, availabilityData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found for this user account');
    error.statusCode = 400;
    throw error;
  }

  const { date, start_time, end_time, is_available = true, reason = null } = availabilityData;

  // 1. Prevent duplicate slots: Check if slot already exists
  let duplicateQuery = dbClient
    .from('provider_availability')
    .select('id')
    .eq('provider_id', currentProvider.id)
    .eq('date', date);

  if (start_time) {
    duplicateQuery = duplicateQuery.eq('start_time', start_time);
  } else {
    duplicateQuery = duplicateQuery.is('start_time', null);
  }

  if (end_time) {
    duplicateQuery = duplicateQuery.eq('end_time', end_time);
  } else {
    duplicateQuery = duplicateQuery.is('end_time', null);
  }

  const { data: existingSlot } = await duplicateQuery.maybeSingle();

  if (existingSlot) {
    const conflictError = new Error('An availability slot already exists for this provider on this date and time');
    conflictError.statusCode = 409;
    throw conflictError;
  }

  // 2. Insert availability
  const insertPayload = {
    provider_id: currentProvider.id,
    date,
    start_time: start_time || null,
    end_time: end_time || null,
    is_available,
    reason,
  };

  const { data: slot, error: insertError } = await dbClient
    .from('provider_availability')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const conflictError = new Error('An availability slot already exists for this provider on this date and time');
      conflictError.statusCode = 409;
      throw conflictError;
    }
    const error = new Error('Failed to create availability slot: ' + insertError.message);
    error.statusCode = 500;
    throw error;
  }

  return slot;
};

/**
 * Get all availability slots for the authenticated provider
 */
export const getMyAvailability = async (userId, { startDate, endDate } = {}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    return [];
  }

  let query = dbClient
    .from('provider_availability')
    .select('*')
    .eq('provider_id', currentProvider.id);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

  const { data: slots, error } = await query;

  if (error) {
    const err = new Error('Failed to retrieve availability slots: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return slots || [];
};

/**
 * Get specific availability slot by ID
 */
export const getAvailabilityById = async (availabilityId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(availabilityId);
  if (!isUUID) {
    const error = new Error('Invalid availability ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: slot, error } = await dbClient
    .from('provider_availability')
    .select('*')
    .eq('id', availabilityId)
    .maybeSingle();

  if (error || !slot) {
    const notFoundError = new Error('Availability slot not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return slot;
};

/**
 * Update availability slot - enforces ownership
 */
export const updateAvailability = async (availabilityId, userId, updateData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(availabilityId);
  if (!isUUID) {
    const error = new Error('Invalid availability ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch slot
  const { data: slot, error: fetchError } = await dbClient
    .from('provider_availability')
    .select('id, provider_id')
    .eq('id', availabilityId)
    .maybeSingle();

  if (fetchError || !slot) {
    const notFoundError = new Error('Availability slot not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Fetch current provider
  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. OWNERSHIP CHECK
  if (slot.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to modify another provider\'s availability');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const updates = {};
  if (updateData.date !== undefined) updates.date = updateData.date;
  if (updateData.start_time !== undefined) updates.start_time = updateData.start_time;
  if (updateData.end_time !== undefined) updates.end_time = updateData.end_time;
  if (updateData.is_available !== undefined) updates.is_available = updateData.is_available;
  if (updateData.reason !== undefined) updates.reason = updateData.reason;

  const { data: updatedSlot, error: updateError } = await dbClient
    .from('provider_availability')
    .update(updates)
    .eq('id', availabilityId)
    .select('*')
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      const conflictError = new Error('An availability slot already exists for this provider on this date and time');
      conflictError.statusCode = 409;
      throw conflictError;
    }
    const error = new Error('Failed to update availability slot: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updatedSlot;
};

/**
 * Delete availability slot - enforces ownership
 */
export const deleteAvailability = async (availabilityId, userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(availabilityId);
  if (!isUUID) {
    const error = new Error('Invalid availability ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: slot, error: fetchError } = await dbClient
    .from('provider_availability')
    .select('id, provider_id')
    .eq('id', availabilityId)
    .maybeSingle();

  if (fetchError || !slot) {
    const notFoundError = new Error('Availability slot not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // OWNERSHIP CHECK
  if (slot.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to delete another provider\'s availability');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const { error: deleteError } = await dbClient
    .from('provider_availability')
    .delete()
    .eq('id', availabilityId);

  if (deleteError) {
    const error = new Error('Failed to delete availability slot: ' + deleteError.message);
    error.statusCode = 500;
    throw error;
  }

  return { success: true, message: 'Availability slot deleted successfully' };
};

/**
 * Checks whether a provider is available on a specific date (Whole-day adapter).
 * A provider is considered UNAVAILABLE if:
 * 1. They have an availability slot on this date with is_available = false (blackout date)
 * 2. They have an active booking on this date with status in ('pending', 'confirmed', 'accepted')
 *
 * @param {string} providerId Provider profile UUID
 * @param {string} dateStr YYYY-MM-DD format
 * @returns {Promise<boolean>} True if available, false if unavailable
 */
export const isProviderAvailableOnDate = async (providerId, dateStr) => {
  if (!providerId || !dateStr) return true;

  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // 1. Check blackout dates in provider_availability
  const { data: blackout } = await dbClient
    .from('provider_availability')
    .select('id, is_available')
    .eq('provider_id', providerId)
    .eq('date', dateStr)
    .eq('is_available', false)
    .maybeSingle();

  if (blackout) {
    return false;
  }

  // 2. Check existing accepted/confirmed booking on this date
  const { data: activeBooking } = await dbClient
    .from('bookings')
    .select('id, status')
    .eq('provider_id', providerId)
    .eq('booking_date', dateStr)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (activeBooking) {
    return false;
  }

  return true;
};

/**
 * Returns an array of unavailable date strings (YYYY-MM-DD) for a provider.
 *
 * @param {string} providerId
 * @returns {Promise<string[]>}
 */
export const getProviderUnavailableDates = async (providerId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // Fetch blackout dates
  const { data: blackouts } = await dbClient
    .from('provider_availability')
    .select('date')
    .eq('provider_id', providerId)
    .eq('is_available', false);

  // Fetch confirmed bookings
  const { data: booked } = await dbClient
    .from('bookings')
    .select('booking_date')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed');

  const dateSet = new Set();
  (blackouts || []).forEach((b) => {
    if (b.date) dateSet.add(b.date);
  });
  (booked || []).forEach((b) => {
    if (b.booking_date) dateSet.add(b.booking_date);
  });

  return Array.from(dateSet).sort();
};

/**
 * Sync provider blackout dates from the calendar (Whole-day adapter).
 * Replaces existing whole-day blackout entries with the provided date list.
 *
 * @param {string} userId Authenticated provider's user ID
 * @param {string[]} unavailableDates Array of YYYY-MM-DD date strings
 */
export const syncProviderUnavailableDates = async (userId, unavailableDates = []) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete existing blackout dates (where start_time is null or is_available is false)
  await dbClient
    .from('provider_availability')
    .delete()
    .eq('provider_id', currentProvider.id)
    .eq('is_available', false);

  if (unavailableDates.length > 0) {
    const toInsert = unavailableDates.map((dateStr) => ({
      provider_id: currentProvider.id,
      date: dateStr,
      is_available: false,
      reason: 'Blocked by provider in schedule calendar',
    }));

    const { error: insertErr } = await dbClient
      .from('provider_availability')
      .insert(toInsert);

    if (insertErr) {
      const error = new Error('Failed to save unavailable dates: ' + insertErr.message);
      error.statusCode = 500;
      throw error;
    }
  }

  return {
    success: true,
    message: 'Schedule availability updated successfully',
    unavailableDates,
  };
};
