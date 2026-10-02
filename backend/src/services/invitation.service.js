import { getSupabaseAdmin } from '../config/supabase.js';
import {
  resolveEventTimezone,
  calculateExpiration,
  generatePublicToken,
  formatCustomerInvitationDTO,
  formatPublicInvitationDTO,
} from '../utils/invitation.utils.js';

/**
 * Helper to get the authoritative Supabase client.
 */
const getDb = () => getSupabaseAdmin();

/**
 * Cache flag for table availability to optimize queries.
 */
let _useFallbackTable = null;

const checkUseFallback = async (db) => {
  if (_useFallbackTable !== null) return _useFallbackTable;
  try {
    const { error } = await db.from('invitations').select('id').limit(1);
    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      _useFallbackTable = true;
    } else {
      _useFallbackTable = false;
    }
  } catch {
    _useFallbackTable = true;
  }
  return _useFallbackTable;
};

/**
 * Maps a wedding_invitations database row into the standard invitation model.
 */
const mapWeddingInvitationRow = (row) => {
  if (!row) return null;
  const extra = (row.schedule && typeof row.schedule === 'object' && !Array.isArray(row.schedule)) ? row.schedule : {};
  return {
    id: row.id,
    event_id: row.event_id,
    customer_id: row.customer_id || extra.customer_id,
    public_token: row.qr_code_secret,
    title: extra.title || row.couple_title || 'Wedding Celebration',
    host_names: extra.hostNames || (row.bride_name && row.groom_name ? `${row.bride_name} & ${row.groom_name}` : row.bride_name || null),
    message: extra.message || row.story || null,
    event_time: extra.eventTime || null,
    venue_name: row.venue_name,
    venue_address: row.venue_address,
    template: extra.template || row.template_id || 'classic',
    cover_image_url: extra.coverImageUrl || null,
    status: 'ACTIVE',
    created_at: row.created_at,
    updated_at: row.updated_at,
    _rawSchedule: row.schedule,
  };
};

/**
 * Helper to fetch RSVPs for an invitation regardless of backend storage mode.
 */
const fetchRsvpsForInvitation = async (db, invitationId, rawSchedule = null) => {
  const isFallback = await checkUseFallback(db);
  if (!isFallback) {
    const { data: rsvps } = await db
      .from('invitation_rsvps')
      .select('*')
      .eq('invitation_id', invitationId)
      .order('created_at', { ascending: false });
    return rsvps || [];
  }

  // Fallback mode: read from schedule.rsvps
  if (rawSchedule && typeof rawSchedule === 'object' && Array.isArray(rawSchedule.rsvps)) {
    return rawSchedule.rsvps;
  }

  const { data: winv } = await db
    .from('wedding_invitations')
    .select('schedule')
    .eq('id', invitationId)
    .maybeSingle();

  if (winv?.schedule && typeof winv.schedule === 'object' && Array.isArray(winv.schedule.rsvps)) {
    return winv.schedule.rsvps;
  }

  return [];
};

/**
 * Create an invitation for the authenticated customer's event.
 * Verifies event existence and ownership.
 */
