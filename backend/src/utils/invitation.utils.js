import crypto from 'crypto';

/**
 * Resolves the appropriate IANA timezone for an event.
 * Uses event.timezone, event.preferences.timezone, or infers from city/location.
 * Defaults to 'Asia/Kolkata' (Eva-Ai platform default).
 */
export const resolveEventTimezone = (event = {}) => {
  if (event.timezone && typeof event.timezone === 'string') {
    return event.timezone;
  }
  if (event.preferences?.timezone && typeof event.preferences.timezone === 'string') {
    return event.preferences.timezone;
  }

  const locationText = [
    event.city,
    event.location,
    event.venue_address,
    event.venueAddress,
    event.title
  ].filter(Boolean).join(' ').toLowerCase();

  if (!locationText) {
    return 'Asia/Kolkata';
  }

  // India & Kerala regions
  if (
    locationText.includes('kochi') ||
    locationText.includes('trivandrum') ||
    locationText.includes('thiruvananthapuram') ||
    locationText.includes('thrissur') ||
    locationText.includes('palakkad') ||
    locationText.includes('calicut') ||
    locationText.includes('kozhikode') ||
    locationText.includes('malappuram') ||
    locationText.includes('kollam') ||
    locationText.includes('kannur') ||
    locationText.includes('alappuzha') ||
    locationText.includes('kottayam') ||
    locationText.includes('kerala') ||
    locationText.includes('bangalore') ||
    locationText.includes('bengaluru') ||
    locationText.includes('chennai') ||
    locationText.includes('mumbai') ||
    locationText.includes('delhi') ||
    locationText.includes('hyderabad') ||
    locationText.includes('kolkata') ||
    locationText.includes('india')
  ) {
    return 'Asia/Kolkata';
  }

  // United States regions
  if (
    locationText.includes('new york') ||
    locationText.includes('nyc') ||
    locationText.includes('miami') ||
    locationText.includes('atlanta') ||
    locationText.includes('boston')
  ) {
    return 'America/New_York';
  }
  if (
    locationText.includes('chicago') ||
    locationText.includes('dallas') ||
    locationText.includes('houston') ||
    locationText.includes('austin')
  ) {
    return 'America/Chicago';
  }
  if (
    locationText.includes('denver') ||
    locationText.includes('phoenix') ||
    locationText.includes('salt lake')
  ) {
    return 'America/Denver';
  }
  if (
    locationText.includes('los angeles') ||
    locationText.includes('san francisco') ||
    locationText.includes('seattle') ||
    locationText.includes('california')
  ) {
    return 'America/Los_Angeles';
  }

  // United Kingdom & Europe
  if (locationText.includes('london') || locationText.includes('uk')) {
    return 'Europe/London';
  }
  if (locationText.includes('paris') || locationText.includes('france')) {
    return 'Europe/Paris';
  }

  // Middle East / UAE
  if (locationText.includes('dubai') || locationText.includes('abu dhabi') || locationText.includes('uae')) {
    return 'Asia/Dubai';
  }

  return 'Asia/Kolkata';
};

/**
 * Calculates expiration details for an invitation based on the event date and timezone.
 * Rule: The invitation remains active throughout the event date until 23:59:59 in the event's local timezone.
 * It expires at 00:00:00 of the next calendar day in that local timezone.
 *
 * @param {string} eventDateStr - Date in 'YYYY-MM-DD' format.
 * @param {string} timeZone - IANA timezone identifier (e.g. 'Asia/Kolkata').
 * @returns {{ expiresAt: string, isExpired: boolean, status: 'ACTIVE' | 'EXPIRED', localToday: string }}
 */
export const calculateExpiration = (eventDateStr, timeZone = 'Asia/Kolkata') => {
  if (!eventDateStr) {
    return {
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      status: 'ACTIVE',
      localToday: '',
    };
  }

  // Normalize date string to YYYY-MM-DD
  const cleanDateStr = eventDateStr.includes('T') ? eventDateStr.split('T')[0] : eventDateStr;
  const [year, month, day] = cleanDateStr.split('-').map(Number);

  // Expiration happens at 00:00:00 of the day AFTER event date in the local timezone
  // Step 1: Create a UTC reference for next day midnight
  const nextDayMidnightUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

  // Step 2: Determine local offset for that moment in the specified timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(nextDayMidnightUtc);

  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const localAsUtc = Date.UTC(
    parseInt(partMap.year, 10),
    parseInt(partMap.month, 10) - 1,
    parseInt(partMap.day, 10),
    parseInt(partMap.hour, 10) % 24,
    parseInt(partMap.minute, 10),
    parseInt(partMap.second, 10)
  );

  const tzOffsetMs = localAsUtc - nextDayMidnightUtc.getTime();
  const expiresAtMs = nextDayMidnightUtc.getTime() - tzOffsetMs;
  const expiresAtDate = new Date(expiresAtMs);

  // Today in the event's local timezone (formatted as YYYY-MM-DD)
  const localToday = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const nowMs = Date.now();
  const isExpired = nowMs >= expiresAtMs || localToday > cleanDateStr;
  const status = isExpired ? 'EXPIRED' : 'ACTIVE';

  return {
    expiresAt: expiresAtDate.toISOString(),
    isExpired,
    status,
    localToday,
  };
};