export const createInvitation = async (customerId, payload = {}) => {
  const db = getDb();
  const { eventId } = payload;

  if (!eventId) {
    const error = new Error('eventId is required to create an invitation');
    error.statusCode = 400;
    throw error;
  }

  // Fetch event and verify existence
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (eventErr || !event) {
    const error = new Error(`Event not found with ID: ${eventId}`);
    error.statusCode = 404;
    throw error;
  }

  // Verify ownership: event must belong to authenticated customer
  if (event.user_id !== customerId) {
    const error = new Error('Forbidden: You do not own this event');
    error.statusCode = 403;
    throw error;
  }

  // Prepare invitation fields with intelligent defaults from the event blueprint
  const title = (payload.title || '').trim() || event.title || 'Wedding Celebration';
  const hostNames = (payload.hostNames || '').trim() || null;
  const message = (payload.message || '').trim() || null;
  const eventTime = (payload.eventTime || '').trim() || event.start_time || null;
  const venueName = (payload.venueName || '').trim() || event.venue_name || event.city || null;
  const venueAddress = (payload.venueAddress || '').trim() || event.venue_address || event.city || null;
  const template = (payload.template || '').trim() || 'classic';
  const coverImageUrl = payload.coverImageUrl || null;
  const publicToken = generatePublicToken();

  const isFallback = await checkUseFallback(db);

  if (!isFallback) {
    // Check if invitation already exists for this event
    const { data: existing } = await db
      .from('invitations')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      const updatePayload = {
        title,
        template,
      };
      if (hostNames !== null) updatePayload.host_names = hostNames;
      if (message !== null) updatePayload.message = message;
      if (eventTime !== null) updatePayload.event_time = eventTime;
      if (venueName !== null) updatePayload.venue_name = venueName;
      if (venueAddress !== null) updatePayload.venue_address = venueAddress;
      if (coverImageUrl !== null) updatePayload.cover_image_url = coverImageUrl;

      const { data: updated } = await db
        .from('invitations')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('*')
        .single();

      const rsvps = await fetchRsvpsForInvitation(db, existing.id);
      return formatCustomerInvitationDTO(updated || existing, event, rsvps);
    }

    const insertData = {
      event_id: eventId,
      customer_id: customerId,
      public_token: publicToken,
      title,
      host_names: hostNames,
      message,
      event_time: eventTime,
      venue_name: venueName,
      venue_address: venueAddress,
      template,
      cover_image_url: coverImageUrl,
      status: 'ACTIVE',
    };

    const { data: created, error: insertErr } = await db
      .from('invitations')
      .insert(insertData)
      .select('*')
      .single();

    if (insertErr) {
      const error = new Error(`Failed to create invitation: ${insertErr.message}`);
      error.statusCode = 500;
      throw error;
    }

    return formatCustomerInvitationDTO(created, event, []);
  } else {
    // Fallback: use wedding_invitations
    const { data: existingWinv } = await db
      .from('wedding_invitations')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingWinv) {
      const prevSchedule = (existingWinv.schedule && typeof existingWinv.schedule === 'object' && !Array.isArray(existingWinv.schedule))
        ? existingWinv.schedule
        : { rsvps: [] };

      const updatedSchedule = {
        ...prevSchedule,
        customer_id: customerId,
        title,
        hostNames: hostNames || prevSchedule.hostNames,
        message: message || prevSchedule.message,
        eventTime: eventTime || prevSchedule.eventTime,
        venueName: venueName || prevSchedule.venueName,
        venueAddress: venueAddress || prevSchedule.venueAddress,
        template: template || prevSchedule.template,
        coverImageUrl: coverImageUrl !== null ? coverImageUrl : prevSchedule.coverImageUrl,
        rsvps: prevSchedule.rsvps || [],
      };

      const brideName = hostNames ? (hostNames.split('&')[0]?.trim() || hostNames) : existingWinv.bride_name;
      const groomName = hostNames ? (hostNames.split('&')[1]?.trim() || 'Partner') : existingWinv.groom_name;

      const { data: updatedWinv } = await db
        .from('wedding_invitations')
        .update({
          couple_title: title,
          bride_name: brideName,
          groom_name: groomName,
          story: message || existingWinv.story,
          venue_name: venueName || existingWinv.venue_name,
          venue_address: venueAddress || existingWinv.venue_address,
          template_id: template || existingWinv.template_id,
          schedule: updatedSchedule,
        })
        .eq('id', existingWinv.id)
        .select('*')
        .single();

      const mapped = mapWeddingInvitationRow(updatedWinv || existingWinv);
      const rsvps = updatedSchedule.rsvps || [];
      return formatCustomerInvitationDTO(mapped, event, rsvps);
    }

    const brideName = hostNames ? (hostNames.split('&')[0]?.trim() || hostNames) : 'Host';
    const groomName = hostNames ? (hostNames.split('&')[1]?.trim() || 'Partner') : 'Host';

    const insertData = {
      event_id: eventId,
      bride_name: brideName,
      groom_name: groomName,
      couple_title: title,
      story: message,
      venue_name: venueName || 'Venue',
      venue_address: venueAddress || 'Address',
      template_id: template,
      qr_code_secret: publicToken,
      schedule: {
        customer_id: customerId,
        title,
        hostNames,
        message,
        eventTime,
        venueName,
        venueAddress,
        template,
        coverImageUrl,
        rsvps: [],
      },
    };

    const { data: createdWinv, error: insertErr } = await db
      .from('wedding_invitations')
      .insert(insertData)
      .select('*')
      .single();

    if (insertErr) {
      const error = new Error(`Failed to create invitation: ${insertErr.message}`);
      error.statusCode = 500;
      throw error;
    }

    const mapped = mapWeddingInvitationRow(createdWinv);
    return formatCustomerInvitationDTO(mapped, event, []);
  }
};

/**
 * Return invitations belonging to the authenticated customer.
 */
export const getMyInvitations = async (customerId) => {
  const db = getDb();
  const isFallback = await checkUseFallback(db);

  if (!isFallback) {
    const { data: invitations, error } = await db
      .from('invitations')
      .select('*, event:events(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error(`Failed to fetch customer invitations: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }

    const results = [];
    for (const inv of (invitations || [])) {
      const event = inv.event || {};
      const rsvps = await fetchRsvpsForInvitation(db, inv.id);
      results.push(formatCustomerInvitationDTO(inv, event, rsvps));
    }
    return results;
  } else {
    // Fallback: query wedding_invitations joined with events
    const { data: winvs, error } = await db
      .from('wedding_invitations')
      .select('*, event:events(*)')
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error(`Failed to fetch customer invitations: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }

    const results = [];
    for (const row of (winvs || [])) {
      const event = row.event || {};
      const mapped = mapWeddingInvitationRow(row);
      if (mapped.customer_id === customerId || event.user_id === customerId) {
        const rsvps = await fetchRsvpsForInvitation(db, mapped.id, row.schedule);
        results.push(formatCustomerInvitationDTO(mapped, event, rsvps));
      }
    }
    return results;
  }
};

/**
 * Return an authenticated customer's own invitation by ID.
 * Enforces ownership check.
 */
export const getInvitationById = async (invitationId, customerId) => {
  const db = getDb();
  const isFallback = await checkUseFallback(db);

  let invitation = null;
  let event = null;
  let rawSchedule = null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationId);

  if (!isFallback) {
    let query = db.from('invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`id.eq.${invitationId},event_id.eq.${invitationId}`);
    } else {
      query = query.eq('public_token', invitationId);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    invitation = data;
    event = data.event || {};
  } else {
    let query = db.from('wedding_invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`id.eq.${invitationId},event_id.eq.${invitationId}`);
    } else {
      query = query.eq('qr_code_secret', invitationId);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    invitation = mapWeddingInvitationRow(data);
    event = data.event || {};
    rawSchedule = data.schedule;
  }

  // Ownership verification
  const ownerId = invitation.customer_id || event.user_id;
  if (ownerId && ownerId !== customerId) {
    const forbiddenErr = new Error('Forbidden: You do not have permission to view this invitation');
    forbiddenErr.statusCode = 403;
    throw forbiddenErr;
  }

  const rsvps = await fetchRsvpsForInvitation(db, invitation.id, rawSchedule);
  return formatCustomerInvitationDTO(invitation, event, rsvps);
};

/**
 * Allow customer to update their own invitation.
 * Enforces ownership check.
 */
export const updateInvitation = async (invitationId, customerId, updates = {}) => {
  const db = getDb();
  const isFallback = await checkUseFallback(db);

  let existing = null;
  let event = null;

  if (!isFallback) {
    const { data, error } = await db
      .from('invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    existing = data;
    event = data.event || {};

    if (existing.customer_id !== customerId && event.user_id !== customerId) {
      const forbiddenErr = new Error('Forbidden: You do not have permission to update this invitation');
      forbiddenErr.statusCode = 403;
      throw forbiddenErr;
    }

    const updatePayload = {};
    if (updates.title !== undefined) updatePayload.title = updates.title.trim();
    if (updates.hostNames !== undefined) updatePayload.host_names = updates.hostNames ? updates.hostNames.trim() : null;
    if (updates.message !== undefined) updatePayload.message = updates.message ? updates.message.trim() : null;
    if (updates.eventTime !== undefined) updatePayload.event_time = updates.eventTime ? updates.eventTime.trim() : null;
    if (updates.venueName !== undefined) updatePayload.venue_name = updates.venueName ? updates.venueName.trim() : null;
    if (updates.venueAddress !== undefined) updatePayload.venue_address = updates.venueAddress ? updates.venueAddress.trim() : null;
    if (updates.template !== undefined) updatePayload.template = updates.template.trim();
    if (updates.coverImageUrl !== undefined) updatePayload.cover_image_url = updates.coverImageUrl;

    const { data: updated, error: updateErr } = await db
      .from('invitations')
      .update(updatePayload)
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateErr) {
      const err = new Error(`Failed to update invitation: ${updateErr.message}`);
      err.statusCode = 500;
      throw err;
    }

    const rsvps = await fetchRsvpsForInvitation(db, invitationId);
    return formatCustomerInvitationDTO(updated, event, rsvps);
  } else {
    // Fallback: update wedding_invitations
    const { data, error } = await db
      .from('wedding_invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    existing = mapWeddingInvitationRow(data);
    event = data.event || {};

    if (existing.customer_id !== customerId && event.user_id !== customerId) {
      const forbiddenErr = new Error('Forbidden: You do not have permission to update this invitation');
      forbiddenErr.statusCode = 403;
      throw forbiddenErr;
    }

    const prevSchedule = (data.schedule && typeof data.schedule === 'object' && !Array.isArray(data.schedule))
      ? data.schedule
      : { rsvps: [] };

    const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
    const newHostNames = updates.hostNames !== undefined ? (updates.hostNames ? updates.hostNames.trim() : null) : existing.host_names;
    const newMessage = updates.message !== undefined ? (updates.message ? updates.message.trim() : null) : existing.message;
    const newEventTime = updates.eventTime !== undefined ? (updates.eventTime ? updates.eventTime.trim() : null) : existing.event_time;
    const newVenueName = updates.venueName !== undefined ? (updates.venueName ? updates.venueName.trim() : null) : existing.venue_name;
    const newVenueAddress = updates.venueAddress !== undefined ? (updates.venueAddress ? updates.venueAddress.trim() : null) : existing.venue_address;
    const newTemplate = updates.template !== undefined ? updates.template.trim() : existing.template;
    const newCoverImageUrl = updates.coverImageUrl !== undefined ? updates.coverImageUrl : existing.cover_image_url;

    const updatedSchedule = {
      ...prevSchedule,
      customer_id: customerId,
      title: newTitle,
      hostNames: newHostNames,
      message: newMessage,
      eventTime: newEventTime,
      venueName: newVenueName,
      venueAddress: newVenueAddress,
      template: newTemplate,
      coverImageUrl: newCoverImageUrl,
      rsvps: prevSchedule.rsvps || [],
    };

    const updatePayload = {
      couple_title: newTitle,
      story: newMessage,
      venue_name: newVenueName || 'Venue',
      venue_address: newVenueAddress || 'Address',
      template_id: newTemplate,
      schedule: updatedSchedule,
    };

    if (newHostNames) {
      updatePayload.bride_name = newHostNames.split('&')[0]?.trim() || newHostNames;
      updatePayload.groom_name = newHostNames.split('&')[1]?.trim() || 'Partner';
    }

    const { data: updatedWinv, error: updateErr } = await db
      .from('wedding_invitations')
      .update(updatePayload)
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateErr) {
      const err = new Error(`Failed to update invitation: ${updateErr.message}`);
      err.statusCode = 500;
      throw err;
    }

    const mapped = mapWeddingInvitationRow(updatedWinv);
    const rsvps = updatedSchedule.rsvps || [];
    return formatCustomerInvitationDTO(mapped, event, rsvps);
  }
};

/**
 * Delete an invitation.
 * Enforces ownership check.
 */
export const deleteInvitation = async (invitationId, customerId) => {
  const db = getDb();
  const isFallback = await checkUseFallback(db);

  if (!isFallback) {
    const { data, error } = await db
      .from('invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    if (data.customer_id !== customerId && data.event?.user_id !== customerId) {
      const forbiddenErr = new Error('Forbidden: You do not have permission to delete this invitation');
      forbiddenErr.statusCode = 403;
      throw forbiddenErr;
    }

    await db.from('invitations').delete().eq('id', invitationId);
    return { success: true, message: 'Invitation deleted successfully' };
  } else {
    const { data, error } = await db
      .from('wedding_invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const mapped = mapWeddingInvitationRow(data);
    if (mapped.customer_id !== customerId && data.event?.user_id !== customerId) {
      const forbiddenErr = new Error('Forbidden: You do not have permission to delete this invitation');
      forbiddenErr.statusCode = 403;
      throw forbiddenErr;
    }

    await db.from('wedding_invitations').delete().eq('id', invitationId);
    return { success: true, message: 'Invitation deleted successfully' };
  }
};

/**
 * Get RSVPs for an authenticated customer's invitation.
 * Enforces ownership check.
 * Accessible even after invitation expiration.
 */
export const getInvitationRsvps = async (invitationId, customerId) => {
  const db = getDb();
  const isFallback = await checkUseFallback(db);

  let invitation = null;
  let event = null;
  let rawSchedule = null;

  if (!isFallback) {
    const { data, error } = await db
      .from('invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }
    invitation = data;
    event = data.event || {};
  } else {
    const { data, error } = await db
      .from('wedding_invitations')
      .select('*, event:events(*)')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error(`Invitation not found with ID: ${invitationId}`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }
    invitation = mapWeddingInvitationRow(data);
    event = data.event || {};
    rawSchedule = data.schedule;
  }

  // Ownership verification
  const ownerId = invitation.customer_id || event.user_id;
  if (ownerId && ownerId !== customerId) {
    const forbiddenErr = new Error('Forbidden: You do not have permission to view RSVPs for this invitation');
    forbiddenErr.statusCode = 403;
    throw forbiddenErr;
  }

  const rawRsvps = await fetchRsvpsForInvitation(db, invitation.id, rawSchedule);

  // Format RSVPs and summary
  let attendingCount = 0;
  let notAttendingCount = 0;
  let maybeCount = 0;
  let totalGuestsCount = 0;

  const formattedRsvps = rawRsvps.map((r) => {
    const guestCount = parseInt(r.guest_count || r.guestCount || 1, 10) || 1;
    const attendance = (r.attendance || 'ATTENDING').toUpperCase();

    if (attendance === 'ATTENDING') {
      attendingCount += 1;
      totalGuestsCount += guestCount;
    } else if (attendance === 'NOT_ATTENDING') {
      notAttendingCount += 1;
    } else if (attendance === 'MAYBE') {
      maybeCount += 1;
    }

    return {
      id: r.id,
      invitationId: r.invitation_id || invitation.id,
      guestName: r.guest_name || r.guestName,
      attendance,
      guestCount,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
    };
  });

  return {
    invitationId: invitation.id,
    summary: {
      totalResponses: formattedRsvps.length,
      attendingResponses: attendingCount,
      notAttendingResponses: notAttendingCount,
      maybeResponses: maybeCount,
      totalGuestsAttending: totalGuestsCount,
    },
    rsvps: formattedRsvps,
  };
};

/**
 * Public Endpoint: GET /api/public/invitations/:publicToken
 * Does NOT require authentication.
 * Evaluates expiration:
 * - If expired: returns { success: true, status: 'EXPIRED', eventDate }
 * - If active: returns { success: true, status: 'ACTIVE', invitation: {...} }
 * Never exposes private customer info.
 */
export const getPublicInvitationByToken = async (publicToken) => {
  const cleanToken = (publicToken || '').trim();
  if (!cleanToken) {
    const error = new Error('publicToken is required');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  const isFallback = await checkUseFallback(db);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken);

  let invitation = null;
  let event = null;

  if (!isFallback) {
    let query = db.from('invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`public_token.eq.${cleanToken},id.eq.${cleanToken}`);
    } else {
      query = query.eq('public_token', cleanToken);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error('Invitation not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    invitation = data;
    event = data.event || {};
  } else {
    let query = db.from('wedding_invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`qr_code_secret.eq.${cleanToken},id.eq.${cleanToken}`);
    } else {
      query = query.eq('qr_code_secret', cleanToken);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error('Invitation not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    invitation = mapWeddingInvitationRow(data);
    event = data.event || {};
  }

  const eventDate = event.event_date || invitation.event_date || null;
  const timezone = resolveEventTimezone(event);
  const expiration = calculateExpiration(eventDate, timezone);

  if (expiration.isExpired) {
    return {
      success: true,
      status: 'EXPIRED',
      eventDate: eventDate || null,
    };
  }

  return {
    success: true,
    status: 'ACTIVE',
    invitation: formatPublicInvitationDTO(invitation, event),
  };
};

/**
 * Public Endpoint: POST /api/public/invitations/:publicToken/rsvp
 * Rejects submission if the invitation has expired.
 * Strict validation of guestName, attendance, guestCount.
 */
export const submitPublicRsvp = async (publicToken, rsvpData) => {
  const cleanToken = (publicToken || '').trim();
  if (!cleanToken) {
    const error = new Error('publicToken is required');
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  const isFallback = await checkUseFallback(db);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken);

  let invitation = null;
  let event = null;
  let rawRecord = null;

  if (!isFallback) {
    let query = db.from('invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`public_token.eq.${cleanToken},id.eq.${cleanToken}`);
    } else {
      query = query.eq('public_token', cleanToken);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error('Invitation not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    invitation = data;
    event = data.event || {};
  } else {
    let query = db.from('wedding_invitations').select('*, event:events(*)');
    if (isUuid) {
      query = query.or(`qr_code_secret.eq.${cleanToken},id.eq.${cleanToken}`);
    } else {
      query = query.eq('qr_code_secret', cleanToken);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const notFoundErr = new Error('Invitation not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    rawRecord = data;
    invitation = mapWeddingInvitationRow(data);
    event = data.event || {};
  }

  // Check expiration
  const eventDate = event.event_date || invitation.event_date || null;
  const timezone = resolveEventTimezone(event);
  const expiration = calculateExpiration(eventDate, timezone);

  if (expiration.isExpired) {
    const expiredError = new Error('This invitation has expired.');
    expiredError.statusCode = 400;
    expiredError.isExpired = true;
    throw expiredError;
  }

  const { guestName, attendance, guestCount } = rsvpData;

  if (!isFallback) {
    const insertPayload = {
      invitation_id: invitation.id,
      guest_name: guestName,
      attendance,
      guest_count: guestCount,
    };

    const { data: createdRsvp, error: rsvpErr } = await db
      .from('invitation_rsvps')
      .insert(insertPayload)
      .select('*')
      .single();

    if (rsvpErr) {
      const err = new Error(`Failed to submit RSVP: ${rsvpErr.message}`);
      err.statusCode = 500;
      throw err;
    }

    return {
      success: true,
      message: 'RSVP submitted successfully',
      rsvp: {
        id: createdRsvp.id,
        guestName: createdRsvp.guest_name,
        attendance: createdRsvp.attendance,
        guestCount: createdRsvp.guest_count,
        createdAt: createdRsvp.created_at,
      },
    };
  } else {
    // Fallback mode: persist into wedding_invitations.schedule.rsvps
    const currentSchedule = (rawRecord.schedule && typeof rawRecord.schedule === 'object' && !Array.isArray(rawRecord.schedule))
      ? rawRecord.schedule
      : { rsvps: [] };

    const newRsvp = {
      id: crypto.randomUUID(),
      invitation_id: invitation.id,
      guest_name: guestName,
      guestName,
      attendance,
      guest_count: guestCount,
      guestCount,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedRsvps = [...(currentSchedule.rsvps || []), newRsvp];
    const updatedSchedule = {
      ...currentSchedule,
      rsvps: updatedRsvps,
    };

    const { error: updateErr } = await db
      .from('wedding_invitations')
      .update({ schedule: updatedSchedule })
      .eq('id', invitation.id);

    if (updateErr) {
      const err = new Error(`Failed to submit RSVP: ${updateErr.message}`);
      err.statusCode = 500;
      throw err;
    }

    return {
      success: true,
      message: 'RSVP submitted successfully',
      rsvp: {
        id: newRsvp.id,
        guestName: newRsvp.guestName,
        attendance: newRsvp.attendance,
        guestCount: newRsvp.guestCount,
        createdAt: newRsvp.createdAt,
      },
    };
  }
};