/**
 * Generates an unpredictable, cryptographically random public token.
 */
export const generatePublicToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Transforms an internal invitation record into the authenticated customer DTO.
 */
export const formatCustomerInvitationDTO = (invitation, event = {}, rsvps = []) => {
  if (!invitation) return null;

  const resolvedTz = resolveEventTimezone(event);
  const eventDate = event.event_date || event.eventDate || invitation.event_date || null;
  const expiration = calculateExpiration(eventDate, resolvedTz);

  const totalRsvps = Array.isArray(rsvps) ? rsvps.length : 0;
  const attendingCount = (Array.isArray(rsvps) ? rsvps : []).reduce((acc, r) => {
    return r.attendance === 'ATTENDING' ? acc + (parseInt(r.guest_count || r.guestCount || 1, 10) || 1) : acc;
  }, 0);

  return {
    id: invitation.id,
    eventId: invitation.event_id || event.id,
    customerId: invitation.customer_id || event.user_id,
    userId: invitation.customer_id || event.user_id,
    publicToken: invitation.public_token || invitation.qr_code_secret,
    publicUrl: `/invitation/${invitation.public_token || invitation.qr_code_secret}`,
    title: invitation.title || invitation.couple_title || event.title,
    hostNames: invitation.host_names || (invitation.bride_name && invitation.groom_name ? `${invitation.bride_name} & ${invitation.groom_name}` : null),
    message: invitation.message || invitation.story || null,
    eventDate: eventDate,
    eventTime: invitation.event_time || event.start_time || null,
    venueName: invitation.venue_name || event.venue_name || event.city || null,
    venueAddress: invitation.venue_address || event.venue_address || event.city || null,
    template: invitation.template || invitation.template_id || 'classic',
    coverImageUrl: invitation.cover_image_url || null,
    status: expiration.status,
    expiresAt: expiration.expiresAt,
    timezone: resolvedTz,
    rsvpsCount: totalRsvps,
    attendingCount: attendingCount,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at,
    event: event.id ? {
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      eventDate: event.event_date,
      city: event.city,
      guestCount: event.estimated_guests,
      status: event.status,
    } : null,
  };
};

/**
 * Transforms an internal invitation record into the strictly public-safe DTO.
 * Explicitly excludes private customer information, passwords, JWTs, internal IDs.
 */
export const formatPublicInvitationDTO = (invitation, event = {}) => {
  if (!invitation) return null;

  const eventDate = event.event_date || event.eventDate || invitation.event_date || null;

  return {
    publicToken: invitation.public_token || invitation.qr_code_secret,
    title: invitation.title || invitation.couple_title || event.title,
    hostNames: invitation.host_names || (invitation.bride_name && invitation.groom_name ? `${invitation.bride_name} & ${invitation.groom_name}` : null) || '',
    message: invitation.message || invitation.story || '',
    eventDate: eventDate || '',
    eventTime: invitation.event_time || event.start_time || '',
    venueName: invitation.venue_name || event.venue_name || event.city || '',
    venueAddress: invitation.venue_address || event.venue_address || event.city || '',
    template: invitation.template || invitation.template_id || 'classic',
    coverImageUrl: invitation.cover_image_url || null,
  };
};

/**
 * Validates RSVP payload submitted by public guests.
 */
export const validateRSVPPayload = (body = {}) => {
  const allowedKeys = ['guestName', 'attendance', 'guestCount'];
  const bodyKeys = Object.keys(body);

  // Check for disallowed/arbitrary keys
  const extraKeys = bodyKeys.filter(k => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    return {
      isValid: false,
      message: `Invalid fields in payload: ${extraKeys.join(', ')}. Only guestName, attendance, and guestCount are accepted.`,
    };
  }

  const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : '';
  if (!guestName) {
    return {
      isValid: false,
      message: 'guestName is required and cannot be empty.',
    };
  }
  if (guestName.length > 150) {
    return {
      isValid: false,
      message: 'guestName cannot exceed 150 characters.',
    };
  }

  const allowedAttendance = ['ATTENDING', 'NOT_ATTENDING', 'MAYBE'];
  const attendance = typeof body.attendance === 'string' ? body.attendance.trim().toUpperCase() : '';
  if (!allowedAttendance.includes(attendance)) {
    return {
      isValid: false,
      message: `attendance must be one of: ${allowedAttendance.join(', ')}.`,
    };
  }

  let guestCount = 1;
  if (body.guestCount !== undefined && body.guestCount !== null) {
    const parsedCount = parseInt(body.guestCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      if (attendance === 'NOT_ATTENDING' && parsedCount === 0) {
        guestCount = 0;
      } else {
        return {
          isValid: false,
          message: 'guestCount must be a positive integer (minimum 1).',
        };
      }
    } else if (parsedCount > 20) {
      return {
        isValid: false,
        message: 'guestCount exceeds maximum allowed limit of 20 guests per RSVP.',
      };
    } else {
      guestCount = parsedCount;
    }
  }

  return {
    isValid: true,
    data: {
      guestName,
      attendance,
      guestCount,
    },
  };
};
